import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type FeedSession = {
  id: string
  scheduled_date: string
  scheduled_time: string | null
  duration_minutes: number
  reason: 'study' | 'review' | 'both'
  topic: { title: string; anytime_today: boolean; subject: { name: string } }
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function foldLine(line: string) {
  const encoder = new TextEncoder()
  const output: string[] = []
  let chunk = ''
  let bytes = 0
  for (const character of line) {
    const characterBytes = encoder.encode(character).length
    if (bytes + characterBytes > 73) {
      output.push(chunk)
      chunk = ` ${character}`
      bytes = 1 + characterBytes
    } else {
      chunk += character
      bytes += characterBytes
    }
  }
  output.push(chunk)
  return output.join('\r\n')
}

function eventLines(options: {
  uid: string
  title: string
  description: string
  date: string
  time: string | null
  duration: number
  timeZone: string
  stamp: string
}) {
  const date = options.date.replaceAll('-', '')
  const [year = 0, month = 1, day = 1] = options.date.split('-').map(Number)
  const lines = [
    'BEGIN:VEVENT',
    `UID:${options.uid}@daymark`,
    `DTSTAMP:${options.stamp}`,
    `SUMMARY:${escapeIcs(options.title)}`,
    `DESCRIPTION:${escapeIcs(options.description)}`,
  ]
  if (!options.time) {
    const endDate = new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10).replaceAll('-', '')
    lines.push(`DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${endDate}`)
  } else {
    const time = options.time.replaceAll(':', '').slice(0, 6).padEnd(6, '0')
    const end = new Date(Date.UTC(year, month - 1, day, Number(time.slice(0, 2)), Number(time.slice(2, 4)) + options.duration))
    const endDate = end.toISOString().slice(0, 10).replaceAll('-', '')
    const endTime = `${String(end.getUTCHours()).padStart(2, '0')}${String(end.getUTCMinutes()).padStart(2, '0')}${String(end.getUTCSeconds()).padStart(2, '0')}`
    lines.push(
      `DTSTART;TZID=${options.timeZone}:${date}T${time}`,
      `DTEND;TZID=${options.timeZone}:${endDate}T${endTime}`,
    )
  }
  lines.push('END:VEVENT')
  return lines
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: corsHeaders })

  const token = new URL(request.url).pathname.split('/').filter(Boolean).at(-1)
  if (!token || token === 'study-feed') return new Response('Not found', { status: 404, headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Study feed is not configured.')
    return new Response('Calendar feed unavailable', { status: 503, headers: corsHeaders })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: feed, error: tokenError } = await admin.from('study_feed_tokens')
    .select('user_id').eq('token', token).maybeSingle()
  if (tokenError) {
    console.error('Study feed token lookup failed:', tokenError.message)
    return new Response('Calendar feed unavailable', { status: 503, headers: corsHeaders })
  }
  if (!feed) return new Response('Not found', { status: 404, headers: corsHeaders })

  const [preferencesResult, sessionsResult] = await Promise.all([
    admin.from('study_preferences').select('time_zone').eq('user_id', feed.user_id).maybeSingle(),
    admin.from('study_sessions')
      .select('id,scheduled_date,scheduled_time,duration_minutes,reason,topic:study_topics!inner(title,anytime_today,subject:study_subjects!inner(name))')
      .eq('user_id', feed.user_id)
      .in('status', ['planned', 'started', 'snoozed'])
      .gte('scheduled_date', new Date(Date.now() - 86_400_000).toISOString().slice(0, 10))
      .lte('scheduled_date', new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10))
      .order('scheduled_date')
      .order('scheduled_time'),
  ])
  if (preferencesResult.error || sessionsResult.error) {
    console.error('Study feed data lookup failed:', preferencesResult.error?.message ?? sessionsResult.error?.message)
    return new Response('Calendar feed unavailable', { status: 503, headers: corsHeaders })
  }

  const timeZone = preferencesResult.data?.time_zone || 'UTC'
  const sessions = (sessionsResult.data ?? []) as unknown as FeedSession[]
  const stamp = new Date().toISOString().replaceAll('-', '').replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'PRODID:-//Daymark//Study Planner//EN']
  const reviewsByDate = new Map<string, number>()

  for (const session of sessions) {
    if (session.reason === 'review' || session.reason === 'both') {
      reviewsByDate.set(session.scheduled_date, (reviewsByDate.get(session.scheduled_date) ?? 0) + 1)
      continue
    }
    lines.push(...eventLines({
      uid: session.id,
      title: session.topic.title,
      description: `${session.topic.subject.name} · ${session.duration_minutes} minutes`,
      date: session.scheduled_date,
      time: session.scheduled_time && !session.topic.anytime_today ? session.scheduled_time : null,
      duration: session.duration_minutes,
      timeZone,
      stamp,
    }))
  }

  for (const [date, count] of reviewsByDate) {
    lines.push(...eventLines({
      uid: `reviews-${feed.user_id}-${date}`,
      title: `${count} ${count === 1 ? 'review' : 'reviews'}`,
      description: 'Study reviews scheduled for this day.',
      date,
      time: null,
      duration: 0,
      timeZone,
      stamp,
    }))
  }
  lines.push('END:VCALENDAR')

  const body = `${lines.map(foldLine).join('\r\n')}\r\n`
  return new Response(body, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="daymark-study.ics"',
      'Cache-Control': 'private, no-store',
    },
  })
})
