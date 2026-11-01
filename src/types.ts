export type Priority = 'low' | 'medium' | 'high'

export type Task = {
  id: string
  user_id: string
  title: string
  description: string
  due_at: string | null
  priority: Priority
  category: string
  completed_at: string | null
  created_at: string
}

export type TaskDraft = {
  title: string
  description: string
  due_at: string
  priority: Priority
  category: string
}

export type StudyReminder = {
  id: string
  user_id: string
  subject: string
  topic: string
  schedule_type: 'once' | 'weekly' | 'spaced'
  remind_at: string | null
  remind_time: string | null
  days_of_week: number[]
  review_count: number
  enabled: boolean
  created_at: string
}

export type StudyReminderDraft = {
  subject: string
  topic: string
  schedule_type: 'once' | 'weekly' | 'spaced'
  date: string
  time: string
  days_of_week: number[]
}
