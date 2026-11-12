import type { Card } from 'ts-fsrs'

export type RecallRating = 'again' | 'hard' | 'good' | 'easy'

export type StudySubject = {
  id: string
  user_id: string
  name: string
  color: string
  weekly_target_minutes: number
  default_duration_minutes: number
  exam_date: string | null
  semester_end_date: string | null
  archived_at: string | null
  created_at: string
}

export type StudyTopic = {
  id: string
  user_id: string
  subject_id: string
  legacy_reminder_id: string | null
  title: string
  repeat_weekdays: number[]
  spaced_repetition: boolean
  anytime_today: boolean
  start_date: string
  start_time: string | null
  duration_minutes: number
  goal: string
  first_step: string
  materials_url: string
  next_due_date: string | null
  last_reviewed_at: string | null
  review_count: number
  lapse_count: number
  interval_days: number
  stability: number | null
  difficulty: number | null
  recall_probability: number | null
  fsrs_state: Card | null
  skip_until: string | null
  graduated_at: string | null
  archived_at: string | null
}

export type StudySession = {
  id: string
  user_id: string
  topic_id: string
  scheduled_date: string
  scheduled_time: string | null
  duration_minutes: number
  reason: 'study' | 'review' | 'both'
  status: 'planned' | 'started' | 'completed' | 'skipped' | 'snoozed'
  started_at: string | null
  ended_at: string | null
  actual_minutes: number | null
  snoozed_until: string | null
  created_at: string
}

export type StudyReview = {
  id: string
  user_id: string
  topic_id: string
  session_id: string | null
  reviewed_at: string
  rating: RecallRating
  duration_minutes: number
  note: string
  predicted_recall: number | null
  stability: number | null
  difficulty: number | null
}

export type StudyAvailability = {
  id: string
  user_id: string
  week_start: string
  label: string
  weekday: number
  start_time: string
  end_time: string
  active: boolean
}

export type StudyPreferences = {
  user_id: string
  time_zone: string
  daily_cap_minutes: number
  lead_minutes: number
  quiet_start: string | null
  quiet_end: string | null
  digest_time: string | null
  max_notifications_per_day: number
  email: string | null
  catch_up_threshold: number
}

export type QueueBucket = 'overdue' | 'due' | 'later'
export type QueuedStudySession = {
  session: StudySession
  topic: StudyTopic
  subject: StudySubject
  bucket: QueueBucket
  scheduledAt: Date
}
