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
  LayoutList,
  LogOut,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react'
import { supabase } from './lib/supabase'
import type { Priority, StudyReminder, StudyReminderDraft, Task, TaskDraft } from './types'

const emptyDraft: TaskDraft = {
  title: '',
  description: '',
  due_at: '',
  priority: 'medium',
  category: '',
}

const fullDate = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
const shortDate = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

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
          <div><span>3</span><p>Run the tasks and study-reminders SQL migrations listed in <code>README.md</code> in your Supabase SQL Editor.</p></div>
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
type DashboardMode = 'tasks' | 'study'

function Dashboard({ client, session }: { client: SupabaseClient; session: Session }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [studyReminders, setStudyReminders] = useState<StudyReminder[]>([])
  const [loading, setLoading] = useState(true)
  const [studyLoading, setStudyLoading] = useState(true)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<DashboardMode>('tasks')
  const [filter, setFilter] = useState<Filter>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all')
  const [view, setView] = useState<View>('list')
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)
  const [initialDate, setInitialDate] = useState('')
  const [calendarMonth, setCalendarMonth] = useState(() => new Date())
  const [busyId, setBusyId] = useState('')
  const [completionMessage, setCompletionMessage] = useState('')
  const [studyDialogOpen, setStudyDialogOpen] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => typeof Notification !== 'undefined' && Notification.permission === 'granted')
  const notifiedReminderKeys = useRef(new Set<string>())
  const today = new Date()
  const todayKey = localDateKey(today)
  const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7))
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  const weekStartKey = localDateKey(weekStart)
  const weekEndKey = localDateKey(weekEnd)
  const monthStartKey = localDateKey(new Date(today.getFullYear(), today.getMonth(), 1))
  const monthEndKey = localDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 0))

  async function loadTasks() {
    setLoading(true)
    const { data, error: loadError } = await client.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false })
    if (loadError) setError(`Could not load tasks: ${loadError.message}`)
    else {
      setTasks(data as Task[])
      setError('')
    }
    setLoading(false)
  }

  async function loadStudyReminders() {
    setStudyLoading(true)
    const { data, error: loadError } = await client.from('study_reminders').select('*').order('created_at', { ascending: false })
    if (loadError) setError(`Could not load study reminders: ${loadError.message}`)
    else {
      setStudyReminders(data as StudyReminder[])
      setError('')
    }
    setStudyLoading(false)
  }

  useEffect(() => {
    void loadTasks()
    void loadStudyReminders()
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
    if (!notificationsEnabled || !studyReminders.some((reminder) => reminder.enabled) || !('Notification' in window)) return

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
        const scheduledDate = reminder.remind_at ? new Date(reminder.remind_at) : null
        const scheduledTime = reminder.remind_time?.slice(0, 5) ?? '23:59'
        const isDue = isOneTime
          ? Boolean(scheduledDate && scheduledDate.getTime() <= now.getTime())
          : reminder.days_of_week.includes(now.getDay()) && scheduledTime <= currentTime
        const notificationKey = `${reminder.id}:${today}`
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
    }

    checkReminder()
    const intervalId = window.setInterval(checkReminder, 15_000)
    return () => window.clearInterval(intervalId)
  }, [notificationsEnabled, studyReminders, session.user.id, client])

  async function saveStudyReminder(draft: StudyReminderDraft) {
    const schedule = draft.schedule_type === 'once'
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
    const { error: saveError } = await client.from('study_reminders').insert({
      user_id: session.user.id,
      subject: draft.subject.trim(),
      topic: draft.topic.trim(),
      schedule_type: draft.schedule_type,
      ...schedule,
    })
    if (saveError) {
      setError(`Could not save study reminder: ${saveError.message}`)
      return false
    }
    setError('')
    await loadStudyReminders()
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

  async function deleteStudyReminder(reminder: StudyReminder) {
    if (!window.confirm(`Delete your ${reminder.subject} study reminder? This can't be undone.`)) return
    const { error: deleteError } = await client.from('study_reminders').delete().eq('id', reminder.id)
    if (deleteError) setError(`Could not delete study reminder: ${deleteError.message}`)
    else {
      setError('')
      await loadStudyReminders()
    }
  }

  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const dueDate = task.due_at ? localDateKey(new Date(task.due_at)) : ''
    const matchesStatus = filter === 'completed'
      ? Boolean(task.completed_at)
      : !task.completed_at && (filter === 'all'
        || (filter === 'today' && dueDate === todayKey)
        || (filter === 'week' && dueDate >= weekStartKey && dueDate <= weekEndKey)
        || (filter === 'month' && dueDate >= monthStartKey && dueDate <= monthEndKey))
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter
    const searchText = `${task.title} ${task.description} ${task.category}`.toLowerCase()
    return matchesStatus && matchesPriority && searchText.includes(query.toLowerCase())
  }), [tasks, filter, priorityFilter, query, todayKey, weekStartKey, weekEndKey, monthStartKey, monthEndKey])

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
    await loadTasks()
    setDialogOpen(false)
    setEditing(null)
    setInitialDate('')
    return true
  }

  async function toggleTask(task: Task) {
    setBusyId(task.id)
    setError('')
    const { error: updateError } = await client.from('tasks').update({ completed_at: task.completed_at ? null : new Date().toISOString() }).eq('id', task.id)
    if (updateError) setError(`Could not update task: ${updateError.message}`)
    else {
      if (!task.completed_at) {
        const messages = ['That’s one more thing off your mind. Nice work!', 'You did it. Take a second to enjoy that.', 'A little progress adds up. Well done!', 'Look at you, following through.']
        setCompletionMessage(messages[Math.floor(Math.random() * messages.length)])
      } else {
        setCompletionMessage('Back on your list. Pick it up when you’re ready.')
      }
      await loadTasks()
    }
    setBusyId('')
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return
    setBusyId(task.id)
    setError('')
    const { error: deleteError } = await client.from('tasks').delete().eq('id', task.id)
    if (deleteError) setError(`Could not delete task: ${deleteError.message}`)
    else await loadTasks()
    setBusyId('')
  }

  function openNewTask(date = '') {
    setEditing(null)
    setInitialDate(date)
    setDialogOpen(true)
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

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a>
        <div className="sidebar-label">YOUR SPACE</div>
        <nav className="side-nav">
          <button className={mode === 'tasks' && filter === 'all' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('all') }}><LayoutList size={18} /><span>All tasks</span><span className="nav-count">{pendingCount}</span></button>
          <button className={mode === 'tasks' && filter === 'today' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('today') }}><Clock3 size={18} /><span>Today</span><span className="nav-count">{todayCount}</span></button>
          <button className={mode === 'tasks' && filter === 'week' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('week') }}><CalendarDays size={18} /><span>This week</span><span className="nav-count">{weekTasks.length}</span></button>
          <button className={mode === 'tasks' && filter === 'month' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('month') }}><CalendarDays size={18} /><span>This month</span><span className="nav-count">{monthTasks.length}</span></button>
          <button className={mode === 'tasks' && filter === 'completed' ? 'nav-item active' : 'nav-item'} onClick={() => { setMode('tasks'); setFilter('completed') }}><CheckCheck size={18} /><span>Completed</span>{completedCount > 0 && <span className="nav-count">{completedCount}</span>}</button>
          <button className={mode === 'study' ? 'nav-item active' : 'nav-item'} onClick={() => setMode('study')}><BookOpen size={18} /><span>Study reminders</span>{activeStudyReminders.length > 0 && <span className="nav-count">{activeStudyReminders.length}</span>}</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-quote"><Sparkles size={15} /><p>Progress, not perfection. You're doing just fine.</p></div>
          <button className="account-button" onClick={() => void client.auth.signOut()}><span className="account-avatar">{session.user.email?.[0]?.toUpperCase() ?? 'Y'}</span><span className="account-email">{session.user.email}</span><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="mobile-brand"><a className="brand" href="#"><span className="brand-mark"><Check size={18} /></span> daymark</a><div className="mobile-actions"><button aria-label="Study reminders" className={`icon-button ${mode === 'study' ? 'selected' : ''}`} onClick={() => setMode(mode === 'study' ? 'tasks' : 'study')}><BookOpen size={17} /></button><button aria-label="Sign out" className="icon-button" onClick={() => void client.auth.signOut()}><LogOut size={17} /></button></div></div>
          <div className="breadcrumb"><span>My space</span><span className="breadcrumb-slash">/</span><strong>{mode === 'study' ? 'Study reminders' : view === 'calendar' ? 'Calendar' : filterTitle}</strong></div>
          <div className="topbar-date">{fullDate.format(today)}</div>
        </header>

        <section className="page-content">
          {error && <div className="error-banner" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={16} /></button></div>}
          {mode === 'study' ? <StudyDashboard
            reminders={studyReminders}
            subjects={subjects}
            loading={studyLoading}
            notificationsSupported={'Notification' in window}
            notificationPermission={('Notification' in window) ? Notification.permission : 'unsupported'}
            notificationsEnabled={notificationsEnabled}
            onEnableNotifications={() => void enableStudyNotifications()}
            onAdd={() => setStudyDialogOpen(true)}
            onToggle={(reminder) => void toggleStudyReminder(reminder)}
            onDelete={(reminder) => void deleteStudyReminder(reminder)}
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

          {filter !== 'completed' && <section className="focus-panel" aria-label="Your next step">
            <div className="focus-copy">
              <span className="focus-kicker"><Sparkles size={13} /> YOUR NEXT SMALL WIN</span>
              <h2>{focusTask ? focusTask.title : todayTasks.length ? 'You showed up for yourself today.' : 'Start with one small thing.'}</h2>
              <p>{focusTask ? `${focusTask.due_at ? `Due ${fullDate.format(new Date(focusTask.due_at))}` : 'No due date'} · ${focusTask.priority} priority. You’ve got this.` : todayTasks.length ? 'Your list is clear. Take a well-earned breath.' : 'Pick one task, and make the rest of the day a little lighter.'}</p>
            </div>
            {focusTask
              ? <div className="focus-actions"><button className="focus-done-button" onClick={() => void toggleTask(focusTask)} disabled={busyId === focusTask.id}><Check size={16} /> Mark done</button><button className="focus-open-button" onClick={() => { setEditing(focusTask); setDialogOpen(true) }}>View task</button></div>
              : !todayTasks.length && <button className="focus-done-button" onClick={() => openNewTask()}><Plus size={16} /> Add a task</button>}
            <div className="focus-progress">
              <div className="focus-progress-label"><span>TODAY’S PROGRESS</span><strong>{todayTasks.length ? `${todayCompleted} of ${todayTasks.length} done` : 'Every small step counts'}</strong></div>
              <div className="progress-track" role="progressbar" aria-label="Today's task completion" aria-valuenow={todayProgress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${todayProgress}%` }} /></div>
            </div>
            <span className="focus-orbit focus-orbit-one" /><span className="focus-orbit focus-orbit-two" />
          </section>}

          {!loading && <DashboardCharts tasks={tasks} weekStart={weekStart} />}

          <div className="toolbar">
            <div className="view-switch"><button className={view === 'list' ? 'view-tab selected' : 'view-tab'} onClick={() => setView('list')}><LayoutList size={16} /> List</button><button className={view === 'calendar' ? 'view-tab selected' : 'view-tab'} onClick={() => setView('calendar')}><CalendarDays size={16} /> Calendar</button></div>
            <label className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks…" /></label>
            <label className="priority-select"><SlidersHorizontal size={15} /><select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as 'all' | Priority)} aria-label="Filter by priority"><option value="all">All priorities</option><option value="high">High priority</option><option value="medium">Medium priority</option><option value="low">Low priority</option></select><ChevronDown size={14} /></label>
          </div>

          {completionMessage && <div className="completion-toast" role="status"><span className="toast-check"><Check size={15} /></span>{completionMessage}<button onClick={() => setCompletionMessage('')} aria-label="Dismiss message"><X size={15} /></button></div>}

          {loading ? <div className="loading-state"><span className="loader" /> Gathering your tasks…</div> : view === 'calendar'
            ? <CalendarView tasks={filteredTasks} month={calendarMonth} setMonth={setCalendarMonth} onAdd={openNewTask} onEdit={(task) => { setEditing(task); setDialogOpen(true) }} />
            : <TaskList tasks={filteredTasks} filter={filter} onToggle={toggleTask} onEdit={(task) => { setEditing(task); setDialogOpen(true) }} onDelete={deleteTask} busyId={busyId} onAdd={() => openNewTask()} />}
          </>}
        </section>
      </main>
      {dialogOpen && <TaskDialog task={editing} initialDate={initialDate} onClose={() => { setDialogOpen(false); setEditing(null); setInitialDate('') }} onSave={saveTask} />}
      {studyDialogOpen && <StudyReminderDialog onClose={() => setStudyDialogOpen(false)} onSave={saveStudyReminder} />}
    </div>
  )
}

function StudyDashboard({ reminders, subjects, loading, notificationsSupported, notificationPermission, notificationsEnabled, onEnableNotifications, onAdd, onToggle, onDelete }: {
  reminders: StudyReminder[]
  subjects: string[]
  loading: boolean
  notificationsSupported: boolean
  notificationPermission: NotificationPermission | 'unsupported'
  notificationsEnabled: boolean
  onEnableNotifications: () => void
  onAdd: () => void
  onToggle: (reminder: StudyReminder) => void
  onDelete: (reminder: StudyReminder) => void
}) {
  const activeReminders = reminders.filter((reminder) => reminder.enabled)
  const dueCount = activeReminders.filter((reminder) => isReminderDue(reminder, new Date())).length
  const nextReminder = activeReminders
    .map((reminder) => ({ reminder, next: getNextReminderDate(reminder, new Date()) }))
    .filter((entry): entry is { reminder: StudyReminder; next: Date } => entry.next !== null)
    .sort((a, b) => a.next.getTime() - b.next.getTime())[0]

  return <div className="study-page">
    <div className="welcome-row study-welcome">
      <div><span className="eyebrow"><BellRing size={14} /> BUILD A STUDY ROUTINE</span><h1>Study reminders.</h1><p>Schedule regular study sessions for each class. Small, steady reviews help knowledge stick.</p></div>
      <button className="button button-primary add-task-button" onClick={onAdd}><Plus size={18} /> Schedule study</button>
    </div>

    <section className="study-stats" aria-label="Study reminder overview">
      <article className="study-stat-card due"><span className="study-stat-icon"><Bell size={17} /></span><span className="study-stat-label">SESSIONS DUE TODAY</span><strong>{dueCount}</strong><span>{dueCount === 1 ? 'session to keep on track' : 'sessions to keep on track'}</span></article>
      <article className="study-stat-card"><span className="study-stat-icon"><BookOpen size={17} /></span><span className="study-stat-label">YOUR CLASSES</span><strong>{subjects.length}</strong><span>{subjects.length === 1 ? 'class to stay on top of' : 'classes to stay on top of'}</span></article>
      <article className="study-stat-card"><span className="study-stat-icon"><Clock3 size={17} /></span><span className="study-stat-label">UP NEXT</span><strong className="study-next-time">{nextReminder ? new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(nextReminder.next) : '—'}</strong><span>{nextReminder?.reminder.subject ?? 'Schedule a session to begin'}</span></article>
    </section>

    <section className="study-how"><span className="study-how-icon"><Sparkles size={16} /></span><p><strong>Make it stick:</strong> Set a short study session for each class and spread sessions across the week. Come back to important material after a day, a few days, and then a week instead of cramming everything at once.</p></section>

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
      <div className="study-section-heading"><div><span className="chart-eyebrow">YOUR ROUTINE</span><h2>Upcoming study sessions</h2><p>One-time plans and weekly reminders for your classes.</p></div><span className="study-library-count">{activeReminders.length} active</span></div>
      {loading ? <div className="study-empty"><span className="loader" /> Loading your study schedule…</div>
        : reminders.length ? <div className="study-library-list">{reminders.map((reminder) => <StudyReminderRow key={reminder.id} reminder={reminder} onToggle={() => onToggle(reminder)} onDelete={() => onDelete(reminder)} />)}</div>
          : <div className="study-empty"><span className="study-empty-icon"><BookOpen size={21} /></span><h3>Give your classes a place in your week.</h3><p>Schedule a one-time study session or set a weekly reminder for each class. Your plans will stay here across devices.</p><button className="button button-secondary" onClick={onAdd}><Plus size={16} /> Schedule your first study session</button></div>}
    </section>
  </div>
}

function StudyReminderRow({ reminder, onToggle, onDelete }: { reminder: StudyReminder; onToggle: () => void; onDelete: () => void }) {
  const schedule = reminder.schedule_type === 'once' && reminder.remind_at
    ? new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(reminder.remind_at))
    : `${reminder.days_of_week.map((day) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]).join(', ')} · ${formatTime(reminder.remind_time ?? '18:00')}`
  return <article className={`study-library-item ${reminder.enabled ? '' : 'reminder-paused'}`}>
    <span className="study-reminder-row-icon"><BookOpen size={16} /></span>
    <div className="study-reminder-row-main"><span className="study-subject-chip">{reminder.subject}</span><strong>{reminder.topic || 'Study session'}</strong><span className="study-library-schedule">{reminder.schedule_type === 'weekly' ? 'Weekly' : 'One time'} · {schedule}</span></div>
    <button className={`reminder-toggle ${reminder.enabled ? 'on' : ''}`} onClick={onToggle} aria-label={`${reminder.enabled ? 'Pause' : 'Resume'} ${reminder.subject} study reminder`} aria-pressed={reminder.enabled}><span /></button>
    <button className="delete-study-reminder" aria-label={`Delete ${reminder.subject} study reminder`} onClick={onDelete}><X size={16} /></button>
  </article>
}

function StudyReminderDialog({ onClose, onSave }: {
  onClose: () => void
  onSave: (draft: StudyReminderDraft) => Promise<boolean>
}) {
  const [scheduleType, setScheduleType] = useState<'once' | 'weekly'>('weekly')
  const [subject, setSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [date, setDate] = useState(localDateKey(new Date()))
  const [time, setTime] = useState('18:00')
  const [days, setDays] = useState<number[]>([1, 3, 5])
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
    if (scheduleType === 'once' && new Date(`${date}T${time}`).getTime() <= Date.now()) {
      setFormError('Choose a study time in the future.')
      return
    }
    setFormError('')
    setBusy(true)
    const saved = await onSave({ subject, topic, schedule_type: scheduleType, date, time, days_of_week: days })
    setBusy(false)
    if (saved) onClose()
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="task-modal study-reminder-modal" onSubmit={(event) => void submit(event)}>
    <div className="modal-heading"><div><span className="eyebrow"><BellRing size={13} /> MAKE TIME TO REMEMBER</span><h2>Schedule study time</h2></div><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button></div>
    <p className="study-form-intro">Plan focused study sessions for your classes. Pick a one-time session or a weekly routine.</p>
    <label>Class or subject<input autoFocus value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="e.g. Biology, World History" maxLength={60} required /></label>
    <label>What will you study? <span className="optional-label">OPTIONAL</span><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="e.g. Review chapter 4 for Friday’s quiz" maxLength={160} /></label>
    <label>Repeat<select value={scheduleType} onChange={(event) => setScheduleType(event.target.value as 'once' | 'weekly')}><option value="weekly">Every week</option><option value="once">One time</option></select></label>
    {scheduleType === 'weekly' && <fieldset className="study-day-picker"><legend>Study on</legend>{[['M', 1], ['T', 2], ['W', 3], ['T', 4], ['F', 5], ['S', 6], ['S', 0]].map(([label, day], index) => <button key={`${day}-${index}`} type="button" className={days.includes(Number(day)) ? 'study-day selected' : 'study-day'} aria-pressed={days.includes(Number(day))} onClick={() => toggleDay(Number(day))}>{label}</button>)}</fieldset>}
    {scheduleType === 'weekly'
      ? <label>Reminder time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
      : <div className="form-row"><label>Date<input type="date" min={localDateKey(new Date())} value={date} onChange={(event) => setDate(event.target.value)} required /></label><label>Time<input type="time" value={time} onChange={(event) => setTime(event.target.value)} required /></label></div>}
    {formError && <p className="form-error" role="alert">{formError}</p>}
    <div className="study-form-tip"><Sparkles size={14} /><span>Short, repeated sessions are easier to stick with than last-minute cramming.</span></div>
    <div className="modal-actions"><button type="button" className="button button-quiet" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : 'Save study reminder'} <ArrowRight size={16} /></button></div>
  </form></div>
}

function formatTime(value: string) {
  const [hours = '0', minutes = '00'] = value.split(':')
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, Number(hours), Number(minutes)))
}

function isReminderDue(reminder: StudyReminder, now: Date) {
  if (!reminder.enabled) return false
  if (reminder.schedule_type === 'once') return Boolean(reminder.remind_at && new Date(reminder.remind_at).getTime() <= now.getTime())
  const time = reminder.remind_time?.slice(0, 5) ?? '23:59'
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return reminder.days_of_week.includes(now.getDay()) && currentTime >= time
}

function getNextReminderDate(reminder: StudyReminder, now: Date): Date | null {
  if (!reminder.enabled) return null
  if (reminder.schedule_type === 'once') {
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
      added: tasks.filter((task) => localDateKey(new Date(task.created_at)) === key).length,
      completed: tasks.filter((task) => task.completed_at && localDateKey(new Date(task.completed_at)) === key).length,
    }
  })
  const maxActivity = Math.max(1, ...days.flatMap((day) => [day.added, day.completed]))
  const addedThisWeek = days.reduce((total, day) => total + day.added, 0)
  const completedThisWeek = days.reduce((total, day) => total + day.completed, 0)
  return <section className="charts-grid" aria-label="Task charts">
    <article className="chart-card weekly-chart">
      <div className="chart-heading"><div><span className="chart-eyebrow">YOUR WEEK</span><h2>Tasks added &amp; completed</h2><p>See your progress, one day at a time.</p></div><span className="chart-period">MON – SUN</span></div>
      <div className="weekly-chart-legend"><span><i className="legend-added" />Added</span><span><i className="legend-completed" />Completed</span></div>
      <svg className="weekly-chart-svg" viewBox="0 0 360 145" role="img" aria-label={`This week: ${addedThisWeek} tasks added, ${completedThisWeek} completed. ${days.map((day) => `${day.label}: ${day.added} added, ${day.completed} completed`).join('; ')}`}>
        {[24, 62, 100].map((y) => <line key={y} x1="20" x2="348" y1={y} y2={y} className="chart-grid-line" />)}
        {days.map((day, index) => {
          const x = 27 + index * 47
          const addedHeight = day.added ? Math.max((day.added / maxActivity) * 70, 4) : 0
          const completedHeight = day.completed ? Math.max((day.completed / maxActivity) * 70, 4) : 0
          const base = 100
          return <g key={day.key}>
            <title>{`${day.label}: ${day.added} added, ${day.completed} completed`}</title>
            {day.key === todayKey && <rect className="chart-today-highlight" x={x - 5} y="17" width="36" height="114" rx="8" />}
            {day.added > 0 && <rect className="chart-bar-added" x={x} y={base - addedHeight} width="11" height={addedHeight} rx="4" />}
            {day.completed > 0 && <rect className="chart-bar-completed" x={x + 14} y={base - completedHeight} width="11" height={completedHeight} rx="4" />}
            <text className={`chart-day-label ${day.key === todayKey ? 'today' : ''}`} x={x + 12} y="124" textAnchor="middle">{day.label}</text>
          </g>
        })}
      </svg>
      <div className="weekly-chart-summary"><span><strong>{addedThisWeek}</strong> added this week</span><span><strong>{completedThisWeek}</strong> completed this week</span></div>
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

function TaskList({ tasks, filter, onToggle, onEdit, onDelete, busyId, onAdd }: {
  tasks: Task[]
  filter: Filter
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  busyId: string
  onAdd: () => void
}) {
  const active = tasks.filter((task) => !task.completed_at)
  const completed = tasks.filter((task) => task.completed_at)
  if (!tasks.length) return <div className="empty-state"><div className="empty-icon"><CheckCheck size={23} /></div><h2>{filter === 'completed' ? 'Nothing checked off just yet.' : 'A little room to breathe.'}</h2><p>{filter === 'completed' ? 'Finished tasks will find a home here.' : 'No tasks match this view. Add one whenever you’re ready.'}</p>{filter !== 'completed' && <button className="button button-secondary" onClick={onAdd}><Plus size={16} /> Add your first task</button>}</div>
  return <div className="task-list-wrap">
    {active.length > 0 && <TaskGroup title={filter === 'today' ? 'ON YOUR MIND TODAY' : filter === 'week' ? 'DUE THIS WEEK' : filter === 'month' ? 'DUE THIS MONTH' : 'YOUR TASKS'} tasks={active} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busyId={busyId} />}
    {completed.length > 0 && <TaskGroup title="DONE AND DUSTED" tasks={completed} onToggle={onToggle} onEdit={onEdit} onDelete={onDelete} busyId={busyId} />}
  </div>
}

function TaskGroup({ title, tasks, onToggle, onEdit, onDelete, busyId }: {
  title: string
  tasks: Task[]
  onToggle: (task: Task) => void
  onEdit: (task: Task) => void
  onDelete: (task: Task) => void
  busyId: string
}) {
  return <section className="task-group"><div className="group-heading"><span>{title}</span><span className="group-line" /><span className="group-count">{tasks.length}</span></div><div className="task-cards">
    {tasks.map((task) => <article className={`task-card ${task.completed_at ? 'is-completed' : ''}`} key={task.id}>
      <button className={`task-check ${task.completed_at ? 'checked' : ''}`} aria-label={task.completed_at ? `Mark ${task.title} active` : `Complete ${task.title}`} disabled={busyId === task.id} onClick={() => onToggle(task)}>{task.completed_at && <Check size={14} />}</button>
      <button className="task-main" onClick={() => onEdit(task)}><span className="task-title">{task.title}</span>{task.description && <span className="task-description">{task.description}</span>}<span className="task-meta">{task.due_at ? <span className="task-date"><CalendarDays size={13} />{shortDate.format(new Date(task.due_at))}{task.due_at.includes('T') && <> · {new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date(task.due_at))}</>}</span> : <span className="task-date no-date">No due date</span>}{task.category && <span className="category-chip">{task.category}</span>}</span></button>
      <span className={`priority-pill ${task.priority}`}><i />{task.priority}</span>
      <button className="delete-task" onClick={() => onDelete(task)} aria-label={`Delete ${task.title}`} disabled={busyId === task.id}><X size={16} /></button>
    </article>)}
  </div></section>
}

function CalendarView({ tasks, month, setMonth, onAdd, onEdit }: {
  tasks: Task[]
  month: Date
  setMonth: (date: Date) => void
  onAdd: (date: string) => void
  onEdit: (task: Task) => void
}) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1)
  const mondayOffset = (firstDay.getDay() + 6) % 7
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7
  const cells = Array.from({ length: cellCount }, (_, index) => {
    const day = index - mondayOffset + 1
    return day > 0 && day <= daysInMonth ? new Date(year, monthIndex, day) : null
  })
  const tasksByDate = new Map<string, Task[]>()
  tasks.forEach((task) => {
    if (task.due_at) {
      const key = localDateKey(new Date(task.due_at))
      tasksByDate.set(key, [...(tasksByDate.get(key) ?? []), task])
    }
  })
  const todayKey = localDateKey(new Date())
  const monthTitle = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(month)

  return <section className="calendar-card">
    <div className="calendar-heading"><div><h2>{monthTitle}</h2><p>Your time, at a glance.</p></div><div className="calendar-controls"><button className="icon-button" aria-label="Previous month" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))}><ArrowLeft size={17} /></button><button className="today-button" onClick={() => setMonth(new Date())}>Today</button><button className="icon-button" aria-label="Next month" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))}><ArrowRight size={17} /></button></div></div>
    <div className="calendar-grid calendar-weekdays">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day}>{day}</div>)}</div>
    <div className="calendar-grid calendar-days">{cells.map((date, index) => {
      if (!date) return <div className="calendar-cell outside" key={`empty-${index}`} />
      const key = localDateKey(date)
      const dayTasks = tasksByDate.get(key) ?? []
      return <div className={`calendar-cell ${key === todayKey ? 'today-cell' : ''}`} key={key}>
        <div className="calendar-day-heading"><span className="calendar-day-number">{date.getDate()}</span><button aria-label={`Add task on ${fullDate.format(date)}`} onClick={() => onAdd(`${key}T09:00`)}><Plus size={14} /></button></div>
        <div className="calendar-day-tasks">{dayTasks.slice(0, 3).map((task) => <button key={task.id} className={`calendar-task ${task.completed_at ? 'done' : task.priority}`} title={task.title} onClick={() => onEdit(task)}>{task.completed_at && <Check size={11} />}{task.title}</button>)}{dayTasks.length > 3 && <span className="more-tasks">+{dayTasks.length - 3} more</span>}</div>
      </div>
    })}</div>
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
  } : { ...emptyDraft, due_at: initialDate })
  const [busy, setBusy] = useState(false)

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
