import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const resendKey = Deno.env.get('RESEND_API_KEY')
  const sender = Deno.env.get('STUDY_EMAIL_FROM')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !resendKey || !sender || !authorization) {
    return new Response('Email notifications are not configured.', { status: 503, headers: corsHeaders })
  }

  let payload: { eventKey?: string; title?: string; body?: string }
  try {
    payload = await request.json()
  } catch {
    return new Response('Invalid notification request.', { status: 400, headers: corsHeaders })
  }
  const eventKey = payload.eventKey?.trim()
  const title = payload.title?.trim()
  const body = payload.body?.trim()
  if (!eventKey || eventKey.length > 200 || !title || title.length > 120 || !body || body.length > 1000) {
    return new Response('Invalid notification request.', { status: 400, headers: corsHeaders })
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  })
  const { data: userResult, error: authError } = await userClient.auth.getUser()
  if (authError || !userResult.user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const userId = userResult.user.id
  const { data: preferences, error: preferencesError } = await userClient.from('study_preferences')
    .select('email,max_notifications_per_day').eq('user_id', userId).maybeSingle()
  if (preferencesError) return new Response('Could not load notification preferences.', { status: 503, headers: corsHeaders })
  if (!preferences?.email) return new Response('No fallback email is configured.', { status: 409, headers: corsHeaders })

  const { count, error: countError } = await admin.from('study_notification_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'sent')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  if (countError) {
    console.error('Could not check the notification cap:', countError.message)
    return new Response('Could not check notification limits.', { status: 503, headers: corsHeaders })
  }
  if ((count ?? 0) >= preferences.max_notifications_per_day) {
    return new Response('Daily notification cap reached.', { status: 429, headers: corsHeaders })
  }

  const { data: reservation, error: reservationError } = await admin.from('study_notification_events')
    .insert({
      user_id: userId,
      event_key: eventKey,
      channel: 'email',
      status: 'failed',
      error_message: 'Delivery pending',
    })
    .select('id')
    .single()
  if (reservationError?.code === '23505') {
    return new Response(JSON.stringify({ sent: false, duplicate: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  if (reservationError || !reservation) {
    console.error('Could not reserve email notification event:', reservationError?.message)
    return new Response('Could not record notification delivery.', { status: 503, headers: corsHeaders })
  }

  let status: 'sent' | 'failed' = 'failed'
  let errorMessage = ''
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: sender,
        to: [preferences.email],
        subject: title,
        text: body,
      }),
    })
    if (!response.ok) {
      errorMessage = `Email provider returned HTTP ${response.status}.`
    } else {
      status = 'sent'
    }
  } catch (deliveryError) {
    errorMessage = deliveryError instanceof Error ? deliveryError.message : String(deliveryError)
  }

  const { error: logError } = await admin.from('study_notification_events')
    .update({ status, error_message: errorMessage.slice(0, 500) })
    .eq('id', reservation.id)
  if (logError) {
    console.error('Could not update email notification event:', logError.message)
    return new Response('Could not record notification delivery.', { status: 503, headers: corsHeaders })
  }
  if (status === 'failed') {
    console.error('Study email delivery failed:', errorMessage)
    return new Response('Email delivery failed.', { status: 502, headers: corsHeaders })
  }

  return new Response(JSON.stringify({ sent: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
