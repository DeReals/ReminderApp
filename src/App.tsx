import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  Clock3,
  Flame,
  LayoutList,
  LogOut,
  Plus,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Search,
  SlidersHorizontal,
  Sparkles,
  Timer,
  X,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import type { DisciplineHabit, DisciplineHabitDraft, DisciplineLog, Priority, StudyReminder, StudyReminderDraft, Task, TaskDraft, TaskSubtask, TaskSubtaskDraft } from './types'

const emptyDraft: TaskDraft = {
  title: '',
  description: '',
  due_at: '',
  priority: 'medium',
  category: '',
  subtasks: [],
}

const fullDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })
const spacedIntervalsDays = [1, 3, 7, 21, 42, 90, 180, 365]

function getNextSpacedIntervalDays(reviewCount: number) {
  return spacedIntervalsDays[Math.min(reviewCount, spacedIntervalsDays.length - 1)]
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error('Could not restore your session:', error.message)
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (!supabase) return <SetupScreen />
  if (!authReady) return <div className="loading-screen"><span className="loader" /> Loading Daymark…</div>
  if (!session) return <AuthScreen client={supabase} />
  return <Dashboard client={supabase} session={session} />
}

function SetupScreen() {
  return (
    <main className="setup-screen">
      <a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a>
      <div className="setup-card">
        <span className="eyebrow"><Sparkles size={14} /> YOUR SPACE, READY WHEN YOU ARE</span>
        <h1>A little more clarity.<br /><span>A lot more breathing room.</span></h1>
        <p>Connect your Supabase project to start organizing your days. Your tasks stay private to your account.</p>
        <div className="setup-steps">
          <div><span>1</span><p>Create a Supabase project and copy <code>.env.example</code> to <code>.env</code>, or use the supported <code>NEXT_PUBLIC_SUPABASE_*</code> names.</p></div>
          <div><span>2</span><p>Add your project URL and anon/publishable key to <code>.env</code>.</p></div>
          <div><span>3</span><p>Run the Supabase SQL migrations listed in <code>README.md</code>, in order, in your SQL Editor.</p></div>
          <div><span>4</span><p>Restart the dev server and create your account.</p></div>
        </div>
        <p className="setup-note">Your Supabase anon key is safe to use in a browser when Row Level Security is enabled. Never add a service role key here.</p>
      </div>
      <span className="setup-footer">A calmer way to keep track of what matters.</span>
    </main>
  )
}

function AuthScreen({ client }: { client: SupabaseClient }) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    const result = isSignUp
      ? await client.auth.signUp({ email, password })
      : await client.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (result.error) {
      setError(result.error.message)
    } else if (isSignUp && !result.data.session) {
      setNotice('Check your email to confirm your account, then come back to sign in.')
    }
  }

  return (
    <main className="auth-screen">
      <a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a>
      <div className="auth-layout">
        <div className="auth-copy">
          <span className="eyebrow"><Sparkles size={14} /> YOUR DAY, ON YOUR TERMS</span>
          <h1>Make room for<br /><em>what matters.</em></h1>
          <p>One calm place for all the things you want to get to — and the time you want to get them done.</p>
          <div className="auth-proof"><div className="avatar-stack"><span>M</span><span>J</span><span>A</span></div><span>A little progress, every day.</span></div>
        </div>
        <form className="auth-card" onSubmit={submit}>
          <span className="eyebrow">{isSignUp ? 'GET STARTED' : 'WELCOME BACK'}</span>
          <h2>{isSignUp ? 'Create your account' : 'Sign in to Daymark'}</h2>
          <p>{isSignUp ? 'Your next chapter starts with one small step.' : 'Pick up right where you left off.'}</p>
          <label>Email address<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
          <label>Password<input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" minLength={6} required /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-success" role="status">{notice}</p>}
          <button className="button button-primary auth-submit" disabled={busy}>{busy ? 'One moment…' : isSignUp ? 'Create account' : 'Sign in'} <ArrowRight size={17} /></button>
          <p className="auth-switch">{isSignUp ? 'Already have an account?' : 'New to Daymark?'} <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}>{isSignUp ? 'Sign in' : 'Create an account'}</button></p>
        </form>
      </div>
      <span className="setup-footer">A calmer way to keep track of what matters.</span>
    </main>
  )
}

type View = 'list' | 'calendar'
type Filter = 'all' | 'today' | 'week' | 'month' | 'completed'
type DashboardMode = 'today' | 'tasks' | 'study' | 'discipline'
type DayTaskItem = { task: Task; subtask: TaskSubtask | null }

function Dashboard({ client, session }: { client: SupabaseClient; session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [studyReminders, setStudyReminders] = useState<StudyReminder[]>([])
  const [disciplineHabits, setDisciplineHabits] = useState<DisciplineHabit[]>([])
  const [disciplineLogs, setDisciplineLogs] = useState<DisciplineLog[]>([])
  const [loading, setLoading] = useState(true)
  const [studyLoading, setStudyLoading] = useState(true)
  const [disciplineLoading, setDisciplineLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DashboardMode>('today')
  const [filter, setFilter] = useState<Filter>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [view, setView] = useState<View>('list')
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [initialDate, setInitialDate] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [busyId, setBusyId] = useState('')
  const [reviewingId, setReviewingId] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
  const [focusStudyReminderId, setFocusStudyReminderId] = useState<string | null>(null)
  const [focusDuration, setFocusDuration] = useState(25 * 60)
  const [focusRemaining, setFocusRemaining] = useState(25 * 60)
  const [focusEndsAt, setFocusEndsAt] = useState<number | null>(null)
  const [focusPhase, setFocusPhase] = useState<'focus' | 'break'>('focus')
  const [breakAvailable, setBreakAvailable] = useState(false)
  const [studyDialogOpen, setStudyDialogOpen] = useState(false)
  const [editingStudyReminder, setEditingStudyReminder] = useState<StudyReminder | null>(null)
  const [disciplineDialogOpen, setDisciplineDialogOpen] = useState(false)
  const [disciplineBusyId, setDisciplineBusyId] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const notifiedReminderKeys = useRef(new Set<string>())
  const today = new Date()
  const todayKey = localDateKey(today)
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  const weekStartKey = localDateKey(weekStart)
  const weekEndKey = localDateKey(weekEnd)
  const monthStartKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), 1))
  const monthEndKey = localDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0))

  async function loadTasks() {
    setLoading(true)
    const [tasksResult, subtasksResult] = await Promise.all([
      client.from('tasks').select('id,user_id,title,description,due_at,priority,category,completed_at,created_at').order('due_at', { ascending: true, nullsFirst: false }),
      client.from('task_subtasks').select('id,user_id,task_id,title,due_at,completed_at,created_at').order('created_at', { ascending: true }),
    ])
    if (tasksResult.error) setError(`Could not load tasks: ${tasksResult.error.message}`)
    else if (subtasksResult.error) setError(`Could not load subtasks: ${subtasksResult.error.message}`)
    else {
      const subtasksByTask = new Map<string, TaskSubtask[]>()
      for (const subtask of subtasksResult.data) {
        const items = subtasksByTask.get(subtask.task_id) ?? []
        items.push(subtask as TaskSubtask)
        subtasksByTask.set(subtask.task_id, items)
      }
      setTasks((tasksResult.data as Omit<Task, 'subtasks'>[]).map((task) => ({
        ...task,
        subtasks: subtasksByTask.get(task.id) ?? [],
      })))
      setError('')
    }
    setLoading(false)
  }

  async function loadStudyReminders() {
    setStudyLoading(true)
    const fetchReminders = () => client.from('study_reminders')
      .select('id,user_id,subject,topic,schedule_type,remind_at,remind_time,days_of_week,completed_on,review_count,enabled,created_at')
      .order('created_at', { ascending: false })
    let result = await fetchReminders()
    if (result.error && (result.error.code === 'PGRST301' || result.error.message.toLowerCase().includes('jwt expired'))) {
      const { data: refreshData, error: refreshError } = await client.auth.refreshSession()
      if (refreshError || !refreshData.session) {
        setError(refreshError
          ? `Your session expired and could not be refreshed: ${refreshError.message}. Please sign out and sign in again.`
          : 'Your session expired. Please sign out and sign in again.')
        setStudyLoading(false)
        return
      }
      result = await fetchReminders()
    }
    if (result.error) setError(`Could not load study reminders: ${result.error.message}`)
    else {
      setStudyReminders(result.data as StudyReminder[])
      setError('')
    }
    setStudyLoading(false)
  }

  async function loadDisciplineData() {
    setDisciplineLoading(true)
    const earliest = new Date()
    earliest.setDate(earliest.getDate() - 365)
    const [habitsResult, logsResult] = await Promise.all([
      client.from('discipline_habits')
        .select('id,user_id,title,minimum_action,days_of_week,cue_time,active,created_at')
        .order('created_at', { ascending: true }),
      client.from('discipline_logs')
        .select('id,user_id,habit_id,completed_on')
        .gte('completed_on', localDateKey(earliest)),
    ])
    if (habitsResult.error) setError(`Could not load discipline commitments: ${habitsResult.error.message}`)
    else setDisciplineHabits(habitsResult.data as DisciplineHabit[])
    if (logsResult.error) setError(`Could not load discipline check-ins: ${logsResult.error.message}`)
    else setDisciplineLogs(logsResult.data as DisciplineLog[])
    setDisciplineLoading(false)
  }

  useEffect(() => {
    void loadTasks()
    void loadStudyReminders()
    void loadDisciplineData()
  }, [client])

  const activeStudyReminders = studyReminders.filter((reminder) => reminder.enabled)
  const subjects = [...new Set(studyReminders.map((reminder) => reminder.subject))].sort((a, b) => a.localeCompare(b))

  async function enableStudyNotifications() {
    if (!('Notification' in window)) {
      setError('This browser does not support notifications. Your study schedule will still be saved in Daymark.')
      return
    }
    const permission = Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission()
    if (permission !== 'granted') {
      setError('Notifications were not enabled. Allow notifications for Daymark in your browser settings to receive study reminders.')
      return
    }
    setError('')
    setNotificationsEnabled(true)
  }

  useEffect(() => {
    const hasScheduledNudges = studyReminders.some((reminder) => reminder.enabled)
      || disciplineHabits.some((habit) => habit.active && habit.cue_time)
    if (!notificationsEnabled || !hasScheduledNudges || !('Notification' in window)) return

    const checkReminder = () => {
      if (Notification.permission !== 'granted') {
        setNotificationsEnabled(false)
        return
      }
      const now = new Date()
      const today = localDateKey(now)
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      for (const reminder of studyReminders.filter((item) => item.enabled)) {
        const isOneTime = reminder.schedule_type === 'once'
        const isSpaced = reminder.schedule_type === 'spaced'
        const scheduledDate = reminder.remind_at ? new Date(reminder.remind_at) : null
        const scheduledTime = reminder.remind_time?.slice(0, 5) ?? '23:59'
        const isDue = isSpaced
          ? Boolean(scheduledDate && scheduledDate.getTime() <= now.getTime())
          : isOneTime
            ? Boolean(scheduledDate && scheduledDate.getTime() <= now.getTime())
            : reminder.days_of_week.includes(now.getDay()) && scheduledTime <= currentTime
        const notificationKey = `${reminder.id}:${isSpaced ? reminder.remind_at : today}`
        if (!isDue || notifiedReminderKeys.current.has(notificationKey)) continue
        const storageKey = `daymark-study-reminder:${session.user.id}:${notificationKey}`
        try {
          if (window.localStorage.getItem(storageKey)) {
            notifiedReminderKeys.current.add(notificationKey)
            continue
          }
        } catch (storageError) {
          console.error('Could not read study reminder notification state:', storageError)
        }
        notifiedReminderKeys.current.add(notificationKey)
        try {
          window.localStorage.setItem(storageKey, 'true')
        } catch (storageError) {
          console.error('Could not save study reminder notification state:', storageError)
        }
        const notification = new Notification(`Time to study${reminder.subject ? ` ${reminder.subject}` : ''}`, {
          body: reminder.topic || 'A little review today can help your learning stick.',
          tag: `daymark-study-${notificationKey}`,
        })
        notification.onclick = () => {
          window.focus()
          setMode('study')
          notification.close()
        }
        if (isOneTime) {
          void client.from('study_reminders').update({ enabled: false }).eq('id', reminder.id).then(({ error: updateError }) => {
            if (updateError) setError(`Reminder sent, but could not update its status: ${updateError.message}`)
            else setStudyReminders((current) => current.map((item) => item.id === reminder.id ? { ...item, enabled: false } : item))
          })
        }
      }

      for (const habit of disciplineHabits.filter((item) => item.active && item.cue_time && item.days_of_week.includes(now.getDay()))) {
        const cueTime = habit.cue_time?.slice(0, 5) ?? '23:59'
        const notificationKey = `discipline:${habit.id}:${today}`
        if (cueTime > currentTime || disciplineLogs.some((log) => log.habit_id === habit.id && log.completed_on === today) || notifiedReminderKeys.current.has(notificationKey)) continue
        const storageKey = `daymark-discipline-cue:${session.user.id}:${notificationKey}`
        try {
          if (window.localStorage.getItem(storageKey)) {
            notifiedReminderKeys.current.add(notificationKey)
            continue
          }
        } catch (storageError) {
          console.error('Could not read discipline notification state:', storageError)
        }
        notifiedReminderKeys.current.add(notificationKey)
        try {
          window.localStorage.setItem(storageKey, 'true')
        } catch (storageError) {
          console.error('Could not save discipline notification state:', storageError)
        }
        const notification = new Notification(`Time for your commitment: ${habit.title}`, {
          body: `Keep it small: ${habit.minimum_action}`,
          tag: `daymark-${notificationKey}`,
        })
        notification.onclick = () => {
          window.focus()
          setMode('discipline')
          notification.close()
        }
      }
    }

    checkReminder()
    const intervalId = window.setInterval(checkReminder, 15_000)
    return () => window.clearInterval(intervalId)
  }, [notificationsEnabled, studyReminders, disciplineHabits, disciplineLogs, session.user.id, client])

  async function saveStudyReminder(draft: StudyReminderDraft) {
    const schedule = draft.schedule_type !== 'weekly'
      ? {
          remind_at: new Date(`${draft.date}T${draft.time}`).toISOString(),
          remind_time: null,
          days_of_week: [],
        }
      : {
          remind_at: null,
          remind_time: draft.time,
          days_of_week: draft.days_of_week,
        }

    if (editingStudyReminder) {
      const updates = {
        subject: draft.subject.trim(),
        topic: draft.topic.trim(),
        schedule_type: draft.schedule_type,
        ...schedule,
      }
      const { error: updateError } = await client.from('study_reminders').update(updates).eq('id', editingStudyReminder.id)
      if (updateError) {
        setError(`Could not update study reminder: ${updateError.message}`)
        return false
      }
      setError('')
      setStudyReminders((current) => current.map((item) => item.id === editingStudyReminder.id ? { ...item, ...updates } : item))
      setEditingStudyReminder(null)
      setStudyDialogOpen(false)
      return true
    }

    const { data: savedReminder, error: saveError } = await client.from('study_reminders').insert({
      user_id: session.user.id,
      subject: draft.subject.trim(),
      topic: draft.topic.trim(),
      schedule_type: draft.schedule_type,
      ...schedule,
    }).select('id,user_id,subject,topic,schedule_type,remind_at,remind_time,days_of_week,completed_on,review_count,enabled,created_at').single()
    if (saveError) {
      setError(`Could not save study reminder: ${saveError.message}`)
      return false
    }
    setError('')
    setStudyReminders((current) => [savedReminder as StudyReminder, ...current])
    setStudyDialogOpen(false)
    return true
  }

  async function toggleStudyReminder(reminder: StudyReminder) {
    const { error: updateError } = await client.from('study_reminders').update({ enabled: !reminder.enabled }).eq('id', reminder.id)
    if (updateError) setError(`Could not update study reminder: ${updateError.message}`)
    else {
      setError('')
      setStudyReminders((current) => current.map((item) => item.id === reminder.id ? { ...item, enabled: !reminder.enabled } : item))
    }
  }

  async function toggleStudyReminderCompletion(reminder: StudyReminder) {
    const occurrenceDate = getStudyOccurrenceDate(reminder, new Date())
    const isComplete = reminder.completed_on === occurrenceDate
    const updates: Partial<StudyReminder> = { completed_on: isComplete ? null : occurrenceDate }
    if (!isComplete && reminder.schedule_type === 'spaced') {
      const nextReviewDate = new Date()
      nextReviewDate.setDate(nextReviewDate.getDate() + getNextSpacedIntervalDays(reminder.review_count))
      updates.remind_at = nextReviewDate.toISOString()
      updates.review_count = reminder.review_count + 1
    }
    setReviewingId(reminder.id)
    const { error: updateError } = await client.from('study_reminders').update(updates).eq('id', reminder.id)
    setReviewingId('')
    if (updateError) setError(`Could not update study completion: ${updateError.message}`)
    else {
      setError('')
      setStudyReminders((current) => current.map((item) => item.id === reminder.id
        ? { ...item, ...updates }
        : item))
      setCompletionMessage(isComplete ? 'Study session back on your list.' : 'Study session complete. Nice work!')
    }
  }

  async function deleteStudyReminder(reminder: StudyReminder) {
    if (!window.confirm(`Delete your ${reminder.subject} study reminder? This can't be undone.`)) return
    const { error: deleteError } = await client.from('study_reminders').delete().eq('id', reminder.id)
    if (deleteError) setError(`Could not delete study reminder: ${deleteError.message}`)
    else {
      setError('')
      setStudyReminders((current) => current.filter((item) => item.id !== reminder.id))
    }
  }

  async function saveDisciplineHabit(draft: DisciplineHabitDraft) {
    const { data: savedHabit, error: saveError } = await client.from('discipline_habits').insert({
      user_id: session.user.id,
      title: draft.title.trim(),
      minimum_action: draft.minimum_action.trim(),
      days_of_week: draft.days_of_week,
      cue_time: draft.cue_time || null,
    }).select('id,user_id,title,minimum_action,days_of_week,cue_time,active,created_at').single()
    if (saveError) {
      setError(`Could not save discipline commitment: ${saveError.message}`)
      return false
    }
    setError('')
    setDisciplineHabits((current) => [...current, savedHabit as DisciplineHabit])
    setDisciplineDialogOpen(false)
    return true
  }

  async function toggleDisciplineLog(habit: DisciplineHabit) {
    const todayLog = disciplineLogs.find((log) => log.habit_id === habit.id && log.completed_on === todayKey)
    setDisciplineBusyId(habit.id)
    const result = todayLog
      ? await client.from('discipline_logs').delete().eq('id', todayLog.id)
      : await client.from('discipline_logs').insert({ user_id: session.user.id, habit_id: habit.id, completed_on: todayKey }).select().single()
    setDisciplineBusyId('')
    if (result.error) {
      setError(`Could not update your daily check-in: ${result.error.message}`)
      return
    }
    setError('')
    setDisciplineLogs((current) => todayLog
      ? current.filter((log) => log.id !== todayLog.id)
      : [...current, result.data as DisciplineLog])
  }

  async function toggleDisciplineHabit(habit: DisciplineHabit) {
    const { error: updateError } = await client.from('discipline_habits').update({ active: !habit.active }).eq('id', habit.id)
    if (updateError) setError(`Could not update commitment: ${updateError.message}`)
    else {
      setError('')
      setDisciplineHabits((current) => current.map((item) => item.id === habit.id ? { ...item, active: !item.active } : item))
    }
  }

  async function deleteDisciplineHabit(habit: DisciplineHabit) {
    if (!window.confirm(`Delete "${habit.title}" and its check-in history? This can't be undone.`)) return
    setDisciplineBusyId(habit.id)
    const { error: deleteError } = await client.from('discipline_habits').delete().eq('id', habit.id)
    setDisciplineBusyId('')
    if (deleteError) {
      setError(`Could not delete commitment: ${deleteError.message}`)
      return
    }
    setError('')
    setDisciplineHabits((current) => current.filter((item) => item.id !== habit.id))
    setDisciplineLogs((current) => current.filter((log) => log.habit_id !== habit.id))
  }

  const filteredTasks = useMemo(() => tasks.flatMap((task) => {
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    if (!matchesPriority) return []
    const search = query.toLowerCase()
    const parentMatchesSearch = `${task.title} ${task.description} ${task.category}`.toLowerCase().includes(search)
    const matchesDate = (dueAt: string | null) => {
      const dueDate = dueAt ? localDateKey(new Date(dueAt)) : ''
      return filter === 'all' || filter === 'completed'
        || (filter === 'today' && dueDate === todayKey)
        || (filter === 'week' && dueDate >= weekStartKey && dueDate <= weekEndKey)
        || (filter === 'month' && dueDate >= monthStartKey && dueDate <= monthEndKey)
    }
    const matchesStatus = (completedAt: string | null) => filter === 'completed'
      ? Boolean(completedAt)
      : Boolean(!completedAt)
    const visibleSubtasks = task.subtasks.filter((subtask) =>
      matchesStatus(subtask.completed_at)
      && matchesDate(subtask.due_at ?? task.due_at)
      && (parentMatchesSearch || subtask.title.toLowerCase().includes(search)))
      .sort((a, b) => compareDueAt(a.due_at ?? task.due_at, b.due_at ?? task.due_at))
    const parentMatches = matchesStatus(task.completed_at) && matchesDate(task.due_at) && parentMatchesSearch
    return parentMatches || visibleSubtasks.length > 0 ? [{ ...task, subtasks: visibleSubtasks }] : []
  }).sort((a, b) => compareDueAt(a.due_at, b.due_at)), [tasks, filter, priorityFilter, query, todayKey, weekStartKey, weekEndKey, monthStartKey, monthEndKey])

  const pendingCount = tasks.filter((task) => !task.completed_at).length
  const openTasks = tasks.filter((task) => !task.completed_at)
  const tasksForRange = (start: string, end: string) => openTasks.filter((task) => {
    if (!task.due_at) return false
    const dueDate = localDateKey(new Date(task.due_at))
    return dueDate >= start && dueDate <= end
  })
  const todayTasks = tasks.filter((task) => task.due_at && localDateKey(new Date(task.due_at)) === todayKey)
  const todayCount = todayTasks.filter((task) => !task.completed_at).length
  const weekTasks = tasksForRange(weekStartKey, weekEndKey)
  const monthTasks = tasksForRange(monthStartKey, monthEndKey)
  const todayCompleted = todayTasks.length - todayCount
  const todayProgress = todayTasks.length ? Math.round((todayCompleted / todayTasks.length) * 100) : 0
  const completedCount = tasks.filter((task) => task.completed_at).length
  const focusTask = [...tasks]
    .filter((task) => !task.completed_at)
    .sort((a, b) => {
      const dueA = a.due_at ? localDateKey(new Date(a.due_at)) : '9999-12-31'
      const dueB = b.due_at ? localDateKey(new Date(b.due_at)) : '9999-12-31'
      if (dueA !== dueB) return dueA.localeCompare(dueB)
      const priorityRank: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
      return priorityRank[a.priority] - priorityRank[b.priority]
    })[0]
  const selectedFocusTask = focusStudyReminderId ? undefined : tasks.find((task) => task.id === focusTaskId) ?? focusTask
  const selectedFocusStudyReminder = studyReminders.find((reminder) => reminder.id === focusStudyReminderId)

  useEffect(() => {
    if (!focusEndsAt) return
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((focusEndsAt - Date.now()) / 1000))
      setFocusRemaining(remaining)
      if (remaining === 0) {
        setFocusEndsAt(null)
        setCompletionMessage(focusPhase === 'focus'
          ? 'Focus session complete. Take a short break before your next step.'
          : 'Break complete. You’re ready for another focused session.')
        setBreakAvailable(focusPhase === 'focus')
        if (focusPhase === 'break') {
          setFocusPhase('focus')
          setFocusRemaining(focusDuration)
        }
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(focusPhase === 'focus' ? 'Focus session complete' : 'Break complete', {
            body: focusPhase === 'focus' ? 'Nice work. Take a short break.' : 'Your break is over when you’re ready.',
            tag: 'daymark-focus-timer',
          })
        }
      }
    }
    updateRemaining()
    const intervalId = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(intervalId)
  }, [focusEndsAt, focusPhase, focusDuration])

  useEffect(() => {
    if (!completionMessage) return
    const timer = window.setTimeout(() => setCompletionMessage(''), 4000)
    return () => window.clearTimeout(timer)
  }, [completionMessage])

  async function saveTask(draft: TaskDraft) {
    setError('')
    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      due_at: draft.due_at ? new Date(draft.due_at).toISOString() : null,
      priority: draft.priority,
      category: draft.category.trim(),
    }
    const result = editing
      ? await client.from('tasks').update(payload).eq('id', editing.id).select().single()
      : await client.from('tasks').insert({ ...payload, user_id: session.user.id }).select().single()
    if (result.error) {
      setError(`Could not save task: ${result.error.message}`)
      return false
    }
    const savedTask = result.data
    const subtasks = draft.subtasks.map((subtask) => ({
      id: subtask.id,
      task_id: savedTask.id,
      user_id: session.user.id,
      title: subtask.title.trim(),
      due_at: subtask.due_at ? new Date(subtask.due_at).toISOString() : null,
      completed_at: subtask.completed_at,
    }))
    const subtasksResult = subtasks.length
      ? await client.from('task_subtasks').upsert(subtasks)
      : { error: null }
    if (subtasksResult.error) {
      await loadTasks()
      setError(`Task saved, but could not save its subtasks: ${subtasksResult.error.message}`)
      return false
    }
    const removedSubtaskIds = editing?.subtasks
      .filter((subtask) => !draft.subtasks.some((draftSubtask) => draftSubtask.id === subtask.id))
      .map((subtask) => subtask.id) ?? []
    const deleteSubtasksResult = removedSubtaskIds.length
      ? await client.from('task_subtasks').delete().eq('task_id', savedTask.id).in('id', removedSubtaskIds)
      : { error: null }
    if (deleteSubtasksResult.error) {
      await loadTasks()
      setError(`Task saved, but could not remove a subtask: ${deleteSubtasksResult.error.message}`)
      return false
    }
    const savedSubtasks: TaskSubtask[] = subtasks.map((subtask) => ({
      ...subtask,
      created_at: editing?.subtasks.find((existing) => existing.id === subtask.id)?.created_at ?? new Date().toISOString(),
    }))
    const nextTask: Task = { ...savedTask, subtasks: savedSubtasks }
    setTasks((current) => editing
      ? current.map((task) => task.id === savedTask.id ? nextTask : task)
      : [...current, nextTask])
    setDialogOpen(false)
    setEditing(null)
    setInitialDate('')
    return true
  }

  async function toggleTask(task: Task) {
    setBusyId(task.id)
    setError('')
    const completedAt = task.completed_at ? null : new Date().toISOString()
    const { error: updateError } = await client.from('tasks').update({ completed_at: completedAt }).eq('id', task.id)
    if (updateError) setError(`Could not update task: ${updateError.message}`)
    else {
      if (!task.completed_at) {
        const messages = ['That’s one more thing off your mind. Nice work!', 'You did it. Take a second to enjoy that.', 'A little progress adds up. Well done!', 'Look at you, following through.']
        setCompletionMessage(messages[Math.floor(Math.random() * messages.length)])
      } else {
        setCompletionMessage('Back on your list. Pick it up when you’re ready.')
      }
      setTasks((current) => current.map((item) => item.id === task.id ? { ...item, completed_at: completedAt } : item))
    }
    setBusyId('')
  }

  async function toggleSubtask(task: Task, subtask: TaskSubtask) {
    const busyKey = `subtask:${subtask.id}`
    setBusyId(busyKey)
    setError('')
    const completedAt = subtask.completed_at ? null : new Date().toISOString()
    const { error: updateError } = await client.from('task_subtasks')
      .update({ completed_at: completedAt })
      .eq('id', subtask.id)
      .eq('task_id', task.id)
    if (updateError) setError(`Could not update subtask: ${updateError.message}`)
    else {
      setCompletionMessage(subtask.completed_at
        ? 'Subtask back on your list. Pick it up when you’re ready.'
        : 'Subtask complete. One more step forward!')
      setTasks((current) => current.map((item) => item.id === task.id
        ? { ...item, subtasks: item.subtasks.map((entry) => entry.id === subtask.id ? { ...entry, completed_at: completedAt } : entry) }
        : item))
    }
    setBusyId('')
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return
    setBusyId(task.id)
    setError('')
    const { error: deleteError } = await client.from('tasks').delete().eq('id', task.id)
    if (deleteError) setError(`Could not delete task: ${deleteError.message}`)
    else setTasks((current) => current.filter((item) => item.id !== task.id))
    setBusyId('')
  }

  function openNewTask(date = '') {
    setEditing(null)
    setInitialDate(date)
    setDialogOpen(true)
  }

  function selectFocusTask(task: Task) {
    setFocusStudyReminderId(null)
    setFocusTaskId(task.id)
    setFocusPhase('focus')
    setBreakAvailable(false)
    setFocusEndsAt(null)
    setFocusRemaining(focusDuration)
  }

  function selectFocusStudyReminder(reminder: StudyReminder) {
    setFocusTaskId(null)
    setFocusStudyReminderId(reminder.id)
    setFocusPhase('focus')
    setBreakAvailable(false)
    setFocusEndsAt(null)
    setFocusRemaining(focusDuration)
    setMode('tasks')
    setFilter('all')
  }

  function setFocusMinutes(minutes: number) {
    const seconds = minutes * 60
    setFocusDuration(seconds)
    setFocusRemaining(seconds)
    setFocusPhase('focus')
    setBreakAvailable(false)
  }

  function toggleFocusTimer() {
    if (focusEndsAt) {
      setFocusRemaining(Math.max(0, Math.ceil((focusEndsAt - Date.now()) / 1000)))
      setFocusEndsAt(null)
    } else if (focusRemaining > 0) {
      if (selectedFocusTask) setFocusTaskId(selectedFocusTask.id)
      setFocusEndsAt(Date.now() + focusRemaining * 1000)
      setCompletionMessage('')
    }
  }

  function resetFocusTimer() {
    setFocusEndsAt(null)
    setFocusRemaining(focusDuration)
    setFocusPhase('focus')
    setBreakAvailable(false)
  }

  function startBreak() {
    setFocusPhase('break')
    setFocusRemaining(5 * 60)
    setBreakAvailable(false)
    setFocusEndsAt(Date.now() + 5 * 60 * 1000)
    setCompletionMessage('')
  }

  const filterTitle = filter === 'today' ? 'Today' : filter === 'week' ? 'This week' : filter === 'month' ? 'This month' : filter === 'completed' ? 'Completed' : 'All tasks'
  const periodTitle = filter === 'today' ? 'Today, at your pace.' : filter === 'week' ? 'Your week, made clearer.' : filter === 'month' ? 'One month at a time.' : filter === 'completed' ? 'Look what you did.' : 'Make room for what matters.'
  const periodDescription = filter === 'today'
    ? todayCount ? `You have ${todayCount} ${todayCount === 1 ? 'thing' : 'things'} on your plate today.` : 'No deadlines today. Take a breath.'
    : filter === 'week'
      ? weekTasks.length ? `${weekTasks.length} ${weekTasks.length === 1 ? 'task' : 'tasks'} due this week. You can take them one at a time.` : 'Nothing due this week. Enjoy the breathing room.'
      : filter === 'month'
        ? monthTasks.length ? `${monthTasks.length} ${monthTasks.length === 1 ? 'task' : 'tasks'} due this month. Plenty of time to make a plan.` : 'A clear month ahead. Add a task whenever you need.'
        : `${pendingCount ? `You've got ${pendingCount} ${pendingCount === 1 ? 'thing' : 'things'} on your list. One step at a time.` : 'A little space to start fresh.'}`
  const dayTaskItems = tasks.flatMap((task) => {
    const isDueTodayOrOverdue = (dueAt: string | null) => {
      const dueDate = dueAt ? localDateKey(new Date(dueAt)) : ''
      return Boolean(dueDate && dueDate <= todayKey)
    }
    const isVisibleToday = (dueAt: string | null, completedAt: string | null) =>
      (!completedAt && isDueTodayOrOverdue(dueAt))
      || Boolean(completedAt && localDateKey(new Date(completedAt)) === todayKey)
    return [
      ...(isVisibleToday(task.due_at, task.completed_at) ? [{ task, subtask: null }] : []),
      ...task.subtasks
        .filter((subtask) => isVisibleToday(subtask.due_at ?? task.due_at, subtask.completed_at))
        .map((subtask) => ({ task, subtask })),
    ]
  }).sort((a, b) => {
    const completedA = a.subtask ? a.subtask.completed_at : a.task.completed_at
    const completedB = b.subtask ? b.subtask.completed_at : b.task.completed_at
    if (Boolean(completedA) !== Boolean(completedB)) return completedA ? 1 : -1
    const dueA = a.subtask?.due_at ?? a.task.due_at
    const dueB = b.subtask?.due_at ?? b.task.due_at
    return compareDueAt(dueA, dueB)
  })
  const todayWeekday = today.getDay()
  const dayStudyReminders = studyReminders.filter((reminder) =>
    (reminder.schedule_type === 'weekly' && reminder.enabled && reminder.days_of_week.includes(todayWeekday))
    || (reminder.completed_on === todayKey)
    || (reminder.schedule_type !== 'weekly'
      && (reminder.enabled || reminder.schedule_type === 'once')
      && Boolean(reminder.remind_at && localDateKey(new Date(reminder.remind_at)) <= todayKey)),
  ).sort((a, b) => getReminderDateForDay(a, today) - getReminderDateForDay(b, today))
  const dayDisciplineHabits = disciplineHabits.filter((habit) => habit.active && habit.days_of_week.includes(todayWeekday))
  const dayDisciplineLogs = disciplineLogs.filter((log) => log.completed_on === todayKey)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav">
          <button className={mode === 'today' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('today')}><CalendarDays size={18} /><span>My day</span><span className="nav-count">{dayTaskItems.filter(({ task, subtask }) => !(subtask ? subtask.completed_at : task.completed_at)).length + dayDisciplineHabits.filter((habit) => !dayDisciplineLogs.some((log) => log.habit_id === habit.id)).length}</span></button>
          <button className={mode === 'tasks' && filter === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('all') }}><LayoutList size={18} /><span>All tasks</span><span className="nav-count">{pendingCount}</span></button>
          <button className={mode === 'tasks' && filter === 'today' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('today') }}><Clock3 size={18} /><span>Today</span><span className="nav-count">{todayCount}</span></button>
          <button className={mode === 'tasks' && filter === 'week' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('week') }}><CalendarDays size={18} /><span>This week</span><span className="nav-count">{weekTasks.length}</span></button>
          <button className={mode === 'tasks' && filter === 'month' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('month') }}><CalendarDays size={18} /><span>This month</span><span className="nav-count">{monthTasks.length}</span></button>
          <button className={mode === 'tasks' && filter === 'completed' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('completed') }}><CheckCheck size={18} /><span>Completed</span>{completedCount > 0 && <span className="nav-count">{completedCount}</span>}</button>
          <button className={mode === 'study' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('study')}><BookOpen size={18} /><span>Study reminders</span>{activeStudyReminders.length > 0 && <span className="nav-count">{activeStudyReminders.length}</span>}</button>
          <button className={mode === 'discipline' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('discipline')}><ShieldCheck size={18} /><span>Discipline coach</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote"><Sparkles size={15} /><p>Progress, not perfection. You're doing just fine.</p></div>
          <button className="account-button" onClick={() => void client.auth.signOut()}><span className="account-avatar">{session.user.email?.[0]?.toUpperCase() ?? 'Y'}</span><span className="account-email">{session.user.email}</span><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a><div className="mobile-actions"><button aria-label="My day" className={`icon-button ${mode === 'today' ? 'selected' : ''}`} onClick={() => setMode('today')}><CalendarDays size={17} /></button><button aria-label="Study reminders" className={`icon-button ${mode === 'study' ? 'selected' : ''}`} onClick={() => setMode(mode === 'study' ? 'today' : 'study')}><BookOpen size={17} /></button><button aria-label="Discipline coach" className={`icon-button ${mode === 'discipline' ? 'selected' : ''}`} onClick={() => setMode(mode === 'discipline' ? 'today' : 'discipline')}><ShieldCheck size={17} /></button><button aria-label="Sign out" className="icon-button" onClick={() => void client.auth.signOut()}><LogOut size={17} /></button></div></div>
          <div className="breadcrumb"><span>My space</span><span className="breadcrumb-slash">/</span><strong>{mode === 'study' ? 'Study reminders' : mode === 'discipline' ? 'Discipline coach' : mode === 'today' ? 'My day' : view === 'calendar' ? 'Calendar' : filterTitle}</strong></div>
          <div className="topbar-date">{fullDate.format(today)}</div>
        </header>

        <section className="page-content">
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {mode === 'today' ? <MyDayDashboard
            date={today}
            todayKey={todayKey}
            taskItems={dayTaskItems}
            studyReminders={dayStudyReminders}
            disciplineHabits={dayDisciplineHabits}
            disciplineLogs={dayDisciplineLogs}
            loading={loading || studyLoading || disciplineLoading}
            busyTaskId={busyId}
            busyDisciplineId={disciplineBusyId}
            reviewingId={reviewingId}
            onToggleTask={(task) => void toggleTask(task)}
            onToggleSubtask={(task, subtask) => void toggleSubtask(task, subtask)}
            onOpenTask={(task) => { setEditing(task); setDialogOpen(true) }}
            onFocusTask={(task) => { selectFocusTask(task); setMode('tasks'); setFilter('all') }}
            onAddTask={() => openNewTask()}
            onOpenTasks={() => { setMode('tasks'); setFilter('all') }}
            onAddStudy={() => { setMode('study'); setEditingStudyReminder(null); setStudyDialogOpen(true) }}
            onOpenStudy={() => setMode('study')}
            onFocusStudy={selectFocusStudyReminder}
            onComplete={(reminder) => void toggleStudyReminderCompletion(reminder)}
            onToggleDiscipline={(habit) => void toggleDisciplineLog(habit)}
            onAddDiscipline={() => { setMode('discipline'); setDisciplineDialogOpen(true) }}
            onOpenDiscipline={() => setMode('discipline')}
          /> : mode === 'study' ? <StudyDashboard
            reminders={studyReminders}
            subjects={subjects}
            loading={studyLoading}
            notificationsSupported={'Notification' in window}
            notificationPermission={('Notification' in window) ? Notification.permission : 'unsupported'}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={() => void enableStudyNotifications()}
            onAdd={() => { setEditingStudyReminder(null); setStudyDialogOpen(true) }}
            onEdit={(reminder) => { setEditingStudyReminder(reminder); setStudyDialogOpen(true) }}
            onToggle={(reminder) => void toggleStudyReminder(reminder)}
            onDelete={(reminder) => void deleteStudyReminder(reminder)}
            onFocus={selectFocusStudyReminder}
            onComplete={(reminder) => void toggleStudyReminderCompletion(reminder)}
            reviewingId={reviewingId}
          /> : mode === 'discipline' ? <DisciplineDashboard
            habits={disciplineHabits}
            logs={disciplineLogs}
            loading={disciplineLoading}
            todayKey={todayKey}
            notificationsSupported={'Notification' in window}
            notificationPermission={('Notification' in window) ? Notification.permission : 'unsupported'}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={() => void enableStudyNotifications()}
            onAdd={() => setDisciplineDialogOpen(true)}
            onToggleLog={(habit) => void toggleDisciplineLog(habit)}
            onToggleHabit={(habit) => void toggleDisciplineHabit(habit)}
            onDeleteHabit={(habit) => void deleteDisciplineHabit(habit)}
            busyId={disciplineBusyId}
          /> : <>
          <div className="welcome-row">
            <div><span className="eyebrow"><Sparkles size={14} /> A FRESH START, EVERY DAY</span><h1>{periodTitle}</h1><p>{periodDescription}</p></div>
            <button className="button button-primary add-task-button" onClick={() => openNewTask()}><Plus size={18} /> Add a task</button>
          </div>

          {filter !== 'completed' && <section className="period-cards" aria-label="Task overview">
            <PeriodCard label="Today" count={todayCount} detail={todayCount === 1 ? 'task to focus on' : 'tasks to focus on'} selected={filter === 'today'} icon={<Clock3 size={17} />} onClick={() => { setFilter('today'); setView('list') }} />
            <PeriodCard label="This week" count={weekTasks.length} detail={`${fullDate.format(weekStart)} – ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(weekEnd)}`} selected={filter === 'week'} icon={<CalendarDays size={17} />} onClick={() => { setFilter('week'); setView('list') }} />
            <PeriodCard label="This month" count={monthTasks.length} detail={new Intl.DateTimeFormat('en', { month: 'long' }).format(today)} selected={filter === 'month'} icon={<CalendarDays size={17} />} onClick={() => { setFilter('month'); setView('list') }} />
          </section>}

          {filter !== 'completed' && <FocusTimerPanel
            task={selectedFocusTask}
            studyReminder={selectedFocusStudyReminder}
            duration={focusDuration}
            remaining={focusRemaining}
            running={focusEndsAt !== null}
            phase={focusPhase}
            breakAvailable={breakAvailable}
            onSetMinutes={setFocusMinutes}
            onToggle={toggleFocusTimer}
            onReset={resetFocusTimer}
            onStartBreak={startBreak}
            onOpenTask={selectedFocusTask ? () => { setEditing(selectedFocusTask); setDialogOpen(true) } : undefined}
            onCompleteTask={selectedFocusTask ? () => void toggleTask(selectedFocusTask) : undefined}
            onOpenStudy={selectedFocusStudyReminder ? () => setMode('study') : undefined}
            onCompleteStudy={selectedFocusStudyReminder ? () => void toggleStudyReminderCompletion(selectedFocusStudyReminder) : undefined}
            studyBusy={selectedFocusStudyReminder ? reviewingId === selectedFocusStudyReminder.id : false}
            taskBusy={selectedFocusTask ? busyId === selectedFocusTask.id : false}
            onAddTask={() => openNewTask()}
            todayProgress={todayProgress}
            todayProgressLabel={todayTasks.length ? `${todayCompleted} of ${todayTasks.length} done` : 'Every small step counts'}
          />}

          {!loading && <DashboardCharts tasks={tasks} weekStart={weekStart} />}

          <div className="toolbar">
            <div className="view-switch"><button className={view === 'list' ? 'view-tab selected' : 'view-tab'} onClick={() => setView('list')}><LayoutList size={16} /> List</button><button className={view === 'calendar' ? 'view-tab selected' : 'view-tab'} onClick={() => setView('calendar')}><CalendarDays size={16} /> Calendar</button></div>
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" /></label>
            <label className="priority-select"><SlidersHorizontal size={15} /><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)} aria-label="Filter by priority"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><ChevronDown size={14} /></label>
          </div>

          {completionMessage && <div className="completion-toast" role="status"><span className="toast-check"><Check size={15} /></span>{completionMessage}<button onClick={() => setCompletionMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}

          {loading ? <div className="loading-state"><span className="loader" /> Gathering your tasks…</div> : view === 'calendar'
            ? <CalendarView tasks={tasks} studyReminders={activeStudyReminders} month={calendarMonth} setMonth={setCalendarMonth} calendarView={calendarView} setCalendarView={setCalendarView} onAdd={openNewTask} onEdit={(task) => { setEditing(task); setDialogOpen(true) }} onOpenStudy={() => setMode('study')} />
            : <TaskList tasks={filteredTasks} filter={filter} onToggle={toggleTask} onToggleSubtask={toggleSubtask} onEdit={(task) => { setEditing(task); setDialogOpen(true) }} onDelete={deleteTask} onFocus={selectFocusTask} busyId={busyId} onAdd={() => openNewTask()} />}
          </>}
        </section>
      </main>
      {dialogOpen && <TaskDialog task={editing} initialDate={initialDate} onClose={() => { setDialogOpen(false); setEditing(null); setInitialDate('') }} onSave={saveTask} />}
      {studyDialogOpen && <StudyReminderDialog reminder={editingStudyReminder} onClose={() => { setStudyDialogOpen(false); setEditingStudyReminder(null) }} onSave={saveStudyReminder} />}
      {disciplineDialogOpen && <DisciplineHabitDialog onClose={() => setDisciplineDialogOpen(false)} onSave={saveDisciplineHabit} />}
    </div>
  )
}

function MyDayDashboard({ date, todayKey, taskItems, studyReminders, disciplineHabits, disciplineLogs, loading, busyTaskId, busyDisciplineId, reviewingId, onToggleTask, onToggleSubtask, onOpenTask, onFocusTask, onAddTask, onOpenTasks, onAddStudy, onOpenStudy, onFocusStudy, onComplete, onToggleDiscipline, onAddDiscipline, onOpenDiscipline }: {
  date: Date
  todayKey: string
  taskItems: DayTaskItem[]
  studyReminders: StudyReminder[]
  disciplineHabits: DisciplineHabit[]
  disciplineLogs: DisciplineLog[]
  loading: boolean
  busyTaskId: string
  busyDisciplineId: string
  reviewingId: string
  onToggleTask: (task: Task) => void
  onToggleSubtask: (task: Task, subtask: TaskSubtask) => void
  onOpenTask: (task: Task) => void
  onFocusTask: (task: Task) => void
  onAddTask: () => void
  onOpenTasks: () => void
  onAddStudy: () => void
  onOpenStudy: () => void
  onFocusStudy: (reminder: StudyReminder) => void
  onComplete: (reminder: StudyReminder) => void
  onToggleDiscipline: (habit: DisciplineHabit) => void
  onAddDiscipline: () => void
  onOpenDiscipline: () => void
}) {
  const completedTasks = taskItems.filter(({ task, subtask }) => subtask ? subtask.completed_at : task.completed_at)
  const pendingTaskItems = taskItems.filter(({ task, subtask }) => !(subtask ? subtask.completed_at : task.completed_at))
  const openTaskCount = pendingTaskItems.length
  const completedHabits = disciplineHabits.filter((habit) => disciplineLogs.some((log) => log.habit_id === habit.id))
  const totalActions = taskItems.length + disciplineHabits.length + studyReminders.length
  const completedStudySessions = studyReminders.filter((reminder) => isStudyReminderComplete(reminder, date)).length
  const completedActions = completedTasks.length + completedHabits.length + completedStudySessions
  const progress = totalActions ? Math.round(completedActions / totalActions * 100) : 0
  const circumference = 2 * Math.PI * 39
  const offset = circumference * (1 - progress / 100)
  const overdueCount = taskItems.filter(({ task, subtask }) => {
    const completedAt = subtask ? subtask.completed_at : task.completed_at
    const dueAt = subtask?.due_at ?? task.due_at
    return !completedAt && dueAt && localDateKey(new Date(dueAt)) < todayKey
  }).length
  const greeting = date.getHours() < 12 ? 'Good morning' : date.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  function reminderTime(reminder: StudyReminder) {
    if (reminder.schedule_type === 'weekly') return formatTime(reminder.remind_time ?? '18:00')
    return reminder.remind_at
      ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.remind_at))
      : 'Scheduled today'
  }

  return <div className="my-day-page">
    <div className="welcome-row my-day-welcome">
      <div><span className="eyebrow"><Sparkles size={14} /> YOUR WHOLE DAY, IN ONE PLACE</span><h1>{greeting}. This is your day.</h1><p><span className="my-day-date-pill"><CalendarDays size={13} />{fullDate.format(date)}</span><span className="my-day-welcome-note">A clear view of what matters, with room to take it one step at a time.</span></p></div>
      <button className="button button-primary add-task-button" onClick={onAddTask}><Plus size={18} /> Add a task</button>
    </div>
    <section className="my-day-overview">
      <div className="my-day-progress-visual">
        <svg viewBox="0 0 100 100" role="img" aria-label={`${progress}% of today's tasks, study sessions, and commitments complete`}>
          <defs><linearGradient id="my-day-progress-gradient" x1="0" x2="1" y1="0" y2="1"><stop offset="0%" stopColor="#8fb493" /><stop offset="100%" stopColor="#477650" /></linearGradient></defs>
          <circle cx="50" cy="50" r="39" className="my-day-ring-track" />
          <circle cx="50" cy="50" r="39" className="my-day-ring-progress" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <div><strong>{progress}%</strong><span>done</span></div>
      </div>
      <div className="my-day-overview-copy">
        <span className="my-day-overview-eyebrow">{totalActions === 0 ? 'FRESH PAGE' : completedActions === totalActions ? 'YOU SHOWED UP' : `${totalActions - completedActions} SMALL ${totalActions - completedActions === 1 ? 'STEP' : 'STEPS'} LEFT`}</span>
        <h2>{totalActions === 0 ? 'A little room to choose what matters.' : completedActions === totalActions ? 'You kept your promises today.' : 'Progress, not pressure.'}</h2>
        <p>{totalActions === 0 ? 'Your schedule is clear. Add a task or commitment when you’re ready.' : `${completedActions} of ${totalActions} tasks, study sessions, and discipline commitments complete.`}</p>
        <div className="my-day-category-stats">
          <div><span className="my-day-dot task-dot" /><strong>{openTaskCount}</strong><span>tasks left</span></div>
          <div><span className="my-day-dot study-dot" /><strong>{completedStudySessions}/{studyReminders.length}</strong><span>study sessions done</span></div>
          <div><span className="my-day-dot discipline-dot" /><strong>{disciplineHabits.length - completedHabits.length}</strong><span>commitments left</span></div>
          {overdueCount > 0 && <span className="my-day-overdue">{overdueCount} overdue</span>}
        </div>
      </div>
      <div className="my-day-progress-bars" aria-label="Progress by area">
        <div><span><i className="task-dot" /> Tasks</span><strong>{completedTasks.length}/{taskItems.length}</strong><div><i style={{ width: `${taskItems.length ? completedTasks.length / taskItems.length * 100 : 0}%` }} /></div></div>
        <div><span><i className="discipline-dot" /> Discipline</span><strong>{completedHabits.length}/{disciplineHabits.length}</strong><div><i style={{ width: `${disciplineHabits.length ? completedHabits.length / disciplineHabits.length * 100 : 0}%` }} /></div></div>
        <div><span><i className="study-dot" /> Study sessions</span><strong>{completedStudySessions}/{studyReminders.length} done</strong><button onClick={onOpenStudy}>View study schedule</button></div>
      </div>
    </section>
    {loading ? <div className="my-day-loading"><span className="loader" /> Gathering your day…</div> : <div className="my-day-grid">
      <section className="my-day-section my-day-tasks">
        <div className="my-day-section-heading"><div><span className="my-day-section-icon task-icon"><CheckCheck size={16} /></span><div><h2>Tasks</h2><p>Due today and anything overdue</p></div><span className="my-day-section-count">{openTaskCount}</span></div><button onClick={onAddTask}><Plus size={15} /> Add</button></div>
        {pendingTaskItems.length ? <div className="my-day-item-list">{pendingTaskItems.map(({ task, subtask }) => {
          const title = subtask?.title ?? task.title
          const completedAt = subtask ? subtask.completed_at : task.completed_at
          const dueAt = subtask?.due_at ?? task.due_at
          const overdue = Boolean(!completedAt && dueAt && localDateKey(new Date(dueAt)) < todayKey)
          const busyKey = subtask ? `subtask:${subtask.id}` : task.id
          return <article className={`my-day-item ${completedAt ? 'item-complete' : ''}`} key={subtask?.id ?? task.id}>
            <button className={`my-day-check ${completedAt ? 'checked' : ''}`} aria-label={completedAt ? `Undo ${title}` : `Complete ${title}`} disabled={busyTaskId === busyKey} onClick={() => subtask ? onToggleSubtask(task, subtask) : onToggleTask(task)}>{completedAt && <Check size={13} />}</button>
            <button className="my-day-item-copy" onClick={() => onOpenTask(task)}><strong>{title}</strong><span>{subtask ? `Subtask of ${task.title} · ` : ''}{overdue ? 'Overdue' : completedAt ? 'Done today' : dueAt ? new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(dueAt)) : 'Completed today'}</span></button>
            {!completedAt && <button className="my-day-focus" onClick={() => onFocusTask(task)} aria-label={`Focus on ${title}`}><Timer size={14} /></button>}
            {overdue && <span className="my-day-status overdue-status">Overdue</span>}
            {task.priority === 'high' && !completedAt && <span className="my-day-status priority-status">High</span>}
          </article>
        })}</div> : <div className="my-day-empty"><Check size={17} /><span>No tasks due today. Nice breathing room.</span></div>}
        <button className="my-day-view-all" onClick={onOpenTasks}>Open all tasks <ArrowRight size={13} /></button>
      </section>
      <section className="my-day-section my-day-study">
        <div className="my-day-section-heading"><div><span className="my-day-section-icon study-icon"><BookOpen size={16} /></span><div><h2>Study reminders</h2><p>Sessions scheduled for today</p></div><span className="my-day-section-count study-count">{studyReminders.length}</span></div><button onClick={onAddStudy}><Plus size={15} /> Add</button></div>
        {studyReminders.length ? <div className="my-day-item-list">{studyReminders.map((reminder) => {
          const completed = isStudyReminderComplete(reminder, date)
          const scheduleDate = reminder.remind_at ? localDateKey(new Date(reminder.remind_at)) : todayKey
          const overdue = reminder.schedule_type !== 'weekly' && scheduleDate < todayKey
          const scheduleLabel = reminder.schedule_type === 'spaced'
            ? `Spaced review ${reminder.review_count + 1}`
            : reminder.schedule_type === 'weekly' ? 'Weekly session' : 'One-time session'
          return <article className={`my-day-item ${completed ? 'item-complete' : ''}`} key={reminder.id}>
            <span className="my-day-time">{reminderTime(reminder)}</span>
            <button className="my-day-item-copy" onClick={onOpenStudy}><strong>{reminder.topic || reminder.subject}</strong><span>{reminder.subject} · {scheduleLabel}</span></button>
            {overdue && <span className="my-day-status overdue-status">Overdue</span>}
            <button className="my-day-focus" onClick={() => onFocusStudy(reminder)} aria-label={`Start a focus timer for ${reminder.topic || reminder.subject}`}><Timer size={14} /></button>
            <button className={`my-day-review ${completed ? 'completed' : ''}`} onClick={() => onComplete(reminder)} disabled={reviewingId === reminder.id || (completed && reminder.schedule_type === 'spaced')}>{reviewingId === reminder.id ? 'Saving…' : completed ? 'Done' : 'Mark complete'}</button>
          </article>
        })}</div> : <div className="my-day-empty"><BookOpen size={17} /><span>No study sessions scheduled today.</span></div>}
        <button className="my-day-view-all" onClick={onOpenStudy}>Open study schedule <ArrowRight size={13} /></button>
      </section>
      <section className="my-day-section my-day-discipline">
        <div className="my-day-section-heading"><div><span className="my-day-section-icon discipline-icon"><ShieldCheck size={16} /></span><div><h2>Discipline</h2><p>Small promises on your schedule</p></div><span className="my-day-section-count discipline-count">{disciplineHabits.filter((habit) => !disciplineLogs.some((log) => log.habit_id === habit.id)).length}</span></div><button onClick={onAddDiscipline}><Plus size={15} /> Add</button></div>
        {disciplineHabits.length ? <div className="my-day-item-list">{disciplineHabits.map((habit) => {
          const done = disciplineLogs.some((log) => log.habit_id === habit.id)
          return <article className={`my-day-item ${done ? 'item-complete' : ''}`} key={habit.id}>
            <button className={`my-day-check ${done ? 'checked' : ''}`} aria-label={done ? `Undo ${habit.title}` : `Complete ${habit.title}`} disabled={busyDisciplineId === habit.id} onClick={() => onToggleDiscipline(habit)}>{done && <Check size={13} />}</button>
            <div className="my-day-item-copy"><strong>{habit.title}</strong><span>{habit.cue_time ? `${formatTime(habit.cue_time)} · ` : ''}Minimum: {habit.minimum_action}</span></div>
            {done && <span className="my-day-status done-status">Done</span>}
          </article>
        })}</div> : <div className="my-day-empty"><ShieldCheck size={17} /><span>No commitments scheduled today.</span></div>}
        <button className="my-day-view-all" onClick={onOpenDiscipline}>Open discipline coach <ArrowRight size={13} /></button>
      </section>
    </div>}
  </div>
}

function StudyDashboard({ reminders, subjects, loading, notificationsSupported, notificationPermission, notificationsEnabled, onEnableNotifications, onAdd, onEdit, onToggle, onDelete, onFocus, onComplete, reviewingId }: {
  reminders: StudyReminder[]
  subjects: string[]
  loading: boolean
  notificationsSupported: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  notificationsEnabled: boolean
  onEnableNotifications: () => void
  onAdd: () => void
  onEdit: (reminder: StudyReminder) => void
  onToggle: (reminder: StudyReminder) => void
  onDelete: (reminder: StudyReminder) => void
  onFocus: (reminder: StudyReminder) => void
  onComplete: (reminder: StudyReminder) => void
  reviewingId: string
}) {
  const [reminderView, setReminderView] = useState<'all' | 'due' | 'upcoming' | 'paused'>('all')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const activeReminders = reminders.filter((reminder) => reminder.enabled)
  const now = new Date()
  const dueReminders = activeReminders.filter((reminder) =>
    isReminderDue(reminder, now) && !isStudyReminderComplete(reminder, now))
    .sort((a, b) => {
      const dateA = getReminderSortDate(a, now)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const dateB = getReminderSortDate(b, now)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })
  const dueCount = dueReminders.length
  const upcomingCount = activeReminders.filter((reminder) =>
    !isReminderDue(reminder, now) && !isStudyReminderComplete(reminder, now)).length
  const nextReminder = dueReminders.length
    ? { reminder: dueReminders[0], next: now, isDue: true }
    : activeReminders
    .map((reminder) => ({ reminder, next: getNextReminderDate(reminder, now) }))
    .filter((entry): entry is { reminder: StudyReminder; next: Date } => entry.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime())
    .map((entry) => ({ ...entry, isDue: false }))[0]
  const visibleReminders = reminders
    .filter((reminder) => {
      if (subjectFilter !== 'all' && reminder.subject !== subjectFilter) return false
      if (reminderView === 'paused') return !reminder.enabled
      if (!reminder.enabled) return reminderView === 'all'
      const completed = isStudyReminderComplete(reminder, now)
      const due = isReminderDue(reminder, now) && !completed
      return reminderView === 'all' || (reminderView === 'due' ? due : !due && !completed)
    })
    .sort((a, b) => {
      if (a.enabled !== b.enabled) return Number(b.enabled) - Number(a.enabled)
      const dueDifference = Number(isReminderDue(b, now) && !isStudyReminderComplete(b, now))
        - Number(isReminderDue(a, now) && !isStudyReminderComplete(a, now))
      if (dueDifference) return dueDifference
      const dateA = getReminderSortDate(a, now)?.getTime() ?? Number.MAX_SAFE_INTEGER
      const dateB = getReminderSortDate(b, now)?.getTime() ?? Number.MAX_SAFE_INTEGER
      return dateA - dateB
    })

  return <div className="study-page">
    <div className="welcome-row study-welcome">
      <div><span className="eyebrow"><BellRing size={14} /> BUILD A STUDY ROUTINE</span><h1>Study reminders.</h1><p>Use spaced reviews to revisit class topics over time and help them stick in long-term memory.</p></div>
      <button className="button button-primary add-task-button" onClick={onAdd}><Plus size={18} /> Schedule study</button>
    </div>

    <section className="study-overview" aria-label="Study reminder overview">
      <div className={`study-overview-due ${dueCount ? 'has-due' : ''}`}><span className="study-stat-icon"><Bell size={17} /></span><div><span className="study-stat-label">DUE TODAY</span><strong>{dueCount}</strong><span>{dueCount === 1 ? 'session ready when you are' : 'sessions ready when you are'}</span></div></div>
      <div className="study-overview-next"><span className="study-stat-icon"><Clock3 size={17} /></span><div><span className="study-stat-label">{nextReminder?.isDue ? 'READY NOW' : 'NEXT SESSION'}</span><strong>{nextReminder ? nextReminder.isDue ? 'Due now' : new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(nextReminder.next) : 'Nothing scheduled'}</strong><span>{nextReminder?.reminder.subject ?? 'Add a reminder to plan ahead'}</span></div></div>
      <span className="study-overview-subjects"><BookOpen size={15} /> {subjects.length} {subjects.length === 1 ? 'subject' : 'subjects'}</span>
    </section>

    <section className="study-reminder">
      <div className="study-reminder-copy"><span className="study-reminder-icon"><Bell size={17} /></span><div><strong>Browser notifications</strong><p>Allow notifications so Daymark can nudge you at the scheduled study time.</p></div></div>
      <div className="study-reminder-controls">
        {notificationsEnabled
          ? <span className="reminder-enabled-button"><Check size={14} /> Notifications on</span>
          : <button className="enable-reminder-button" onClick={onEnableNotifications} disabled={!notificationsSupported || notificationPermission === 'denied'}>{notificationPermission === 'denied' ? 'Blocked in browser settings' : notificationsSupported ? 'Enable notifications' : 'Notifications unavailable'}</button>}
      </div>
      <p className={`study-reminder-note ${notificationsEnabled ? 'active' : ''}`}>{notificationsEnabled ? 'Your scheduled reminders will appear while Daymark is open. Keep this app open to receive them.' : 'Schedules are saved to your account. Browser reminders require Daymark to be open; closed-app push alerts need additional setup.'}</p>
    </section>

    <section className="study-library">
      <div className="study-section-heading"><div><span className="chart-eyebrow">YOUR ROUTINE</span><h2>Study sessions</h2><p>Due sessions first, then what’s coming up.</p></div><span className="study-library-count">{activeReminders.length} active · {dueCount} due</span></div>
      {!!reminders.length && <div className="study-filters" aria-label="Filter study reminders">
        <div className="study-filter-tabs" role="group" aria-label="Reminder status">
          {([
            ['all', 'All', reminders.length],
            ['due', 'Due now', dueCount],
            ['upcoming', 'Upcoming', upcomingCount],
            ['paused', 'Paused', reminders.length - activeReminders.length],
          ] as const).map(([viewName, label, count]) => <button key={viewName} className={reminderView === viewName ? 'selected' : ''} onClick={() => setReminderView(viewName)} aria-pressed={reminderView === viewName}>{label}<span>{count}</span></button>)}
        </div>
        {subjects.length > 1 && <label className="study-subject-filter"><span>Subject</span><select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="all">All subjects</option>{subjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>}
      </div>}
      {loading ? <div className="study-empty"><span className="loader" /> Loading your study schedule…</div>
        : reminders.length ? visibleReminders.length ? <div className="study-library-list">{visibleReminders.map((reminder) => <StudyReminderRow key={reminder.id} reminder={reminder} onEdit={() => onEdit(reminder)} onToggle={() => onToggle(reminder)} onDelete={() => onDelete(reminder)} onFocus={() => onFocus(reminder)} onComplete={() => onComplete(reminder)} reviewing={reviewingId === reminder.id} />)}</div>
          : <div className="study-filter-empty"><BookOpen size={17} /><span>No sessions match this view.</span><button onClick={() => { setReminderView('all'); setSubjectFilter('all') }}>Show all</button></div>
          : <div className="study-empty"><span className="study-empty-icon"><BookOpen size={21} /></span><h3>Give your classes a place in your week.</h3><p>Schedule a one-time session, a weekly reminder, or a spaced review plan. Your plans will stay here across devices.</p><button className="button button-secondary" onClick={onAdd}><Plus size={16} /> Schedule your first study session</button></div>}
    </section>
  </div>
}

function StudyReminderRow({ reminder, onEdit, onToggle, onDelete, onFocus, onComplete, reviewing }: { reminder: StudyReminder; onEdit: () => void; onToggle: () => void; onDelete: () => void; onFocus: () => void; onComplete: () => void; reviewing: boolean }) {
  const schedule = reminder.schedule_type !== 'weekly' && reminder.remind_at
    ? new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.remind_at))
    : `${reminder.days_of_week.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')} · ${formatTime(reminder.remind_time ?? '18:00')}`
  const now = new Date()
  const due = isReminderDue(reminder, now)
  const completed = isStudyReminderComplete(reminder, now)
  const canComplete = completed || (reminder.schedule_type === 'weekly'
    ? reminder.enabled && reminder.days_of_week.includes(now.getDay())
    : isReminderDue(reminder, now) || (reminder.schedule_type === 'once'
      && Boolean(reminder.remind_at && localDateKey(new Date(reminder.remind_at)) <= localDateKey(now))))
  const intervalDays = getNextSpacedIntervalDays(reminder.review_count)
  const scheduleLabel = reminder.schedule_type === 'weekly'
    ? `Weekly · ${schedule}`
    : reminder.schedule_type === 'spaced'
      ? `Spaced review ${reminder.review_count + 1} · ${due && !completed ? 'Due now' : schedule} · next interval ${intervalDays} ${intervalDays === 1 ? 'day' : 'days'}`
      : `One time · ${schedule}`
  return <article className={`study-library-item ${reminder.enabled ? '' : 'reminder-paused'}`}>
    <span className="study-reminder-row-icon"><BookOpen size={16} /></span>
    <div className="study-reminder-row-main"><span className="study-subject-chip">{reminder.subject}</span><strong>{reminder.topic || 'Study session'}</strong><span className="study-library-schedule">{scheduleLabel}</span></div>
    {reminder.enabled && <button className="task-focus-button" onClick={onFocus} aria-label={`Set a focus timer for ${reminder.topic || reminder.subject}`}><Timer size={14} /><span>Focus</span></button>}
    {canComplete && <button className={`review-done-button ${completed ? 'completed' : ''}`} onClick={onComplete} disabled={reviewing || (completed && reminder.schedule_type === 'spaced')}>{reviewing ? 'Saving…' : completed ? 'Done' : 'Mark complete'}</button>}
    <button className="study-edit-button" onClick={onEdit} aria-label={`Edit ${reminder.subject} study reminder`}>Edit</button>
    <button className={`reminder-toggle ${reminder.enabled ? 'on' : ''}`} onClick={onToggle} aria-label={`${reminder.enabled ? 'Pause' : 'Resume'} ${reminder.subject} study reminder`} aria-pressed={reminder.enabled}><span /></button>
    <button className="delete-study-reminder" aria-label={`Delete ${reminder.subject} study reminder`} onClick={onDelete}><X size={16} /></button>
  </article>
}

function StudyReminderDialog({ reminder, onClose, onSave }: {
  reminder: StudyReminder | null
  onClose: () => void
  onSave: (draft: StudyReminderDraft) => Promise<boolean>
}) {
  const [scheduleType, setScheduleType] = useState<'once' | 'weekly' | 'spaced'>(reminder?.schedule_type ?? 'weekly')
  const [subject, setSubject] = useState(reminder?.subject ?? '')
  const [topic, setTopic] = useState(reminder?.topic ?? '')
  const [date, setDate] = useState(reminder?.remind_at ? localDateKey(new Date(reminder.remind_at)) : localDateKey(new Date()))
  const [time, setTime] = useState(reminder?.remind_at && reminder.schedule_type !== 'weekly'
    ? new Date(reminder.remind_at).toTimeString().slice(0, 5)
    : (reminder?.remind_time ?? '18:00'))
  const [days, setDays] = useState<number[]>(reminder?.days_of_week.length ? reminder.days_of_week : [1, 3, 5])
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')

  function toggleDay(day: number) {
    setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (scheduleType === 'weekly' && days.length === 0) {
      setFormError('Choose at least one day for your weekly study reminder.')
      return
    }
    if (scheduleType !== 'weekly' && new Date(`${date}T${time}`).getTime() <= Date.now()) {
      setFormError('Choose a first study time in the future.')
      return
    }
    setFormError('')
    setBusy(true)
    const saved = await onSave({ subject, topic, schedule_type: scheduleType, date, time, days_of_week: days })
    setBusy(false)
    if (saved) onClose()
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="task-modal study-reminder-modal" onSubmit={(event) => void submit(event)}>
    <div className="modal-heading"><div><span className="eyebrow"><BellRing size={13} /> MAKE TIME TO REMEMBER</span><h2>{reminder ? 'Edit study reminder' : 'Schedule study time'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
    <p className="study-form-intro">Plan focused study sessions for your classes. Choose a weekly routine, a one-time session, or a spaced review plan.</p>
    <label>Class or subject<input autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology, World History" maxLength={60} required /></label>
    <label>What will you study? <span className="optional-label">OPTIONAL</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Review chapter 4 for Friday’s quiz" maxLength={160} /></label>
    <label>Study plan<select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as 'once' | 'weekly' | 'spaced')}><option value="weekly">Every week</option><option value="once">One time</option><option value="spaced">Spaced repetition</option></select></label>
    {scheduleType === 'weekly' && <fieldset className="study-day-picker"><legend>Study on</legend>{[['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0]].map(([label, day], index) => <button key={`${day}-${index}`} type="button" className={days.includes(Number(day)) ? 'study-day selected' : 'study-day'} aria-pressed={days.includes(Number(day))} onClick={() => toggleDay(Number(day))}>{label}</button>)}</fieldset>}
    {scheduleType === 'weekly'
      ? <label>Reminder time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
      : <div className="form-row"><label>Date<input type="date" min={localDateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label></div>}
    {scheduleType === 'spaced' && <p className="spaced-plan-note">Your first review starts on this date. Mark it reviewed to schedule follow-ups at 1 day, 3 days, 1 week, 3 weeks, and longer intervals.</p>}
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <div className="study-form-tip"><Sparkles size={14} /><span>{scheduleType === 'spaced' ? 'After each review, mark it complete and Daymark will automatically schedule the next interval.' : 'Short, repeated sessions are easier to stick with than last-minute cramming.'}</span></div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : reminder ? 'Save changes' : 'Save study reminder'} <ArrowRight size={16} /></button></div>
  </form></div>
}

function formatTime(value: string) {
  const [hours = '0', minutes = '00'] = value.split(':')
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, Number(hours), Number(minutes)))
}

function compareDueAt(a: string | null, b: string | null) {
  if (!a) return b ? 1 : 0
  if (!b) return -1
  return new Date(a).getTime() - new Date(b).getTime()
}

function getReminderDateForDay(reminder: StudyReminder, day: Date) {
  if (reminder.schedule_type !== 'weekly') {
    return reminder.remind_at ? new Date(reminder.remind_at).getTime() : Number.MAX_SAFE_INTEGER
  }
  const [hours = '18', minutes = '00'] = (reminder.remind_time ?? '18:00').split(':')
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), Number(hours), Number(minutes)).getTime()
}

function isReminderDue(reminder: StudyReminder, now: Date) {
  if (!reminder.enabled) return false
  if (reminder.schedule_type !== 'weekly') return Boolean(reminder.remind_at && new Date(reminder.remind_at).getTime() <= now.getTime())
  const time = reminder.remind_time?.slice(0, 5) ?? '23:59'
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return reminder.days_of_week.includes(now.getDay()) && currentTime >= time
}

function getStudyOccurrenceDate(reminder: StudyReminder, now: Date) {
  if (reminder.schedule_type === 'once' && reminder.remind_at) {
    return localDateKey(new Date(reminder.remind_at))
  }
  return localDateKey(now)
}

function isStudyReminderComplete(reminder: StudyReminder, now: Date) {
  return reminder.completed_on === getStudyOccurrenceDate(reminder, now)
}

function getNextReminderDate(reminder: StudyReminder, now: Date): Date | null {
  if (!reminder.enabled) return null
  if (reminder.schedule_type !== 'weekly') {
    const date = reminder.remind_at ? new Date(reminder.remind_at) : null
    return date && date > now ? date : null
  }
  const [hours = '18', minutes = '00'] = (reminder.remind_time ?? '18:00').split(':')
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, Number(hours), Number(minutes))
    if (reminder.days_of_week.includes(date.getDay()) && date > now) return date
  }
  return null
}

function getReminderSortDate(reminder: StudyReminder, now: Date): Date | null {
  if (reminder.schedule_type !== 'weekly') return reminder.remind_at ? new Date(reminder.remind_at) : null
  const [hours = '18', minutes = '00'] = (reminder.remind_time ?? '18:00').split(':')
  const nextDate = getNextReminderDate(reminder, now)
  if (nextDate) return nextDate
  if (!reminder.days_of_week.includes(now.getDay())) return null
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hours), Number(minutes))
}

function DisciplineDashboard({ habits, logs, loading, todayKey, notificationsSupported, notificationPermission, notificationsEnabled, onEnableNotifications, onAdd, onToggleLog, onToggleHabit, onDeleteHabit, busyId }: {
  habits: DisciplineHabit[]
  logs: DisciplineLog[]
  loading: boolean
  todayKey: string
  notificationsSupported: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  notificationsEnabled: boolean
  onEnableNotifications: () => void
  onAdd: () => void
  onToggleLog: (habit: DisciplineHabit) => void
  onToggleHabit: (habit: DisciplineHabit) => void
  onDeleteHabit: (habit: DisciplineHabit) => void
  busyId: string
}) {
  const activeHabits = habits.filter((habit) => habit.active)
  const weekday = new Date(`${todayKey}T12:00:00`).getDay()
  const todaysHabits = activeHabits.filter((habit) => habit.days_of_week.includes(weekday))
  const doneToday = todaysHabits.filter((habit) => logs.some((log) => log.habit_id === habit.id && log.completed_on === todayKey)).length
  const weekStart = new Date(`${todayKey}T12:00:00`)
  weekStart.setDate(weekStart.getDate() - 6)
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return localDateKey(date)
  })
  const completedKeys = new Set(logs.map((log) => `${log.habit_id}:${log.completed_on}`))
  const historyStart = new Date(`${todayKey}T12:00:00`)
  historyStart.setDate(historyStart.getDate() - 29)
  const historyKeys = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(historyStart)
    date.setDate(date.getDate() + index)
    return localDateKey(date)
  })
  const historyByDay = historyKeys.map((dateKey) => {
    const date = new Date(`${dateKey}T12:00:00`)
    const plannedHabits = activeHabits.filter((habit) =>
      dateKey >= localDateKey(new Date(habit.created_at)) && habit.days_of_week.includes(date.getDay()),
    )
    const completed = plannedHabits.filter((habit) => completedKeys.has(`${habit.id}:${dateKey}`)).length
    return { dateKey, planned: plannedHabits.length, completed }
  })
  const consistencyTrend = historyByDay.map((_, index) => {
    const week = historyByDay.slice(Math.max(0, index - 6), index + 1)
    const planned = week.reduce((total, day) => total + day.planned, 0)
    const completed = week.reduce((total, day) => total + day.completed, 0)
    return { dateKey: historyByDay[index].dateKey, rate: planned ? Math.round(completed / planned * 100) : 0 }
  })
  const weekdayRhythm = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const matchingDays = historyByDay.filter(({ dateKey }) => new Date(`${dateKey}T12:00:00`).getDay() === dayOfWeek)
    const planned = matchingDays.reduce((total, day) => total + day.planned, 0)
    const completed = matchingDays.reduce((total, day) => total + day.completed, 0)
    return {
      label: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek],
      planned,
      completed,
      rate: planned ? Math.round(completed / planned * 100) : 0,
    }
  })
  const habitProgress = activeHabits.map((habit) => {
    const planned = historyByDay.reduce((total, day) => {
      const date = new Date(`${day.dateKey}T12:00:00`)
      return total + Number(day.dateKey >= localDateKey(new Date(habit.created_at)) && habit.days_of_week.includes(date.getDay()))
    }, 0)
    const completed = historyKeys.reduce((total, dateKey) =>
      total + Number(completedKeys.has(`${habit.id}:${dateKey}`)), 0)
    return { habit, planned, completed, rate: planned ? Math.round(completed / planned * 100) : 0 }
  })
  const trendPath = consistencyTrend.map(({ rate }, index) => {
    const x = 38 + index * 18
    const y = 142 - rate * 1.2
    return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
  }).join(' ')
  const trendArea = `${trendPath} L 560 148 L 38 148 Z`
  let scheduledThisWeek = 0
  let completedThisWeek = 0
  for (const habit of activeHabits) {
    for (const dateKey of weekKeys) {
      if (dateKey < localDateKey(new Date(habit.created_at))) continue
      const date = new Date(`${dateKey}T12:00:00`)
      if (!habit.days_of_week.includes(date.getDay())) continue
      scheduledThisWeek += 1
      if (completedKeys.has(`${habit.id}:${dateKey}`)) completedThisWeek += 1
    }
  }
  const weeklyRate = scheduledThisWeek ? Math.round((completedThisWeek / scheduledThisWeek) * 100) : 0
  const bestStreak = Math.max(0, ...activeHabits.map((habit) => getHabitStreak(habit, completedKeys, todayKey)))
  const doneByDay = weekKeys.map((dateKey) => {
    const planned = activeHabits.filter((habit) => dateKey >= localDateKey(new Date(habit.created_at)) && habit.days_of_week.includes(new Date(`${dateKey}T12:00:00`).getDay()))
    const completed = planned.filter((habit) => completedKeys.has(`${habit.id}:${dateKey}`)).length
    return { dateKey, planned: planned.length, completed }
  })

  function renderHabit(habit: DisciplineHabit, scheduledToday: boolean) {
    const complete = completedKeys.has(`${habit.id}:${todayKey}`)
    const streak = getHabitStreak(habit, completedKeys, todayKey)
    return <article className={`discipline-habit-card ${complete ? 'discipline-habit-complete' : ''}`} key={habit.id}>
      <button className={`discipline-check ${complete ? 'checked' : ''}`} aria-label={complete ? `Undo ${habit.title} check-in` : `Complete ${habit.title}`} disabled={busyId === habit.id || !scheduledToday} onClick={() => onToggleLog(habit)}>{complete && <Check size={15} />}</button>
      <div className="discipline-habit-main">
        <div className="discipline-habit-title-row"><h3>{habit.title}</h3>{streak > 0 && <span className="discipline-streak"><Flame size={13} /> {streak} day streak</span>}</div>
        <p><strong>Minimum:</strong> {habit.minimum_action}</p>
        <span className="discipline-habit-meta">{scheduledToday ? habit.cue_time ? `Cue · ${formatTime(habit.cue_time)}` : 'Scheduled today' : `On ${habit.days_of_week.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')}`}</span>
        <div className="discipline-week-dots" aria-label="Last seven days">
          {doneByDay.map(({ dateKey }) => {
            const date = new Date(`${dateKey}T12:00:00`)
            const isPlanned = dateKey >= localDateKey(new Date(habit.created_at)) && habit.days_of_week.includes(date.getDay())
            const isDone = completedKeys.has(`${habit.id}:${dateKey}`)
            return <span key={dateKey} title={`${new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)}${isDone ? ' · complete' : isPlanned ? ' · planned' : ' · rest day'}`} className={`discipline-day-dot ${isDone ? 'done' : isPlanned ? 'planned' : ''}`} />
          })}
          <span className="discipline-dots-label">7-day history</span>
        </div>
      </div>
      {!scheduledToday && <span className="discipline-next-label">Rest day</span>}
      <button className="discipline-pause" onClick={() => onToggleHabit(habit)} aria-label={`Pause ${habit.title}`} title="Pause commitment"><span>Pause</span></button>
      <button className="discipline-delete" onClick={() => onDeleteHabit(habit)} disabled={busyId === habit.id} aria-label={`Delete ${habit.title}`} title="Delete commitment"><X size={15} /></button>
    </article>
  }

  return <div className="discipline-page">
    <div className="welcome-row discipline-welcome">
      <div><span className="eyebrow"><ShieldCheck size={14} /> KEEP PROMISES TO YOURSELF</span><h1>Discipline, built daily.</h1><p>Make the commitment small enough to keep. Consistency beats intensity.</p></div>
      <button className="button button-primary add-task-button" onClick={onAdd}><Plus size={18} /> Add commitment</button>
    </div>
    <section className="discipline-hero">
      <div className="discipline-hero-copy"><span><Flame size={15} /> THE DISCIPLINE LOOP</span><h2>Show up. Keep it small. Repeat.</h2><p>Choose a reliable cue and a minimum version you can do even on a hard day. If you miss, restart today—no catch-up punishment.</p></div>
      <div className="discipline-loop">{['Cue', 'Small action', 'Check in'].map((step, index) => <div key={step}><span>{index + 1}</span><strong>{step}</strong></div>)}</div>
    </section>
    <section className="study-reminder discipline-nudge">
      <div className="study-reminder-copy"><span className="study-reminder-icon"><Bell size={17} /></span><div><strong>Gentle cue-time nudges</strong><p>Get a browser notification when a commitment is scheduled.</p></div></div>
      <div className="study-reminder-controls">
        {notificationsEnabled
          ? <span className="reminder-enabled-button"><Check size={14} /> Notifications on</span>
          : <button className="enable-reminder-button" onClick={onEnableNotifications} disabled={!notificationsSupported || notificationPermission === 'denied'}>{notificationPermission === 'denied' ? 'Blocked in browser settings' : notificationsSupported ? 'Enable notifications' : 'Notifications unavailable'}</button>}
      </div>
      <p className={`study-reminder-note ${notificationsEnabled ? 'active' : ''}`}>{notificationsEnabled ? 'Nudges appear while Daymark is open. A completed commitment won’t nudge you again that day.' : 'Choose a cue time for a commitment, enable notifications, and keep Daymark open to receive the nudge.'}</p>
    </section>
    <section className="discipline-stats" aria-label="Discipline progress">
      <article className="discipline-stat-card"><span>DONE TODAY</span><strong>{doneToday}<small> / {todaysHabits.length}</small></strong><div className="discipline-stat-track"><i style={{ width: `${todaysHabits.length ? Math.round(doneToday / todaysHabits.length * 100) : 0}%` }} /></div></article>
      <article className="discipline-stat-card"><span>7-DAY FOLLOW-THROUGH</span><strong>{weeklyRate}<small>%</small></strong><p>{completedThisWeek} of {scheduledThisWeek} planned check-ins</p></article>
      <article className="discipline-stat-card"><span>LONGEST CURRENT STREAK</span><strong>{bestStreak}<small> {bestStreak === 1 ? 'day' : 'days'}</small></strong><p>Built one kept promise at a time</p></article>
    </section>
    {!loading && activeHabits.length > 0 && <>
      <section className="discipline-chart-grid" aria-label="Consistency charts">
        <article className="discipline-chart-card">
          <div className="discipline-chart-heading"><div><span className="chart-eyebrow">YOUR MOMENTUM</span><h2>30-day consistency</h2><p>A rolling 7-day view smooths out the ups and downs.</p></div><strong>{consistencyTrend.at(-1)?.rate ?? 0}%<small> this week</small></strong></div>
          <div className="consistency-chart-wrap">
            <svg className="consistency-chart" viewBox="0 0 580 180" role="img" aria-label="Rolling seven-day commitment follow-through over the last 30 days">
              <defs><linearGradient id="consistency-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6d9a74" stopOpacity=".22" /><stop offset="100%" stopColor="#6d9a74" stopOpacity="0" /></linearGradient></defs>
              {[0, 25, 50, 75, 100].map((rate) => {
                const y = 142 - rate * 1.2
                return <g key={rate}><line x1="38" y1={y} x2="560" y2={y} className="consistency-grid-line" /><text x="29" y={y + 3} textAnchor="end" className="consistency-axis-label">{rate}</text></g>
              })}
              <path d={trendArea} className="consistency-area" />
              <path d={trendPath} className="consistency-line" />
              {consistencyTrend.map(({ dateKey, rate }, index) => {
                const x = 38 + index * 18
                const y = 142 - rate * 1.2
                return <circle key={dateKey} cx={x} cy={y} r={index === consistencyTrend.length - 1 ? 4 : 2.2} className="consistency-point"><title>{dateKey}: {rate}% rolling consistency</title></circle>
              })}
              <text x="38" y="169" className="consistency-axis-label">{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(`${historyKeys[0]}T12:00:00`))}</text>
              <text x="560" y="169" textAnchor="end" className="consistency-axis-label">Today</text>
            </svg>
          </div>
        </article>
        <article className="discipline-chart-card">
          <div className="discipline-chart-heading"><div><span className="chart-eyebrow">FIND YOUR FLOW</span><h2>Follow-through by day</h2><p>See which days are easiest—and where to make the plan smaller.</p></div></div>
          <div className="weekday-chart" role="img" aria-label="Commitment completion rate for each weekday over the last 30 days">
            {weekdayRhythm.map(({ label, planned, completed, rate }) => <div className="weekday-chart-column" key={label} title={`${label}: ${completed} of ${planned} commitments completed`}>
              <strong>{planned ? `${rate}%` : '—'}</strong>
              <div className="weekday-chart-track"><span style={{ height: `${rate}%` }} /></div>
              <span className="weekday-chart-label">{label}</span>
              <small>{completed}/{planned}</small>
            </div>)}
          </div>
          <div className="weekday-chart-legend"><span><i /> completed / planned opportunities, last 30 days</span></div>
        </article>
      </section>
      <section className="discipline-chart-card habit-progress-card">
        <div className="discipline-chart-heading"><div><span className="chart-eyebrow">SMALL PROMISES ADD UP</span><h2>Commitment consistency</h2><p>Completion rate per commitment over its scheduled days in the last 30 days.</p></div></div>
        <div className="habit-progress-list">{habitProgress.map(({ habit, planned, completed, rate }) => <div className="habit-progress-row" key={habit.id}>
          <div className="habit-progress-label"><strong>{habit.title}</strong><span>{completed} of {planned} days · {rate}%</span></div>
          <div className="habit-progress-track" role="progressbar" aria-label={`${habit.title} consistency`} aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${rate}%` }} /></div>
        </div>)}</div>
      </section>
    </>}
    <section className="discipline-commitments">
      <div className="study-section-heading"><div><span className="chart-eyebrow">YOUR COMMITMENTS</span><h2>Today’s promises</h2><p>Do the minimum first. You can always do more.</p></div><span className="study-library-count">{todaysHabits.length} scheduled</span></div>
      {loading ? <div className="study-empty"><span className="loader" /> Loading your commitments…</div>
        : todaysHabits.length ? <div className="discipline-habit-list">{todaysHabits.map((habit) => renderHabit(habit, true))}</div>
          : <div className="discipline-empty"><span className="study-empty-icon"><ShieldCheck size={21} /></span><h3>{activeHabits.length ? 'A planned rest day.' : 'Start with one promise.'}</h3><p>{activeHabits.length ? 'Your routine has no commitments scheduled today. Rest is part of a sustainable system.' : 'Pick one small action you can reliably repeat. Build from consistency, not a perfect plan.'}</p><button className="button button-secondary" onClick={onAdd}><Plus size={16} /> {activeHabits.length ? 'Add a commitment' : 'Create your first commitment'}</button></div>}
    </section>
    {activeHabits.some((habit) => !habit.days_of_week.includes(weekday)) && <section className="discipline-commitments"><div className="study-section-heading"><div><span className="chart-eyebrow">COMING UP</span><h2>Other days</h2><p>These commitments are scheduled for later in your week.</p></div></div><div className="discipline-habit-list">{activeHabits.filter((habit) => !habit.days_of_week.includes(weekday)).map((habit) => renderHabit(habit, false))}</div></section>}
    {habits.some((habit) => !habit.active) && <section className="discipline-commitments"><div className="study-section-heading"><div><span className="chart-eyebrow">ON PAUSE</span><h2>Paused commitments</h2><p>Resume when you’re ready to recommit.</p></div></div><div className="discipline-habit-list">{habits.filter((habit) => !habit.active).map((habit) => <article className="discipline-paused-card" key={habit.id}><div><strong>{habit.title}</strong><span>{habit.minimum_action}</span></div><div className="discipline-paused-actions"><button className="discipline-resume" onClick={() => onToggleHabit(habit)}>Resume</button><button className="discipline-delete" onClick={() => onDeleteHabit(habit)} disabled={busyId === habit.id} aria-label={`Delete ${habit.title}`} title="Delete commitment"><X size={15} /></button></div></article>)}</div></section>}
  </div>
}

function getHabitStreak(habit: DisciplineHabit, completedKeys: Set<string>, todayKey: string) {
  const createdKey = localDateKey(new Date(habit.created_at))
  const today = new Date(`${todayKey}T12:00:00`)
  let count = 0
  let offset = 0
  if (habit.days_of_week.includes(today.getDay()) && !completedKeys.has(`${habit.id}:${todayKey}`)) offset = -1
  for (; offset >= -365; offset -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() + offset)
    const dateKey = localDateKey(date)
    if (dateKey < createdKey) break
    if (!habit.days_of_week.includes(date.getDay())) continue
    if (!completedKeys.has(`${habit.id}:${dateKey}`)) break
    count += 1
  }
  return count
}

function DisciplineHabitDialog({ onClose, onSave }: {
  onClose: () => void
  onSave: (draft: DisciplineHabitDraft) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [minimumAction, setMinimumAction] = useState('')
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [cueTime, setCueTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState('')
  function toggleDay(day: number) {
    setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => a - b))
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (days.length === 0) {
      setFormError('Choose at least one day for this commitment.')
      return
    }
    setBusy(true)
    const saved = await onSave({ title, minimum_action: minimumAction, days_of_week: days, cue_time: cueTime })
    setBusy(false)
    if (saved) onClose()
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="task-modal discipline-modal" onSubmit={(event) => void submit(event)}>
    <div className="modal-heading"><div><span className="eyebrow"><ShieldCheck size={13} /> MAKE A PROMISE YOU CAN KEEP</span><h2>Create a commitment</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
    <p className="study-form-intro">Start with one or two habits. Pick a clear cue and define the smallest version that still counts.</p>
    <label>What will you practice?<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Read, stretch, review notes" maxLength={70} required /></label>
    <label>Your minimum version<input value={minimumAction} onChange={(event) => setMinimumAction(event.target.value)} placeholder="e.g. Read one page" maxLength={120} required /></label>
    <fieldset className="study-day-picker"><legend>Commit on</legend>{[['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0]].map(([label, day], index) => <button key={`${day}-${index}`} type="button" className={days.includes(Number(day)) ? 'study-day selected' : 'study-day'} aria-pressed={days.includes(Number(day))} onClick={() => toggleDay(Number(day))}>{label}</button>)}</fieldset>
    <label>Daily cue time <span className="optional-label">OPTIONAL</span><input type="time" value={cueTime} onChange={(event) => setCueTime(event.target.value)} /></label>
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <div className="study-form-tip"><Sparkles size={14} /><span>Attach it to a stable cue: “After breakfast, I’ll read one page.” The minimum action keeps the promise alive on difficult days.</span></div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Create commitment'} <ArrowRight size={16} /></button></div>
  </form></div>
}

function DashboardCharts({ tasks, weekStart }: { tasks: Task[]; weekStart: Date }) {
  const circumference = 2 * Math.PI * 47
  const completedCount = tasks.filter((task) => task.completed_at).length
  const remainingCount = tasks.length - completedCount
  const todayKey = localDateKey(new Date())
  const overdueCount = tasks.filter((task) =>
    !task.completed_at && task.due_at && localDateKey(new Date(task.due_at)) < todayKey,
  ).length
  const completionRate = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const completedArc = circumference * completionRate / 100
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + index)
    const key = localDateKey(date)
    return {
      key,
      label: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date),
      due: tasks.filter((task) => task.due_at && localDateKey(new Date(task.due_at)) === key).length,
      completed: tasks.filter((task) => task.completed_at && localDateKey(new Date(task.completed_at)) === key).length,
    }
  })
  const maxActivity = Math.max(1, ...days.flatMap((day) => [day.due, day.completed]))
  const dueThisWeek = days.reduce((total, day) => total + day.due, 0)
  const completedThisWeek = days.reduce((total, day) => total + day.completed, 0)
  return <section className="charts-grid" aria-label="Task charts">
    <article className="chart-card weekly-chart">
      <div className="chart-heading"><div><span className="chart-eyebrow">YOUR WEEK</span><h2>Tasks due &amp; completed</h2><p>Compare due dates with when you finish tasks.</p></div><span className="chart-period">SUN – SAT</span></div>
      <div className="weekly-chart-legend"><span><i className="legend-due" />Due</span><span><i className="legend-completed" />Completed</span></div>
      <svg className="weekly-chart-svg" viewBox="0 0 360 145" role="img" aria-label={`This week: ${dueThisWeek} tasks due, ${completedThisWeek} completed. ${days.map((day) => `${day.label}: ${day.due} due, ${day.completed} completed`).join('; ')}`}>
        {[24, 62, 100].map((y) => <line key={y} x1="20" x2="348" y1={y} y2={y} className="chart-grid-line" />)}
        {days.map((day, index) => {
          const x = 27 + index * 47
          const dueHeight = day.due ? Math.max((day.due / maxActivity) * 70, 4) : 0
          const completedHeight = day.completed ? Math.max((day.completed / maxActivity) * 70, 4) : 0
          const base = 100
          return <g key={day.key}>
            <title>{`${day.label}: ${day.due} due, ${day.completed} completed`}</title>
            {day.key === todayKey && <rect className="chart-today-highlight" x={x - 5} y="17" width="36" height="114" rx="8" />}
            {day.due > 0 && <rect className="chart-bar-due" x={x} y={base - dueHeight} width="11" height={dueHeight} rx="4" />}
            {day.completed > 0 && <rect className="chart-bar-completed" x={x + 14} y={base - completedHeight} width="11" height={completedHeight} rx="4" />}
            <text className={`chart-day-label ${day.key === todayKey ? 'today' : ''}`} x={x + 12} y="124" textAnchor="middle">{day.label}</text>
          </g>
        })}
      </svg>
      <div className="weekly-chart-summary"><span><strong>{dueThisWeek}</strong> due this week</span><span><strong>{completedThisWeek}</strong> completed this week</span></div>
    </article>
    <article className="chart-card completion-chart">
      <div className="chart-heading"><div><span className="chart-eyebrow">A LITTLE PROGRESS</span><h2>Task completion</h2><p>Your overall task balance.</p></div><span className="chart-period">ALL TASKS</span></div>
      <div className="completion-chart-body">
        <svg className="completion-donut" viewBox="0 0 120 120" role="img" aria-label={`${tasks.length} total tasks: ${completedCount} completed, ${remainingCount} left to do, including ${overdueCount} overdue${tasks.length ? `, ${completionRate}% complete` : ''}`}>
          <circle className="donut-track" cx="60" cy="60" r="47" />
          {tasks.length > 0 && <circle className="donut-completed" cx="60" cy="60" r="47" strokeDasharray={`${completedArc} ${circumference - completedArc}`} />}
          <text className="donut-value" x="60" y="58" textAnchor="middle">{tasks.length ? `${completionRate}%` : '—'}</text>
          <text className="donut-caption" x="60" y="73" textAnchor="middle">COMPLETE</text>
        </svg>
        <div className="completion-legend">
          <div className="completion-stat"><i className="legend-completed" /><span>Completed</span><strong>{completedCount}</strong></div>
          <div className="completion-stat"><i className="legend-remaining" /><span>Left to do</span><strong>{remainingCount}</strong></div>
          <div className="completion-stat overdue-stat"><i className="legend-overdue" /><span>Overdue</span><strong>{overdueCount}</strong></div>
          <p>{tasks.length ? `${tasks.length} total ${tasks.length === 1 ? 'task' : 'tasks'}. ${completedCount ? 'Every completed task counts—keep going at your own pace.' : 'Start with one small task.'}` : 'Add a task to start seeing your progress.'}</p>
        </div>
      </div>
    </article>
  </section>
}

function PeriodCard({ label, count, detail, selected, icon, onClick }: {
  label: string
  count: number
  detail: string
  selected: boolean
  icon: ReactNode
  onClick: () => void
}) {
  return <button className={`period-card ${selected ? 'selected' : ''}`} onClick={onClick} aria-pressed={selected}>
    <span className="period-card-icon">{icon}</span>
    <span className="period-card-copy"><span className="period-card-label">{label}</span><strong>{count}</strong><span className="period-card-detail">{detail}</span></span>
    <ArrowRight className="period-card-arrow" size={16} />
  </button>
}

function FocusTimerPanel({ task, studyReminder, duration, remaining, running, phase, breakAvailable, onSetMinutes, onToggle, onReset, onStartBreak, onOpenTask, onCompleteTask, onOpenStudy, onCompleteStudy, studyBusy, taskBusy, onAddTask, todayProgress, todayProgressLabel }: {
  task?: Task
  studyReminder?: StudyReminder
  duration: number
  remaining: number
  running: boolean
  phase: 'focus' | 'break'
  breakAvailable: boolean
  onSetMinutes: (minutes: number) => void
  onToggle: () => void
  onReset: () => void
  onStartBreak: () => void
  onOpenTask?: () => void
  onCompleteTask?: () => void
  onOpenStudy?: () => void
  onCompleteStudy?: () => void
  studyBusy: boolean
  taskBusy: boolean
  onAddTask: () => void
  todayProgress: number
  todayProgressLabel: string
}) {
  const timerDuration = phase === 'break' ? 5 * 60 : duration
  const circumference = 2 * Math.PI * 42
  const offset = circumference * (1 - (timerDuration - remaining) / timerDuration)
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0')
  const seconds = (remaining % 60).toString().padStart(2, '0')
  const focusTitle = task?.title ?? (studyReminder ? studyReminder.topic || studyReminder.subject : null)
  const focusDetails = task
    ? `${task.due_at ? `Due ${fullDate.format(new Date(task.due_at))}` : 'No due date'} · ${task.priority} priority. For this session, stay with this one thing.`
    : studyReminder
      ? `${studyReminder.subject} · A focused Pomodoro for this study session.`
      : null

  return <section className="focus-panel" aria-label="Focus timer">
    <div className="focus-copy">
      <span className="focus-kicker"><Sparkles size={13} /> {phase === 'break' ? 'REST AND RESET' : studyReminder ? 'STUDY FOCUS' : 'YOUR NEXT SMALL WIN'}</span>
      <h2>{focusTitle ?? 'Start with one small thing.'}</h2>
      <p>{phase === 'break' ? 'Step away from your screen, stretch, and come back when the timer ends.' : focusDetails ?? 'Choose a task below, or add one to begin a focused session.'}</p>
      {task ? <div className="focus-task-actions">
        <button className="focus-open-button" onClick={onOpenTask}>View task</button>
        {onCompleteTask && <button className="focus-done-button" onClick={onCompleteTask} disabled={taskBusy}><Check size={15} /> Mark done</button>}
      </div> : studyReminder ? <div className="focus-task-actions">
        <button className="focus-open-button" onClick={onOpenStudy}>View study schedule</button>
        {onCompleteStudy && <button className="focus-done-button" onClick={onCompleteStudy} disabled={studyBusy || isStudyReminderComplete(studyReminder, new Date())}><Check size={15} /> {isStudyReminderComplete(studyReminder, new Date()) ? 'Study complete' : 'Mark complete'}</button>}
      </div> : <button className="focus-done-button" onClick={onAddTask}><Plus size={15} /> Add a task</button>}
    </div>
    <div className="focus-timer">
      <div className="focus-clock" role="timer" aria-label={`${minutes} minutes and ${seconds} seconds remaining`}>
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle className="focus-clock-track" cx="50" cy="50" r="42" />
          <circle className="focus-clock-progress" cx="50" cy="50" r="42" strokeDasharray={circumference} strokeDashoffset={offset} />
        </svg>
        <strong>{minutes}:{seconds}</strong>
        <span>{phase === 'break' ? 'BREAK' : 'FOCUS'}</span>
      </div>
      <div className="focus-timer-tools">
        <div className="focus-presets" aria-label="Focus session length">
          {[15, 25, 50].map((minutesOption) => <button key={minutesOption} className={phase === 'focus' && duration === minutesOption * 60 ? 'selected' : ''} onClick={() => onSetMinutes(minutesOption)} disabled={running || phase === 'break'}>{minutesOption}m</button>)}
        </div>
        <div className="focus-timer-buttons">
          <button className="focus-timer-start" onClick={onToggle} disabled={(!task && !studyReminder) || (remaining === 0 && !running)} aria-label={running ? 'Pause timer' : 'Start timer'}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? 'Pause' : 'Start focus'}</button>
          <button className="focus-timer-reset" onClick={onReset} aria-label="Reset timer"><RotateCcw size={15} /></button>
        </div>
        {breakAvailable && <button className="focus-break-button" onClick={onStartBreak}><Timer size={14} /> Take a 5-minute break</button>}
        <span className="focus-nudge">{running ? 'One task. One session. You’ve got this.' : 'A small block of focus adds up.'}</span>
      </div>
    </div>
    <div className="focus-progress">
      <div className="focus-progress-label"><span>TODAY’S PROGRESS</span><strong>{todayProgressLabel}</strong></div>
      <div className="progress-track" role="progressbar" aria-label="Today's task completion" aria-valuenow={todayProgress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${todayProgress}%` }} /></div>
    </div>
    <span className="focus-orbit focus-orbit-one" /><span className="focus-orbit focus-orbit-two" />
  </section>
}

function TaskList({ tasks, filter, onToggle, onToggleSubtask, onEdit, onDelete, onFocus, busyId, onAdd }: {
  tasks: Task[]
  filter: Filter
  onToggle: (task: Task) => void
  onToggleSubtask: (task: Task, subtask: TaskSubtask) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onFocus: (task: Task) => void
  busyId: string
  onAdd: () => void
}) {
  if (!tasks.length) return <div className="empty-state"><div className="empty-icon"><CheckCheck size={23} /></div><h2>{filter === 'completed' ? 'Nothing checked off just yet.' : 'A little room to breathe.'}</h2><p>{filter === 'completed' ? 'Finished tasks will find a home here.' : 'No tasks match this view. Add one whenever you’re ready.'}</p>{filter !== 'completed' && <button className="button button-secondary" onClick={onAdd}><Plus size={16} /> Add your first task</button>}</div>
  return <div className="task-list-wrap">
    <TaskGroup
      title={filter === 'completed' ? 'DONE AND DUSTED' : filter === 'today' ? 'ON YOUR MIND TODAY' : filter === 'week' ? 'DUE THIS WEEK' : filter === 'month' ? 'DUE THIS MONTH' : 'YOUR TASKS'}
      tasks={tasks}
      completed={filter === 'completed'}
      onToggle={onToggle}
      onToggleSubtask={onToggleSubtask}
      onEdit={onEdit}
      onDelete={onDelete}
      onFocus={onFocus}
      busyId={busyId}
    />
  </div>
}

function TaskGroup({ title, tasks, completed, onToggle, onToggleSubtask, onEdit, onDelete, onFocus, busyId }: {
  title: string
  tasks: Task[]
  completed: boolean
  onToggle: (task: Task) => void
  onToggleSubtask: (task: Task, subtask: TaskSubtask) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  onFocus: (task: Task) => void
  busyId: string
}) {
  const taskCount = tasks.filter((task) => Boolean(task.completed_at) === completed).length
  const subtaskCount = tasks.reduce((count, task) => count + task.subtasks.length, 0)
  const count = taskCount + subtaskCount
  return <section className="task-group"><div className="group-heading"><span>{title}</span><span className="group-line" /><span className="group-count">{count}</span></div><div className="task-cards">
    {tasks.map((task) => <div className="task-list-item" key={task.id}>
      {Boolean(task.completed_at) === completed && <article className={`task-card ${completed ? 'is-completed' : ''}`}>
        <button className={`task-check ${completed ? 'checked' : ''}`} aria-label={completed ? `Mark ${task.title} active` : `Complete ${task.title}`} disabled={busyId === task.id} onClick={() => onToggle(task)}>{completed && <Check size={14} />}</button>
        <button className="task-main" onClick={() => onEdit(task)}><span className="task-title">{task.title}</span>{task.description && <span className="task-description">{task.description}</span>}{task.subtasks.length > 0 && <span className="task-description">{task.subtasks.filter((subtask) => subtask.completed_at).length}/{task.subtasks.length} subtasks complete</span>}<span className="task-meta">{task.due_at ? <span className="task-date"><CalendarDays size={13} />{shortDate.format(new Date(task.due_at))}{task.due_at.includes('T') && <> · {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(task.due_at))}</>}</span> : <span className="task-date no-date">No due date</span>}{task.category && <span className="category-chip">{task.category}</span>}</span></button>
        <span className={`priority-pill ${task.priority}`}><i />{task.priority}</span>
        {!completed ? <button className="task-focus-button" onClick={() => onFocus(task)} aria-label={`Focus on ${task.title}`}><Timer size={14} /><span>Focus</span></button> : <span className="task-focus-spacer" aria-hidden="true" />}
        <button className="delete-task" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} disabled={busyId === task.id}><X size={16} /></button>
      </article>}
      {task.subtasks.map((subtask) => <article className={`task-card subtask-task-card ${subtask.completed_at ? 'is-completed' : ''}`} key={subtask.id}>
        <button className={`task-check ${subtask.completed_at ? 'checked' : ''}`} aria-label={subtask.completed_at ? `Mark ${subtask.title} active` : `Complete ${subtask.title}`} disabled={busyId === `subtask:${subtask.id}`} onClick={() => onToggleSubtask(task, subtask)}>{subtask.completed_at && <Check size={14} />}</button>
        <button className="task-main" onClick={() => onEdit(task)}><span className="task-title">{subtask.title}</span><span className="subtask-parent-context"><span className="subtask-label">Subtask</span><span className="subtask-parent-name">of {task.title}</span></span><span className="task-meta">{subtask.due_at ? <span className="task-date"><CalendarDays size={13} />{shortDate.format(new Date(subtask.due_at))}{subtask.due_at.includes('T') && <> · {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(subtask.due_at))}</>}</span> : <span className="task-date no-date">No due date</span>}</span></button>
        <span className={`priority-pill ${task.priority}`}><i />{task.priority}</span>
        {!subtask.completed_at ? <button className="task-focus-button" onClick={() => onFocus(task)} aria-label={`Focus on ${subtask.title}`}><Timer size={14} /><span>Focus</span></button> : <span className="task-focus-spacer" aria-hidden="true" />}
        <span className="task-delete-spacer" aria-hidden="true" />
      </article>)}
    </div>)}
  </div></section>
}

function CalendarView({ tasks, studyReminders, month, setMonth, calendarView, setCalendarView, onAdd, onEdit, onOpenStudy }: {
  tasks: Task[]
  studyReminders: StudyReminder[]
  month: Date
  setMonth: (date: Date) => void
  calendarView: 'month' | 'week'
  setCalendarView: (view: 'month' | 'week') => void
  onAdd: (date: string) => void
  onEdit: (task: Task) => void
  onOpenStudy: () => void
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const sundayOffset = firstDay.getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((sundayOffset + daysInMonth) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - sundayOffset + 1
    return day > 0 && day <= daysInMonth ? new Date(year, monthIndex, day) : null
  })
  const itemsByDate = new Map<string, { key: string; title: string; completed: boolean; priority: Priority; task: Task; isSubtask: boolean; dueAt: string | null }[]>()
  function addCalendarItem(date: string, item: { key: string; title: string; completed: boolean; priority: Priority; task: Task; isSubtask: boolean; dueAt: string | null }) {
    const items = itemsByDate.get(date) ?? []
    items.push(item)
    itemsByDate.set(date, items)
  }
  tasks.forEach((task) => {
    if (task.due_at) {
      const key = localDateKey(new Date(task.due_at))
      addCalendarItem(key, { key: task.id, title: task.title, completed: Boolean(task.completed_at), priority: task.priority, task, isSubtask: false, dueAt: task.due_at })
    }
    task.subtasks.forEach((subtask) => {
      if (subtask.due_at) {
        const key = localDateKey(new Date(subtask.due_at))
        addCalendarItem(key, { key: subtask.id, title: subtask.title, completed: Boolean(subtask.completed_at), priority: task.priority, task, isSubtask: true, dueAt: subtask.due_at })
      }
    })
  })
  const todayKey = localDateKey(new Date())
  const weekStart = new Date(year, monthIndex, month.getDate() - month.getDay())
  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart)
    date.setDate(date.getDate() + index)
    return date
  })
  const weekEnd = weekDays[6]
  const weekTitle = weekStart.getMonth() === weekEnd.getMonth()
    ? `${new Intl.DateTimeFormat('en', { month: 'long' }).format(weekStart)} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(weekStart)} – ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(weekEnd)}`
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month)
  const title = calendarView === 'week' ? weekTitle : monthTitle
  const previousPeriod = () => setMonth(calendarView === 'week'
    ? new Date(year, monthIndex, month.getDate() - 7)
    : new Date(year, monthIndex - 1, 1))
  const nextPeriod = () => setMonth(calendarView === 'week'
    ? new Date(year, monthIndex, month.getDate() + 7)
    : new Date(year, monthIndex + 1, 1))
  const weekAgenda = weekDays.map((date) => {
    const key = localDateKey(date)
    const dayItems = [
      ...(itemsByDate.get(key) ?? []).map((item) => ({
        ...item,
        description: item.isSubtask ? item.task.title : item.task.category,
        isStudy: false,
      })),
      ...studyReminders.flatMap((reminder) => {
        const dateMatches = reminder.schedule_type === 'weekly'
          ? reminder.days_of_week.includes(date.getDay())
          : Boolean(reminder.remind_at && localDateKey(new Date(reminder.remind_at)) === key)
        if (!dateMatches) return []
        const dueAt = reminder.schedule_type === 'weekly'
          ? (() => {
              const [hours = '18', minutes = '0'] = (reminder.remind_time ?? '18:00').split(':')
              return new Date(date.getFullYear(), date.getMonth(), date.getDate(), Number(hours), Number(minutes)).toISOString()
            })()
          : reminder.remind_at
        return [{
          key: `study-${reminder.id}-${key}`,
          title: reminder.topic || reminder.subject,
          description: `${reminder.subject} · ${reminder.schedule_type === 'spaced' ? 'Spaced review' : 'Study session'}`,
          completed: false,
          priority: 'low' as Priority,
          dueAt,
          isSubtask: false,
          task: null,
          isStudy: true,
        }]
      }),
    ].sort((a, b) => {
      if (!a.dueAt || !b.dueAt) return a.dueAt ? 1 : b.dueAt ? -1 : a.title.localeCompare(b.title)
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
    })
    const lanes: number[] = []
    const timedItems = dayItems.filter((item) => item.dueAt && !(new Date(item.dueAt).getHours() === 0 && new Date(item.dueAt).getMinutes() === 0))
      .map((item) => {
        const dateTime = new Date(item.dueAt!)
        const start = dateTime.getHours() * 60 + dateTime.getMinutes()
        const availableLane = lanes.findIndex((laneEnd) => laneEnd <= start)
        const lane = availableLane < 0 ? lanes.length : availableLane
        lanes[lane] = start + 45
        return { ...item, start, lane }
      })
    const laneCount = Math.max(1, lanes.length)
    return {
      date,
      key,
      items: dayItems,
      allDayItems: dayItems.filter((item) => !item.dueAt || (new Date(item.dueAt).getHours() === 0 && new Date(item.dueAt).getMinutes() === 0)),
      timedItems: timedItems.map((item) => ({ ...item, laneCount })),
    }
  })

  return <section className="calendar-card">
    <div className="calendar-heading"><div><h2>{title}</h2><p>{calendarView === 'week' ? 'Your week, one task at a time.' : 'Your time, at a glance.'}</p></div><div className="calendar-heading-actions"><div className="calendar-period-switch" role="group" aria-label="Calendar period"><button className={calendarView === 'week' ? 'selected' : ''} onClick={() => setCalendarView('week')} aria-pressed={calendarView === 'week'}>Week</button><button className={calendarView === 'month' ? 'selected' : ''} onClick={() => setCalendarView('month')} aria-pressed={calendarView === 'month'}>Month</button></div><div className="calendar-controls"><button className="icon-button" aria-label={`Previous ${calendarView}`} onClick={previousPeriod}><ArrowLeft size={17} /></button><button className="today-button" onClick={() => setMonth(new Date())}>Today</button><button className="icon-button" aria-label={`Next ${calendarView}`} onClick={nextPeriod}><ArrowRight size={17} /></button></div></div></div>
    {calendarView === 'week' ? <div className="week-calendar-scroll"><div className="week-calendar">
      <div className="week-calendar-header">
        <div className="week-timezone">LOCAL TIME</div>
        {weekAgenda.map(({ date, key, items }) => <div className={`week-day-header ${key === todayKey ? 'today' : ''}`} key={key}>
          <span>{new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date)}</span>
          <strong>{date.getDate()}</strong>
          <small>{items.length} {items.length === 1 ? 'item' : 'items'}</small>
        </div>)}
      </div>
      <div className="week-all-day">
        <div className="week-all-day-label">all-day</div>
        {weekAgenda.map(({ date, key, allDayItems }) => <div className={`week-all-day-cell ${key === todayKey ? 'today' : ''}`} key={key}>
          {allDayItems.map((item) => <button key={item.key} className={`week-agenda-task ${item.isStudy ? 'study' : item.completed ? 'done' : item.priority}`} onClick={item.isStudy ? onOpenStudy : () => item.task && onEdit(item.task)} title={item.title}>{item.title}</button>)}
          <button className="week-agenda-add" aria-label={`Add task on ${fullDate.format(date)}`} onClick={() => onAdd(`${key}T09:00`)}><Plus size={13} /></button>
        </div>)}
      </div>
      <div className="week-time-grid">
        <div className="week-time-labels">{Array.from({ length: 24 }, (_, hour) => <span key={hour}>{hour === 0 ? '' : new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(2000, 0, 1, hour))}</span>)}</div>
        {weekAgenda.map(({ key, timedItems }) => <div className={`week-time-day ${key === todayKey ? 'today' : ''}`} key={key}>
          {timedItems.map((item) => {
            const time = new Date(item.dueAt!)
            return <button key={item.key} className={`week-agenda-task ${item.isStudy ? 'study' : item.completed ? 'done' : item.priority} ${item.isSubtask ? 'calendar-subtask' : ''}`} style={{ top: `${item.start / 60 * 56}px`, left: `calc(${item.lane * 100 / item.laneCount}% + 2px)`, width: `calc(${100 / item.laneCount}% - 4px)` }} onClick={item.isStudy ? onOpenStudy : () => item.task && onEdit(item.task)} title={item.description ? `${item.description} · ${item.title}` : item.title}>
              <span className="week-agenda-time">{new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(time)}</span>
              <span className="week-agenda-task-title">{item.isSubtask && <span aria-hidden="true">↳ </span>}{item.title}</span>
              {item.description && <span className="week-agenda-task-description">{item.description}</span>}
              {item.completed && <Check size={12} />}
            </button>
          })}
        </div>)}
      </div>
    </div></div> : <>
    <div className="calendar-grid calendar-weekdays">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day}>{day}</div>)}</div>
    <div className="calendar-grid calendar-days">{cells.map((date, index) => {
      if (!date) return <div className="calendar-cell outside" key={`empty-${index}`} />
      const key = localDateKey(date)
      const dayItems = itemsByDate.get(key) ?? []
      return <div className={`calendar-cell ${key === todayKey ? 'today-cell' : ''}`} key={key}>
        <div className="calendar-day-heading"><span className="calendar-day-number">{date.getDate()}</span><button aria-label={`Add task on ${fullDate.format(date)}`} onClick={() => onAdd(`${key}T09:00`)}><Plus size={14} /></button></div>
        <div className="calendar-day-tasks">{dayItems.slice(0, 3).map((item) => <button key={item.key} className={`calendar-task ${item.completed ? 'done' : item.priority} ${item.isSubtask ? 'calendar-subtask' : ''}`} title={item.isSubtask ? `${item.task.title} › ${item.title}` : item.title} onClick={() => onEdit(item.task)}>{item.completed && <Check size={11} />}{item.isSubtask && <span className="calendar-subtask-marker" aria-hidden="true">↳</span>}{item.title}</button>)}{dayItems.length > 3 && <span className="more-tasks">+{dayItems.length - 3} more</span>}</div>
      </div>
    })}</div>
    </>}
  </section>
}

function TaskDialog({ task, initialDate, onClose, onSave }: {
  task: Task | null
  initialDate: string
  onClose: () => void
  onSave: (draft: TaskDraft) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<TaskDraft>(() => task ? {
    title: task.title,
    description: task.description ?? '',
    due_at: task.due_at ? toLocalDateTimeInput(task.due_at) : '',
    priority: task.priority,
    category: task.category ?? '',
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      due_at: subtask.due_at ? toLocalDateTimeInput(subtask.due_at) : '',
      completed_at: subtask.completed_at,
    })),
  } : { ...emptyDraft, due_at: initialDate })
  const [busy, setBusy] = useState(false)

  function updateSubtask(id: string, updates: Partial<TaskSubtaskDraft>) {
    setDraft((current) => ({
      ...current,
      subtasks: current.subtasks.map((subtask) => subtask.id === id ? { ...subtask, ...updates } : subtask),
    }))
  }

  function addSubtask() {
    setDraft((current) => ({
      ...current,
      subtasks: [...current.subtasks, { id: crypto.randomUUID(), title: '', due_at: '', completed_at: null }],
    }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    const saved = await onSave(draft)
    setBusy(false)
    if (!saved) return
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="task-modal" onSubmit={submit}>
    <div className="modal-heading"><div><span className="eyebrow">{task ? 'MAKE IT YOURS' : 'ONE THING AT A TIME'}</span><h2>{task ? 'Edit your task' : 'Add a task'}</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
    <label>What’s on your mind?<input autoFocus value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="e.g. Call the dentist" maxLength={120} required /></label>
    <label>A few more details <span className="optional-label">OPTIONAL</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Add a note to future you…" rows={3} maxLength={1000} /></label>
    <div className="form-row"><label>When<input type="datetime-local" value={draft.due_at} onChange={(event) => setDraft({ ...draft, due_at: event.target.value })} /></label><label>Priority<select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as Priority })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
    <label>Category <span className="optional-label">OPTIONAL</span><input value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })} placeholder="Work, personal, errands…" maxLength={32} /></label>
    <section className="subtasks-editor" aria-label="Subtasks">
      <div className="subtasks-heading"><div><strong>Subtasks</strong><span className="optional-label">OPTIONAL</span></div><button type="button" className="subtask-add" onClick={addSubtask}><Plus size={14} /> Add subtask</button></div>
      {draft.subtasks.map((subtask) => <div className="subtask-row" key={subtask.id}>
        <input aria-label="Subtask title" value={subtask.title} onChange={(event) => updateSubtask(subtask.id, { title: event.target.value })} placeholder="What’s the next step?" maxLength={120} required />
        <input aria-label="Subtask due date" type="datetime-local" value={subtask.due_at} onChange={(event) => updateSubtask(subtask.id, { due_at: event.target.value })} />
        <button type="button" className={`subtask-check ${subtask.completed_at ? 'checked' : ''}`} aria-label={subtask.completed_at ? `Mark ${subtask.title || 'subtask'} incomplete` : `Complete ${subtask.title || 'subtask'}`} onClick={() => updateSubtask(subtask.id, { completed_at: subtask.completed_at ? null : new Date().toISOString() })}>{subtask.completed_at && <Check size={13} />}</button>
        <button type="button" className="subtask-remove" aria-label={`Remove ${subtask.title || 'subtask'}`} onClick={() => setDraft((current) => ({ ...current, subtasks: current.subtasks.filter((item) => item.id !== subtask.id) }))}><X size={15} /></button>
      </div>)}
    </section>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : task ? 'Save changes' : 'Add to my list'} <ArrowRight size={16} /></button></div>
  </form></div>
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function toLocalDateTimeInput(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export default App
