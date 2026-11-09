export type Priority = 'low' | 'medium' | 'high'

export type TaskSubtask = {
  id: string
  user_id: string
  task_id: string
  title: string
  due_at: string | null
  completed_at: string | null
  created_at: string
}

export type TaskSubtaskDraft = {
  id: string
  title: string
  due_at: string
  completed_at: string | null
}

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
  subtasks: TaskSubtask[]
}

export type TaskDraft = {
  title: string
  description: string
  due_at: string
  priority: Priority
  category: string
  subtasks: TaskSubtaskDraft[]
}

export type StudyReminder = {
  id: string
  user_id: string
  subject: string
  topic: string
  schedule_type: 'once' | 'weekly' | 'spaced'
  remind_at: string | null
  remind_time: string | null
  remind_end_time: string | null
  days_of_week: number[]
  completed_on: string | null
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
  end_time: string
  days_of_week: number[]
}

export type DisciplineHabit = {
  id: string
  user_id: string
  title: string
  minimum_action: string
  days_of_week: number[]
  cue_time: string | null
  active: boolean
  created_at: string
}

export type DisciplineLog = {
  id: string
  user_id: string
  habit_id: string
  completed_on: string
}

export type DisciplineHabitDraft = {
  title: string
  minimum_action: string
  days_of_week: number[]
  cue_time: string
}
