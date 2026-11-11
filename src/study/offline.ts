import type { SupabaseClient } from '@supabase/supabase-js'
import type { StudyAvailability, StudyPreferences, StudyReview, StudySession, StudySubject, StudyTopic } from './types'

export type OfflineReviewAction = {
  user_id: string
  topic_id: string
  session_id: string
  review: Omit<StudyReview, 'id'>
  session_updates: Pick<StudySession, 'status' | 'ended_at' | 'actual_minutes'>
  topic_updates: Partial<StudyTopic>
}

export type StudyPlannerSnapshot = {
  subjects: StudySubject[]
  topics: StudyTopic[]
  sessions: StudySession[]
  reviews: StudyReview[]
  availability: StudyAvailability[]
  preferences: StudyPreferences
}

function actionKey(userId: string) {
  return `daymark.study.offline-actions:${userId}`
}

function snapshotKey(userId: string) {
  return `daymark.study.snapshot:${userId}`
}

export function readOfflineActions(userId: string): OfflineReviewAction[] {
  const raw = localStorage.getItem(actionKey(userId))
  return raw ? JSON.parse(raw) as OfflineReviewAction[] : []
}

export function enqueueOfflineAction(action: OfflineReviewAction) {
  const actions = readOfflineActions(action.user_id).filter((item) => item.session_id !== action.session_id)
  actions.push(action)
  localStorage.setItem(actionKey(action.user_id), JSON.stringify(actions))
}

export function removeOfflineAction(userId: string, sessionId: string) {
  const actions = readOfflineActions(userId).filter((item) => item.session_id !== sessionId)
  if (actions.length) localStorage.setItem(actionKey(userId), JSON.stringify(actions))
  else localStorage.removeItem(actionKey(userId))
}

export function readPlannerSnapshot(userId: string): StudyPlannerSnapshot | null {
  const raw = localStorage.getItem(snapshotKey(userId))
  return raw ? JSON.parse(raw) as StudyPlannerSnapshot : null
}

export function savePlannerSnapshot(userId: string, snapshot: StudyPlannerSnapshot) {
  localStorage.setItem(snapshotKey(userId), JSON.stringify(snapshot))
}

export async function syncOfflineActions(client: SupabaseClient, userId: string) {
  const actions = readOfflineActions(userId)
  for (const action of actions) {
    const { error: reviewError } = await client.from('study_reviews')
      .upsert(action.review, { onConflict: 'session_id' })
    if (reviewError) return `Could not sync an offline review: ${reviewError.message}`
    const { error: sessionError } = await client.from('study_sessions')
      .update(action.session_updates).eq('id', action.session_id).eq('user_id', userId)
    if (sessionError) return `Review synced, but its session could not be completed: ${sessionError.message}`
    const { error: topicError } = await client.from('study_topics')
      .update(action.topic_updates).eq('id', action.topic_id).eq('user_id', userId)
    if (topicError) return `Review synced, but its topic schedule could not be updated: ${topicError.message}`
    removeOfflineAction(userId, action.session_id)
  }
  return null
}
