import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const modalRef = useRef<HTMLElement | null>(null)
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const modal = modalRef.current
    const getFocusable = () => [...(modal?.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
    ) ?? [])]
    getFocusable()[0]?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const focusable = getFocusable()
      if (!focusable.length) {
        event.preventDefault()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1)
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [])

  return <div className="sp-modal-backdrop" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section ref={modalRef} className="sp-modal" role="dialog" aria-modal="true" aria-labelledby="sp-modal-title" tabIndex={-1}>
      <header><h2 id="sp-modal-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={16} /></button></header>
      {children}
    </section>
  </div>
}

function TopicEditor({ topic, subjects, busy, onCancel, onCreateSubject, onSave }: {
  topic: StudyTopic | null
  subjects: StudySubject[]
  busy: boolean
  onCancel: () => void
  onCreateSubject: () => void
  onSave: (draft: TopicDraft) => Promise<boolean>
}) {
  const [title, setTitle] = useState(topic?.title ?? '')
  const [subjectId, setSubjectId] = useState(topic?.subject_id ?? subjects[0]?.id ?? '')
  const [repeatDays, setRepeatDays] = useState(topic?.repeat_weekdays ?? [])
  const [spacedRepetition, setSpacedRepetition] = useState(topic?.spaced_repetition ?? false)
  const [anytime, setAnytime] = useState(topic?.anytime_today ?? false)
  const [startDate, setStartDate] = useState(topic?.start_date ?? today())
  const [startTime, setStartTime] = useState(topic?.start_time?.slice(0, 5) ?? '18:00')
  const [duration, setDuration] = useState(topic?.duration_minutes ?? subjects[0]?.default_duration_minutes ?? 45)
  const [goal, setGoal] = useState(topic?.goal ?? '')
  const [firstStep, setFirstStep] = useState(topic?.first_step ?? '')
  const [materialsUrl, setMaterialsUrl] = useState(topic?.materials_url ?? '')
  const toggleDay = (day: number) => setRepeatDays((days) =>
    days.includes(day) ? days.filter((value) => value !== day) : [...days, day].sort((a, b) => a - b))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!subjectId || !title.trim()) return
    await onSave({
      subject_id: subjectId,
      title: title.trim(),
      repeat_weekdays: repeatDays,
      spaced_repetition: spacedRepetition,
      anytime_today: anytime,
      start_date: startDate,
      start_time: anytime ? null : startTime,
      duration_minutes: duration,
      goal: goal.trim(),
      first_step: firstStep.trim(),
      materials_url: materialsUrl.trim(),
      next_due_date: topic?.next_due_date ?? (spacedRepetition ? startDate : null),
      skip_until: topic?.skip_until ?? null,
    })
  }

  return <Modal title={topic?.id ? 'Edit study topic' : 'Add study topic'} onClose={onCancel}>
    {!subjects.length ? <div className="sp-empty"><p>Create a subject first; topics are always attached to a real subject.</p><button className="button button-primary" onClick={onCreateSubject}><Plus size={14} /> Create subject</button></div> :
      <form className="sp-form" onSubmit={(event) => void submit(event)}>
        <label>Topic<input autoFocus required value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Derivatives practice" /></label>
        <label>Subject<select value={subjectId} onChange={(event) => {
          setSubjectId(event.target.value)
          const subject = subjects.find((item) => item.id === event.target.value)
          if (subject && !topic) setDuration(subject.default_duration_minutes)
        }}>{subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label>
        <fieldset><legend>Repeat</legend><p className="sp-field-hint">Choose days for a weekly study session, or leave these unchecked for never.</p><div className="sp-weekday-select">{weekdayNames.map((day, index) => <label key={day}><input type="checkbox" checked={repeatDays.includes(index)} onChange={() => toggleDay(index)} />{day}</label>)}</div></fieldset>
        <label className="sp-checkbox"><input type="checkbox" checked={spacedRepetition} onChange={(event) => setSpacedRepetition(event.target.checked)} /> Spaced repetition <small>Reviews follow your recall ratings; this is separate from weekly repeat.</small></label>
        <div className="sp-form-grid">
          <label>First date<input type="date" required value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label>
          <label>Duration (minutes)<input type="number" min="5" max="720" step="5" required value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
          {!anytime && <label>Start time<input type="time" required value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>}
          <label className="sp-checkbox"><input type="checkbox" checked={anytime} onChange={(event) => setAnytime(event.target.checked)} /> Anytime today</label>
        </div>
        <label>Session goal<input value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="Problems 1–10" /></label>
        <label>Start with<input value={firstStep} onChange={(event) => setFirstStep(event.target.value)} placeholder="Open the chapter 5 worksheet" /></label>
        <label>Materials link<input type="url" value={materialsUrl} onChange={(event) => setMaterialsUrl(event.target.value)} placeholder="https://" /></label>
        <div className="sp-modal-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy || !title.trim()} type="submit">{busy ? 'Saving…' : topic?.id ? 'Save changes' : 'Add topic'}</button></div>
      </form>}
  </Modal>
}

function SubjectEditor({ subject, busy, onCancel, onSave }: {
  subject: StudySubject | null
  busy: boolean
  onCancel: () => void
  onSave: (draft: SubjectDraft) => Promise<boolean>
}) {
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? subjectColors[0] ?? '#568467')
  const [targetHours, setTargetHours] = useState(subject ? subject.weekly_target_minutes / 60 : 4)
  const [duration, setDuration] = useState(subject?.default_duration_minutes ?? 45)
  const [examDate, setExamDate] = useState(subject?.exam_date ?? '')
  const [semesterEnd, setSemesterEnd] = useState(subject?.semester_end_date ?? '')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return
    await onSave({
      name: name.trim(),
      color,
      weekly_target_minutes: Math.round(targetHours * 60),
      default_duration_minutes: duration,
      exam_date: examDate || null,
      semester_end_date: semesterEnd || null,
    })
  }

  return <Modal title={subject ? 'Edit subject' : 'Add subject'} onClose={onCancel}>
    <form className="sp-form sp-subject-form" onSubmit={(event) => void submit(event)}>
      <div className="sp-subject-identity">
        <label>Subject name<input autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="Calculus II" /></label>
        <div className="sp-subject-color">
          <span className="sp-subject-color-label">Subject color</span>
          <div className="sp-color-options" role="group" aria-label="Subject color">
            {subjectColors.map((value, index) => {
              const label = ['Forest', 'Blue', 'Violet', 'Clay', 'Rose', 'Sage', 'Gold'][index] ?? 'Subject'
              return <button type="button" key={value} className={color === value ? 'selected' : ''} style={{ backgroundColor: value }} aria-label={label} aria-pressed={color === value} onClick={() => setColor(value)} />
            })}
          </div>
        </div>
      </div>
      <fieldset className="sp-subject-fields">
        <legend>Study plan</legend>
        <div className="sp-form-grid">
          <label>Weekly target (hours)<input type="number" min="0" max="168" step="0.5" value={targetHours} onChange={(event) => setTargetHours(Number(event.target.value))} /></label>
          <label>Default session (minutes)<input type="number" min="5" max="720" step="5" value={duration} onChange={(event) => setDuration(Number(event.target.value))} /></label>
          <label>Exam date<input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} /></label>
          <label>Semester end<input type="date" value={semesterEnd} onChange={(event) => setSemesterEnd(event.target.value)} /></label>
        </div>
      </fieldset>
      <div className="sp-modal-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy || !name.trim()} type="submit">{busy ? 'Saving…' : 'Save subject'}</button></div>
    </form>
  </Modal>
}

function AvailabilityEditor({ onCancel, onSave }: {
  onCancel: () => void
  onSave: (draft: Omit<StudyAvailability, 'id' | 'user_id' | 'active'>) => Promise<void>
}) {
  const [label, setLabel] = useState('Study window')
  const [weekday, setWeekday] = useState(new Date().getDay())
  const [start, setStart] = useState('17:00')
  const [end, setEnd] = useState('20:00')
  return <Modal title="Add weekly study window" onClose={onCancel}>
    <form className="sp-form" onSubmit={(event) => {
      event.preventDefault()
      if (start >= end) return
      void onSave({ label: label.trim() || 'Study window', weekday, start_time: start, end_time: end })
    }}>
      <label>Window name<input value={label} onChange={(event) => setLabel(event.target.value)} /></label>
      <label>Day<select value={weekday} onChange={(event) => setWeekday(Number(event.target.value))}>{weekdayNames.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>
      <div className="sp-form-grid"><label>From<input type="time" value={start} onChange={(event) => setStart(event.target.value)} /></label><label>To<input type="time" value={end} onChange={(event) => setEnd(event.target.value)} /></label></div>
      {start >= end && <p className="sp-field-error" role="alert">End time must be after start time.</p>}
      <div className="sp-modal-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" type="submit" disabled={start >= end}>Save window</button></div>
    </form>
  </Modal>
}

function SkipDialog({ topic, value, onChange, onCancel, onSave }: {
  topic: StudyTopic
  value: string
  onChange: (date: string) => void
  onCancel: () => void
  onSave: () => void
}) {
  return <Modal title={`Skip ${topic.title}`} onClose={onCancel}>
    <div className="sp-form"><p>Keep this topic out of your queue through the selected date.</p><label>Skip until<input type="date" min={today()} value={value} onChange={(event) => onChange(event.target.value)} /></label>
      <div className="sp-modal-actions"><button className="button" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={!value || value < today()} onClick={onSave}>Skip topic</button></div>
    </div>
  </Modal>
}

function CloseoutDialog({ item, rating, note, busy, onRating, onNote, onCancel, onSave }: {
  item: QueuedStudySession
  rating: RecallRating
  note: string
  busy: boolean
  onRating: (value: RecallRating) => void
  onNote: (value: string) => void
  onCancel: () => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
}) {
  return <Modal title="Close out session" onClose={onCancel}>
    <form className="sp-form" onSubmit={onSave}>
      <p><strong>{item.topic.title}</strong> · {item.subject.name}</p>
      <fieldset><legend>How well could you recall it?</legend><div className="sp-rating-options">{(['again', 'hard', 'good', 'easy'] as RecallRating[]).map((value) => <button type="button" key={value} aria-pressed={rating === value} className={rating === value ? 'selected' : ''} onClick={() => onRating(value)}>{ratingLabels[value]}</button>)}</div></fieldset>
      <label>What was hard? <small>Optional one-line note</small><input maxLength={240} value={note} onChange={(event) => onNote(event.target.value)} placeholder="I mixed up the chain rule…" /></label>
      <div className="sp-modal-actions"><button className="button" type="button" onClick={onCancel}>Cancel</button><button className="button button-primary" disabled={busy} type="submit">{busy ? 'Saving…' : 'Save session'}</button></div>
    </form>
  </Modal>
}

function WeeklyReviewDialog({ done, planned, missed, onClose }: {
  done: number
  planned: number
  missed: number
  onClose: () => void
}) {
  return <Modal title="Weekly review" onClose={onClose}>
    <div className="sp-form"><p>You completed {done} of {planned} sessions this week; {missed} slipped past their planned date.</p><p>Use your next-week suggestions to place anything you still want to do. Completed reviews and notes remain in your history.</p><div className="sp-modal-actions"><button className="button button-primary" onClick={onClose}>Done</button></div></div>
  </Modal>
}

import type { SupabaseClient } from '@supabase/supabase-js'
import { ArrowRight, BookOpen, Check, MoreHorizontal, Play, Plus, Search, Sparkles, X } from 'lucide-react'
import { enqueueOfflineAction, readOfflineActions, readPlannerSnapshot, savePlannerSnapshot, syncOfflineActions } from './offline'
import {
  buildTodayQueue,
  dateFromKey,
  findFreeSlots,
  generateStudyOccurrences,
  getQueueBucket,
  getMinutes,
  getNextStudyDate,
  getReadiness,
  getRecallTrend,
  localDateKey,
  nextLocalDate,
  planExamAwareDueDate,
  parseQuickAddText,
  scheduleRecall,
  scaleIntervalForExam,
} from './scheduling'
import type { QueuedStudySession, RecallRating, StudyAvailability, StudyPreferences, StudyReview, StudySession, StudySubject, StudyTopic } from './types'

type Props = { client: SupabaseClient; userId: string; initialScreen?: Screen }
type Screen = 'today' | 'upcoming' | 'skipped' | 'archived' | 'planner' | 'calendar' | 'insights' | 'weekly'
type TopicDraft = Omit<StudyTopic, 'id' | 'user_id' | 'legacy_reminder_id' | 'created_at' | 'updated_at' | 'last_reviewed_at' | 'review_count' | 'lapse_count' | 'interval_days' | 'stability' | 'difficulty' | 'recall_probability' | 'fsrs_state' | 'graduated_at' | 'archived_at'>
type SubjectDraft = Omit<StudySubject, 'id' | 'user_id' | 'created_at' | 'archived_at'>

const ratingLabels: Record<RecallRating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const subjectColors = ['#568467', '#477AA2', '#9877A7', '#B1764F', '#A75E64', '#668579', '#9B8446']
const today = () => localDateKey(new Date())

function dateOffset(date: string, days: number) {
  return localDateKey(nextLocalDate(dateFromKey(date), days))
}

function timeInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function minutesSince(start: string | null, now: number) {
  return start ? Math.max(0, Math.floor((now - new Date(start).getTime()) / 60_000)) : 0
}

function isNetworkFailure(message: string) {
  return /failed to fetch|network error|networkerror|load failed|fetch failed|connection (?:lost|closed|reset)/i.test(message)
}

function isOffline() {
  return !navigator.onLine
}

function defaultPreferences(userId: string): StudyPreferences {
  return {
    user_id: userId,
    time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    daily_cap_minutes: 180,
    lead_minutes: 0,
    quiet_start: '22:00',
    quiet_end: '07:00',
    digest_time: '08:00',
    max_notifications_per_day: 3,
    email: null,
    catch_up_threshold: 5,
  }
}

export function MyDayStudyQueue({ client, userId, todayKey, onCountChange, onOpenStudy }: {
  client: SupabaseClient
  userId: string
  todayKey: string
  onCountChange: (count: number) => void
  onOpenStudy: () => void
}) {
  const [items, setItems] = useState<QueuedStudySession[]>([])
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [subjects, setSubjects] = useState<StudySubject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [notice, setNotice] = useState('')
  const [now, setNow] = useState(() => new Date())
  const [leadMinutes, setLeadMinutes] = useState(0)
  const [busy, setBusy] = useState(false)
  const [busySessionId, setBusySessionId] = useState('')
  const [closeout, setCloseout] = useState<QueuedStudySession | null>(null)
  const [rating, setRating] = useState<RecallRating>('good')
  const [reviewNote, setReviewNote] = useState('')

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadQueue() {
      setLoading(true)
      setError('')
      onCountChange(0)
      const [subjectsResult, topicsResult, preferencesResult] = await Promise.all([
        client.from('study_subjects').select('*').eq('user_id', userId).is('archived_at', null).order('name'),
        client.from('study_topics').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        client.from('study_preferences').select('lead_minutes').eq('user_id', userId).maybeSingle(),
      ])
      const loadError = subjectsResult.error || topicsResult.error || preferencesResult.error
      if (loadError) {
        if (!cancelled) {
          setError(`Could not load the study queue: ${loadError.message}`)
          setLoading(false)
        }
        return
      }
      if (cancelled) return

      const subjects = (subjectsResult.data ?? []) as StudySubject[]
      const topics = (topicsResult.data ?? []) as StudyTopic[]
      const currentLeadMinutes = preferencesResult.data?.lead_minutes ?? 0
      const occurrences = generateStudyOccurrences(topics, todayKey, todayKey)
      if (occurrences.length) {
        const { error: insertError } = await client.from('study_sessions').upsert(
          occurrences.map(({ topic, date, reason }) => ({
            user_id: userId,
            topic_id: topic.id,
            scheduled_date: date,
            scheduled_time: topic.anytime_today ? null : topic.start_time,
            duration_minutes: topic.duration_minutes,
            reason,
            status: 'planned',
          })),
          { onConflict: 'topic_id,scheduled_date', ignoreDuplicates: true },
        )
        if (insertError) {
          if (!cancelled) {
            setError(`Could not prepare today's study sessions: ${insertError.message}`)
            setLoading(false)
          }
          return
        }
      }

      const sessionsResult = await client.from('study_sessions').select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', dateOffset(todayKey, -365))
        .lte('scheduled_date', todayKey)
        .order('scheduled_date')
        .order('scheduled_time')
      if (sessionsResult.error) {
        if (!cancelled) {
          setError(`Could not load today's study sessions: ${sessionsResult.error.message}`)
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setLeadMinutes(currentLeadMinutes)
        setSubjects(subjects)
        setTopics(topics)
        setItems(buildTodayQueue(
          (sessionsResult.data ?? []) as StudySession[],
          topics,
          subjects,
          now,
          currentLeadMinutes,
        ))
        setLoading(false)
      }
    }

    void loadQueue()
    return () => { cancelled = true }
  }, [client, userId, todayKey, onCountChange])

  const queue = useMemo(() => items.map((item) => ({
    ...item,
    bucket: getQueueBucket(item.session, item.topic, now, leadMinutes),
  })).sort((a, b) => {
    const order = { overdue: 0, due: 1, later: 2 }
    return order[a.bucket] - order[b.bucket] || a.scheduledAt.getTime() - b.scheduledAt.getTime()
  }), [items, now, leadMinutes])

  useEffect(() => onCountChange(queue.length), [queue.length, onCountChange])

  useEffect(() => {
    let active = true
    async function syncPending() {
      try {
        const syncError = await syncOfflineActions(client, userId)
        if (active && syncError) setActionError(syncError)
      } catch (syncError) {
        if (active) setActionError(`Could not sync offline study sessions: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
      }
    }
    if (navigator.onLine) void syncPending()
    window.addEventListener('online', syncPending)
    return () => {
      active = false
      window.removeEventListener('online', syncPending)
    }
  }, [client, userId])

  function openCloseout(item: QueuedStudySession) {
    setRating('good')
    setReviewNote('')
    setCloseout(item)
  }

  async function startSession(item: QueuedStudySession) {
    const anotherStarted = items.find((entry) => entry.session.status === 'started' && entry.session.id !== item.session.id)
    if (anotherStarted) {
      setActionError(`Finish “${anotherStarted.topic.title}” before starting another study session.`)
      return
    }
    setBusySessionId(item.session.id)
    setActionError('')
    const startedAt = item.session.started_at ?? new Date().toISOString()
    const updates = { status: 'started' as const, started_at: startedAt }
    const { error: updateError } = await client.from('study_sessions').update(updates)
      .eq('id', item.session.id).eq('user_id', userId)
    if (updateError) {
      setActionError(`Could not start study session: ${updateError.message}`)
    } else {
      setItems((current) => current.map((entry) => entry.session.id === item.session.id
        ? { ...entry, session: { ...entry.session, ...updates } }
        : entry))
      setNotice(`Started ${item.topic.title}.`)
    }
    setBusySessionId('')
  }

  async function finishSession(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!closeout) return
    setBusy(true)
    setActionError('')
    const finishedAt = new Date()
    const actualMinutes = minutesSince(closeout.session.started_at, finishedAt.getTime())
    const topic = topics.find((entry) => entry.id === closeout.topic.id) ?? closeout.topic
    const subject = subjects.find((entry) => entry.id === topic.subject_id)
    const recall = topic.spaced_repetition ? scheduleRecall(topic, rating, finishedAt) : null
    let nextDueDate = recall?.nextDueDate ?? null
    let graduated = false
    if (nextDueDate) {
      const examPlan = planExamAwareDueDate(nextDueDate, today(), subject?.exam_date ?? null, subject?.semester_end_date ?? null)
      nextDueDate = examPlan.date
      graduated = examPlan.graduated
      if (nextDueDate && subject?.exam_date) {
        const daysUntilExam = Math.max(1, Math.round(
          (dateFromKey(subject.exam_date).getTime() - dateFromKey(today()).getTime()) / 86_400_000,
        ))
        const scaledDays = scaleIntervalForExam(recall?.intervalDays ?? 1, daysUntilExam)
        nextDueDate = localDateKey(nextLocalDate(dateFromKey(today()), scaledDays))
        nextDueDate = planExamAwareDueDate(nextDueDate, today(), subject.exam_date, subject.semester_end_date).date
      }
    }
    const reviewPayload = {
      user_id: userId,
      topic_id: topic.id,
      session_id: closeout.session.id,
      reviewed_at: finishedAt.toISOString(),
      rating,
      duration_minutes: actualMinutes,
      note: reviewNote.trim(),
      predicted_recall: recall?.predictedRecall ?? topic.recall_probability,
      stability: recall?.stability ?? topic.stability,
      difficulty: recall?.difficulty ?? topic.difficulty,
    }
    const sessionUpdates = {
      status: 'completed' as const,
      ended_at: finishedAt.toISOString(),
      actual_minutes: actualMinutes,
    }
    const topicUpdates: Partial<StudyTopic> = recall ? {
      fsrs_state: recall.fsrsState,
      next_due_date: graduated ? null : nextDueDate,
      last_reviewed_at: finishedAt.toISOString(),
      review_count: recall.reviewCount,
      lapse_count: recall.lapseCount,
      interval_days: recall.intervalDays,
      stability: recall.stability,
      difficulty: recall.difficulty,
      recall_probability: recall.predictedRecall,
      spaced_repetition: !graduated,
      graduated_at: graduated ? finishedAt.toISOString() : null,
    } : { last_reviewed_at: finishedAt.toISOString() }
    const updatedTopic = { ...topic, ...topicUpdates }
    const localReview: StudyReview = { ...reviewPayload, id: `offline:${closeout.session.id}` }
    const finishLocally = (savedOffline: boolean) => {
      setItems((current) => current.filter((entry) => entry.session.id !== closeout.session.id))
      setTopics((current) => current.map((entry) => entry.id === updatedTopic.id ? updatedTopic : entry))
      setCloseout(null)
      setBusy(false)
      setNotice(savedOffline
        ? 'Session saved on this device. It will sync when you reconnect.'
        : `Session logged · ${actualMinutes} ${actualMinutes === 1 ? 'minute' : 'minutes'} · ${ratingLabels[rating]}`)
    }
    const saveOffline = (reason: string) => {
      try {
        enqueueOfflineAction({
          user_id: userId,
          topic_id: topic.id,
          session_id: closeout.session.id,
          review: reviewPayload,
          session_updates: sessionUpdates,
          topic_updates: topicUpdates,
        })
      } catch (storageError) {
        setBusy(false)
        setActionError(`Could not save this session offline: ${storageError instanceof Error ? storageError.message : String(storageError)}. ${reason}`)
        return false
      }
      finishLocally(true)
      try {
        const cached = readPlannerSnapshot(userId)
        if (cached) savePlannerSnapshot(userId, {
          ...cached,
          topics: cached.topics.map((entry) => entry.id === updatedTopic.id ? updatedTopic : entry),
          sessions: cached.sessions.map((entry) => entry.id === closeout.session.id ? { ...entry, ...sessionUpdates } : entry),
          reviews: [localReview, ...cached.reviews.filter((entry) => entry.session_id !== closeout.session.id)],
        })
      } catch (storageError) {
        console.error('Could not update the offline planner cache:', storageError)
      }
      return true
    }

    if (!navigator.onLine) {
      saveOffline('Check your connection before reopening the planner.')
      return
    }

    const { error: reviewError } = await client.from('study_reviews')
      .upsert(reviewPayload, { onConflict: 'session_id' })
    if (reviewError) {
      if (isNetworkFailure(reviewError.message) || !navigator.onLine) {
        if (saveOffline(reviewError.message)) return
      }
      setBusy(false)
      setActionError(`Could not save review: ${reviewError.message}`)
      return
    }
    const { error: sessionError } = await client.from('study_sessions').update(sessionUpdates)
      .eq('id', closeout.session.id).eq('user_id', userId)
    if (sessionError) {
      if (isNetworkFailure(sessionError.message) || !navigator.onLine) {
        if (saveOffline(sessionError.message)) return
      }
      setBusy(false)
      setActionError(`Review saved, but the session could not be completed: ${sessionError.message}`)
      return
    }
    const { error: topicError } = await client.from('study_topics').update(topicUpdates)
      .eq('id', topic.id).eq('user_id', userId)
    if (topicError) {
      if (isNetworkFailure(topicError.message) || !navigator.onLine) {
        if (saveOffline(topicError.message)) return
      }
      setBusy(false)
      setActionError(`Review and session saved, but the topic schedule could not be updated: ${topicError.message}`)
      return
    }
    finishLocally(false)
  }

  const queueContent = loading
    ? <div className="my-day-loading" role="status"><span className="loader" /> Loading study queue…</div>
    : error
      ? <div className="sp-inline-hint" role="alert">{error}</div>
      : queue.length
        ? <div className="my-day-item-list my-day-study-queue">{queue.map((item) => {
            const started = item.session.status === 'started'
            const doneLabel = `Done with ${item.topic.title}`
            return <article className="my-day-item" key={item.session.id}>
              <button className="my-day-check" aria-label={doneLabel} disabled={busy || Boolean(busySessionId)} onClick={() => openCloseout(item)}><Check size={13} /></button>
              <div className="my-day-item-copy">
                <strong>{item.topic.title}</strong>
                <span>{item.subject.name} · {item.session.scheduled_time?.slice(0, 5) ?? 'Anytime today'} · {item.session.duration_minutes} min · {item.bucket === 'overdue' ? 'Overdue' : item.bucket === 'due' ? 'Due now' : 'Later today'}</span>
                {item.topic.goal && <span>Goal: {item.topic.goal}</span>}
                {item.topic.first_step && <span>Start with: {item.topic.first_step}</span>}
              </div>
              <button className="my-day-focus my-day-task-focus" disabled={busy || Boolean(busySessionId)} onClick={() => started ? openCloseout(item) : void startSession(item)} aria-label={started ? `Finish ${item.topic.title}` : `Start ${item.topic.title}`}>
                <Play size={14} /><span>{busySessionId === item.session.id ? 'Starting…' : started ? 'Finish' : 'Start'}</span>
              </button>
              <span className={`my-day-status ${item.bucket === 'overdue' ? 'overdue-status' : ''}`}>{item.bucket === 'overdue' ? 'Overdue' : item.bucket === 'due' ? 'Due now' : 'Later'}</span>
            </article>
          })}</div>
        : <div className="my-day-empty"><BookOpen size={17} /><span>No study sessions scheduled today.</span></div>

  return <>
    {notice && <div className="sp-inline-hint" role="status">{notice}</div>}
    {actionError && <div className="sp-inline-hint" role="alert">{actionError}</div>}
    {queueContent}
    <button className="my-day-view-all" onClick={onOpenStudy}>Open study planner <ArrowRight size={13} /></button>
    {closeout && <CloseoutDialog item={closeout} rating={rating} note={reviewNote} busy={busy} onRating={setRating} onNote={setReviewNote} onCancel={() => setCloseout(null)} onSave={finishSession} />}
  </>
}

export function StudyPlanner({ client, userId, initialScreen = 'today' }: Props) {
  const [subjects, setSubjects] = useState<StudySubject[]>([])
  const [topics, setTopics] = useState<StudyTopic[]>([])
  const [sessions, setSessions] = useState<StudySession[]>([])
  const [reviews, setReviews] = useState<StudyReview[]>([])
  const [availability, setAvailability] = useState<StudyAvailability[]>([])
  const [preferences, setPreferences] = useState<StudyPreferences>(() => defaultPreferences(userId))
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [screen, setScreen] = useState<Screen>(initialScreen)
  const [search, setSearch] = useState('')
  const [topicDialog, setTopicDialog] = useState(false)
  const [subjectDialog, setSubjectDialog] = useState(false)
  const [editingTopic, setEditingTopic] = useState<StudyTopic | null>(null)
  const [editingSubject, setEditingSubject] = useState<StudySubject | null>(null)
  const [closeout, setCloseout] = useState<QueuedStudySession | null>(null)
  const [rating, setRating] = useState<RecallRating>('good')
  const [reviewNote, setReviewNote] = useState('')
  const [activeSession, setActiveSession] = useState<QueuedStudySession | null>(null)
  const [timerNow, setTimerNow] = useState(Date.now())
  const [topicToSkip, setTopicToSkip] = useState<StudyTopic | null>(null)
  const [skipDate, setSkipDate] = useState(dateOffset(today(), 7))
  const [availabilityDialog, setAvailabilityDialog] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [weeklyReviewOpen, setWeeklyReviewOpen] = useState(false)
  const notificationPermission: NotificationPermission | 'unsupported' =
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  const todayKey = today()
  const throughDate = dateOffset(todayKey, 40)

  function applyPendingActions(snapshot: {
    subjects: StudySubject[]
    topics: StudyTopic[]
    sessions: StudySession[]
    reviews: StudyReview[]
    availability: StudyAvailability[]
    preferences: StudyPreferences
  }) {
    let nextTopics = snapshot.topics
    let nextSessions = snapshot.sessions
    let nextReviews = snapshot.reviews
    for (const action of readOfflineActions(userId)) {
      nextTopics = nextTopics.map((topic) => topic.id === action.topic_id ? { ...topic, ...action.topic_updates } : topic)
      nextSessions = nextSessions.map((session) => session.id === action.session_id
        ? { ...session, ...action.session_updates }
        : session)
      nextReviews = [
        { ...action.review, id: `offline:${action.session_id}` },
        ...nextReviews.filter((review) => review.session_id !== action.session_id),
      ]
    }
    return { ...snapshot, topics: nextTopics, sessions: nextSessions, reviews: nextReviews }
  }

  async function load() {
    setLoading(true)
    setError('')
    const [subjectsResult, topicsResult, preferencesResult, availabilityResult] = await Promise.all([
      client.from('study_subjects').select('*').eq('user_id', userId).order('name'),
      client.from('study_topics').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      client.from('study_preferences').select('*').eq('user_id', userId).maybeSingle(),
      client.from('study_availability').select('*').eq('user_id', userId).order('weekday').order('start_time'),
    ])
    const initialError = subjectsResult.error || topicsResult.error || preferencesResult.error || availabilityResult.error
    if (initialError) {
      try {
        const cached = readPlannerSnapshot(userId)
        if (cached) {
          const snapshot = applyPendingActions(cached)
          setSubjects(snapshot.subjects)
          setTopics(snapshot.topics)
          setSessions(snapshot.sessions)
          setReviews(snapshot.reviews)
          setAvailability(snapshot.availability)
          setPreferences(snapshot.preferences)
          setNoticeMessage('Offline mode: showing your saved planner. Actions will sync when you reconnect.')
          setLoading(false)
          return
        }
      } catch (cacheError) {
        setError(`Could not use your offline planner data: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}`)
        setLoading(false)
        return
      }
      setError(`Could not load your study planner: ${initialError.message}`)
      setLoading(false)
      return
    }

    const nextSubjects = (subjectsResult.data ?? []) as StudySubject[]
    const nextTopics = (topicsResult.data ?? []) as StudyTopic[]
    const nextAvailability = (availabilityResult.data ?? []) as StudyAvailability[]
    let nextPreferences = (preferencesResult.data as StudyPreferences | null) ?? defaultPreferences(userId)
    if (!preferencesResult.data) {
      const { data, error: preferenceError } = await client.from('study_preferences')
        .upsert(nextPreferences).select().single()
      if (preferenceError) {
        setError(`Could not create study preferences: ${preferenceError.message}`)
        setLoading(false)
        return
      }
      nextPreferences = data as StudyPreferences
    }

    const fromDate = dateOffset(todayKey, -365)
    const existingResult = await client.from('study_sessions').select('*')
      .eq('user_id', userId)
      .gte('scheduled_date', fromDate)
      .lte('scheduled_date', throughDate)
      .order('scheduled_date')
      .order('scheduled_time')
    if (existingResult.error) {
      setError(`Could not load planned study sessions: ${existingResult.error.message}`)
      setLoading(false)
      return
    }

    let nextSessions = (existingResult.data ?? []) as StudySession[]
    const existingKeys = new Set(nextSessions.map((session) => `${session.topic_id}:${session.scheduled_date}`))
    const newSessions = generateStudyOccurrences(nextTopics, todayKey, throughDate)
      .filter(({ topic, date }) => !existingKeys.has(`${topic.id}:${date}`))
      .map(({ topic, date, reason }) => ({
        user_id: userId,
        topic_id: topic.id,
        scheduled_date: date,
        scheduled_time: topic.anytime_today ? null : topic.start_time,
        duration_minutes: topic.duration_minutes,
        reason,
        status: 'planned',
      }))
    if (newSessions.length) {
      const { error: insertError } = await client.from('study_sessions').insert(newSessions)
      if (insertError && insertError.code !== '23505') {
        setError(`Could not plan study sessions: ${insertError.message}`)
        setLoading(false)
        return
      }
      const refreshed = await client.from('study_sessions').select('*')
        .eq('user_id', userId)
        .gte('scheduled_date', fromDate)
        .lte('scheduled_date', throughDate)
        .order('scheduled_date')
        .order('scheduled_time')
      if (refreshed.error) {
        setError(`Could not refresh the planner: ${refreshed.error.message}`)
        setLoading(false)
        return
      }
      nextSessions = (refreshed.data ?? []) as StudySession[]
    }

    const reviewsResult = await client.from('study_reviews').select('*')
      .eq('user_id', userId)
      .gte('reviewed_at', `${fromDate}T00:00:00`)
      .order('reviewed_at', { ascending: false })
    if (reviewsResult.error) {
      setError(`Could not load study history: ${reviewsResult.error.message}`)
      setLoading(false)
      return
    }
    const snapshot = applyPendingActions({
      subjects: nextSubjects,
      topics: nextTopics,
      sessions: nextSessions,
      reviews: (reviewsResult.data ?? []) as StudyReview[],
      availability: nextAvailability,
      preferences: nextPreferences,
    })
    setSubjects(snapshot.subjects)
    setTopics(snapshot.topics)
    setSessions(snapshot.sessions)
    setReviews(snapshot.reviews)
    setAvailability(snapshot.availability)
    setPreferences(snapshot.preferences)
    try { savePlannerSnapshot(userId, snapshot) } catch (cacheError) {
      console.error('Could not cache the study planner:', cacheError)
    }
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [client, userId])

  useEffect(() => {
    async function syncPending() {
      if (!navigator.onLine) return
      try {
        if (!readOfflineActions(userId).length) return
        const syncError = await syncOfflineActions(client, userId)
        if (syncError) {
          setErrorMessage(syncError)
          return
        }
        setNoticeMessage('Offline study actions synced.')
        void load()
      } catch (syncError) {
        setErrorMessage(`Could not sync offline study actions: ${syncError instanceof Error ? syncError.message : String(syncError)}`)
      }
    }
    window.addEventListener('online', syncPending)
    void syncPending()
    return () => window.removeEventListener('online', syncPending)
  }, [client, userId])

  useEffect(() => {
    if (!activeSession) return
    const intervalId = window.setInterval(() => {
      const now = Date.now()
      setTimerNow(now)
      const started = activeSession.session.started_at
      if (started && now - new Date(started).getTime() >= activeSession.session.duration_minutes * 60_000) {
        setCloseout(activeSession)
        setActiveSession(null)
      }
    }, 1000)
    return () => window.clearInterval(intervalId)
  }, [activeSession])

  const activeTopics = useMemo(() => topics.filter((topic) => !topic.archived_at && !topic.graduated_at), [topics])
  const todaySessions = sessions.filter((session) =>
    session.scheduled_date <= todayKey && !['completed', 'skipped'].includes(session.status))
  const todayQueue = buildTodayQueue(todaySessions, activeTopics, subjects, new Date(), preferences.lead_minutes)
  useEffect(() => {
    const channel = notificationPermission === 'granted' ? 'browser' : 'email'
    if (channel === 'email' && !preferences.email) return

    async function recordEvent(eventKey: string, status: 'sent' | 'failed' | 'skipped', errorMessage = '') {
      const { error: logError } = await client.from('study_notification_events').insert({
        user_id: userId,
        event_key: eventKey,
        channel,
        status,
        error_message: errorMessage.slice(0, 500),
      })
      if (logError && logError.code !== '23505') console.error('Could not log study notification:', logError.message)
    }

    async function sendNotification(eventKey: string, title: string, body: string, now: Date) {
      const dayKey = localDateKey(now)
      const marker = `daymark.study.event:${channel}:${userId}:${eventKey}`
      const countKey = `daymark.study.notification-count:${userId}:${dayKey}`
      try {
        if (localStorage.getItem(marker)) return
      } catch (storageError) {
        console.error('Could not read notification delivery state:', storageError)
        return
      }

      const currentTime = now.getHours() * 60 + now.getMinutes()
      const quietStart = getMinutes(preferences.quiet_start)
      const quietEnd = getMinutes(preferences.quiet_end)
      const inQuietHours = quietStart !== null && quietEnd !== null && (quietStart <= quietEnd
        ? currentTime >= quietStart && currentTime < quietEnd
        : currentTime >= quietStart || currentTime < quietEnd)
      if (inQuietHours) {
        await recordEvent(eventKey, 'skipped', 'Quiet hours')
        try { localStorage.setItem(marker, 'skipped') } catch (storageError) { console.error('Could not persist notification state:', storageError) }
        return
      }

      let deliveredCount = 0
      try { deliveredCount = Number(localStorage.getItem(countKey) ?? 0) } catch (storageError) {
        console.error('Could not read daily notification count:', storageError)
        return
      }
      if (deliveredCount >= preferences.max_notifications_per_day) {
        await recordEvent(eventKey, 'skipped', 'Daily notification cap reached')
        try { localStorage.setItem(marker, 'skipped') } catch (storageError) { console.error('Could not persist notification state:', storageError) }
        return
      }

      let status: 'sent' | 'failed' = 'sent'
      let failure = ''
      try {
        if (channel === 'browser') {
          const notification = new Notification(title, { body, tag: `daymark-study-${eventKey}` })
          notification.onclick = () => {
            window.focus()
            setScreen('today')
            notification.close()
          }
        }
        else {
          const { error: sendError } = await client.functions.invoke('study-notify', {
            body: { eventKey, title, body },
          })
          if (sendError) throw sendError
        }
      } catch (notificationError) {
        status = 'failed'
        failure = notificationError instanceof Error ? notificationError.message : String(notificationError)
      }
      if (channel === 'browser') await recordEvent(eventKey, status, failure)
      if (status === 'failed') {
        console.error(`Study ${channel} notification failed:`, failure)
        setErrorMessage(`Study ${channel} notification failed: ${failure}`)
      }
      try {
        localStorage.setItem(marker, status)
        if (status === 'sent') localStorage.setItem(countKey, String(deliveredCount + 1))
      } catch (storageError) {
        console.error('Could not persist notification delivery state:', storageError)
      }
    }

    async function notify() {
      const now = new Date()
      const today = localDateKey(now)
      const queue = buildTodayQueue(
        sessions.filter((session) => session.scheduled_date <= today && !['completed', 'skipped'].includes(session.status)),
        activeTopics,
        subjects,
        now,
        preferences.lead_minutes,
      )
      const currentMinutes = now.getHours() * 60 + now.getMinutes()
      const digestMinutes = getMinutes(preferences.digest_time)
      if (digestMinutes !== null && currentMinutes >= digestMinutes) {
        const total = queue.reduce((minutes, item) => minutes + item.session.duration_minutes, 0)
        await sendNotification(
          `digest:${today}`,
          'Your study plan for today',
          `${queue.length} ${queue.length === 1 ? 'session' : 'sessions'} · about ${Math.round(total / 60 * 10) / 10}h`,
          now,
        )
      }
      for (const item of queue) {
        if (item.bucket === 'overdue') {
          await sendNotification(
            `missed:${item.session.id}`,
            'A study session was missed',
            `${item.topic.title} · ${item.subject.name}. Reschedule or skip it in your study queue.`,
            now,
          )
          continue
        }
        if (!item.session.scheduled_time) continue
        const minutesUntil = (item.scheduledAt.getTime() - now.getTime()) / 60_000
        if (minutesUntil <= Math.max(preferences.lead_minutes, 1) && minutesUntil >= -5) {
          await sendNotification(
            `session:${item.session.id}`,
            'Study session coming up',
            `${item.topic.title} · ${item.subject.name}`,
            now,
          )
        }
      }
    }

    void notify()
    const intervalId = window.setInterval(() => void notify(), 60_000)
    return () => window.clearInterval(intervalId)
  }, [activeTopics, client, notificationPermission, preferences, sessions, subjects, userId])
  const nextNow = todayQueue.find((item) => item.bucket !== 'later')
  const overdueCount = todayQueue.filter((item) => item.bucket === 'overdue').length
  const dueCount = todayQueue.filter((item) => item.bucket === 'due').length
  const upcomingSessions = sessions.filter((session) =>
    session.scheduled_date > todayKey && session.scheduled_date <= throughDate && !['completed', 'skipped'].includes(session.status))
  const skippedTopics = topics.filter((topic) => !topic.archived_at && !topic.graduated_at && topic.skip_until && topic.skip_until >= todayKey)
  const overdueSessions = todayQueue.filter((item) => item.bucket === 'overdue')
  const weekStart = dateOffset(todayKey, -new Date().getDay())
  const weekEnd = dateOffset(weekStart, 6)
  const weekSessions = sessions.filter((session) => session.scheduled_date >= weekStart && session.scheduled_date <= weekEnd)
  const completedWeekSessions = weekSessions.filter((session) => session.status === 'completed')
  const completedMinutes = completedWeekSessions.reduce((total, session) => total + (session.actual_minutes ?? 0), 0)
  const backlog = overdueSessions.length

  function subjectFor(topic: StudyTopic) {
    return subjects.find((subject) => subject.id === topic.subject_id)
  }

  function setErrorMessage(message: string) {
    setError(message)
    setNotice('')
  }

  function setNoticeMessage(message: string) {
    setNotice(message)
    setError('')
    window.setTimeout(() => setNotice(''), 3500)
  }

  async function saveSubject(draft: SubjectDraft) {
    setBusy(true)
    const result = editingSubject
      ? await client.from('study_subjects').update(draft).eq('id', editingSubject.id).eq('user_id', userId).select().single()
      : await client.from('study_subjects').insert({ ...draft, user_id: userId }).select().single()
    setBusy(false)
    if (result.error) {
      setErrorMessage(`Could not save subject: ${result.error.message}`)
      return false
    }
    setSubjectDialog(false)
    setEditingSubject(null)
    setSubjects((current) => editingSubject
      ? current.map((subject) => subject.id === editingSubject.id ? result.data as StudySubject : subject)
      : [...current, result.data as StudySubject].sort((a, b) => a.name.localeCompare(b.name)))
    setNoticeMessage(editingSubject ? 'Subject updated.' : 'Subject added.')
    return true
  }

  async function saveTopic(draft: TopicDraft) {
    const isEditing = Boolean(editingTopic?.id)
    setBusy(true)
    const result = isEditing && editingTopic
      ? await client.from('study_topics').update(draft).eq('id', editingTopic.id).eq('user_id', userId).select().single()
      : await client.from('study_topics').insert({
          ...draft,
          user_id: userId,
          next_due_date: draft.spaced_repetition ? draft.start_date : null,
        }).select().single()
    setBusy(false)
    if (result.error) {
      setErrorMessage(`Could not save topic: ${result.error.message}`)
      return false
    }
    setTopicDialog(false)
    setEditingTopic(null)
    setShowQuickAdd(false)
    setTopics((current) => isEditing && editingTopic
      ? current.map((topic) => topic.id === editingTopic.id ? result.data as StudyTopic : topic)
      : [result.data as StudyTopic, ...current])
    setNoticeMessage(isEditing ? 'Topic updated.' : 'Topic added to your plan.')
    void load()
    return true
  }

  async function updateSession(session: StudySession, updates: Partial<StudySession>) {
    const updated = { ...session, ...updates }
    setSessions((current) => current.map((item) => item.id === session.id ? updated : item))
    const { error: updateError } = await client.from('study_sessions').update(updates)
      .eq('id', session.id).eq('user_id', userId)
    if (updateError) {
      setSessions((current) => current.map((item) => item.id === session.id ? session : item))
      setErrorMessage(`Could not update study session: ${updateError.message}`)
      return false
    }
    return true
  }

  async function startSession(item: QueuedStudySession) {
    if (activeSession && activeSession.session.id !== item.session.id) {
      setErrorMessage('Finish or stop your current focus session before starting another.')
      return
    }
    const startedAt = item.session.started_at ?? new Date().toISOString()
    const updatedSession = { ...item.session, status: 'started' as const, started_at: startedAt }
    setActiveSession({ ...item, session: updatedSession })
    if (!await updateSession(item.session, { status: 'started', started_at: startedAt })) setActiveSession(null)
    setScreen('today')
  }

  function openCloseout(item: QueuedStudySession) {
    setRating('good')
    setReviewNote('')
    setCloseout(item)
  }

  async function finishSession(event: FormEvent) {
    event.preventDefault()
    if (!closeout) return
    const now = new Date()
    const actualMinutes = minutesSince(closeout.session.started_at, now.getTime())
    const topic = topics.find((item) => item.id === closeout.topic.id) ?? closeout.topic
    const subject = subjects.find((item) => item.id === topic.subject_id)
    const recall = topic.spaced_repetition ? scheduleRecall(topic, rating, now) : null
    let dueDate = recall?.nextDueDate ?? null
    let graduated = false
    if (dueDate) {
      const plan = planExamAwareDueDate(dueDate, today(), subject?.exam_date ?? null, subject?.semester_end_date ?? null)
      dueDate = plan.date
      graduated = plan.graduated
      if (dueDate && subject?.exam_date) {
        const daysUntilExam = Math.max(1, Math.round((dateFromKey(subject.exam_date).getTime() - dateFromKey(today()).getTime()) / 86_400_000))
        const scaledDays = scaleIntervalForExam(recall?.intervalDays ?? 1, daysUntilExam)
        dueDate = localDateKey(nextLocalDate(dateFromKey(today()), scaledDays))
        dueDate = planExamAwareDueDate(dueDate, today(), subject.exam_date, subject.semester_end_date).date
      }
    }

    const reviewPayload = {
      user_id: userId,
      topic_id: topic.id,
      session_id: closeout.session.id,
      reviewed_at: now.toISOString(),
      rating,
      duration_minutes: actualMinutes,
      note: reviewNote.trim(),
      predicted_recall: recall?.predictedRecall ?? topic.recall_probability,
      stability: recall?.stability ?? topic.stability,
      difficulty: recall?.difficulty ?? topic.difficulty,
    }
    const sessionUpdates = {
      status: 'completed' as const,
      ended_at: now.toISOString(),
      actual_minutes: actualMinutes,
    }
    const topicUpdates: Partial<StudyTopic> = recall ? {
      fsrs_state: recall.fsrsState,
      next_due_date: graduated ? null : dueDate,
      last_reviewed_at: now.toISOString(),
      review_count: recall.reviewCount,
      lapse_count: recall.lapseCount,
      interval_days: recall.intervalDays,
      stability: recall.stability,
      difficulty: recall.difficulty,
      recall_probability: recall.predictedRecall,
      spaced_repetition: !graduated,
      graduated_at: graduated ? now.toISOString() : null,
    } : { last_reviewed_at: now.toISOString() }
    const localReview: StudyReview = { ...reviewPayload, id: `offline:${closeout.session.id}` }
    const updatedTopic = { ...topic, ...topicUpdates }
    const finishLocally = (review: StudyReview, savedOffline: boolean) => {
      setSessions((current) => current.map((session) => session.id === closeout.session.id
        ? { ...session, ...sessionUpdates }
        : session))
      setReviews((current) => [review, ...current.filter((item) => item.session_id !== closeout.session.id)])
      setTopics((current) => current.map((item) => item.id === updatedTopic.id ? updatedTopic : item))
      setCloseout(null)
      setActiveSession(null)
      setBusy(false)
      setNoticeMessage(savedOffline
        ? 'Session saved on this device. It will sync when you reconnect.'
        : `Session logged · ${actualMinutes} ${actualMinutes === 1 ? 'minute' : 'minutes'} · ${ratingLabels[rating]}`)
    }
    const saveOffline = (reason: string) => {
      try {
        enqueueOfflineAction({
          user_id: userId,
          topic_id: topic.id,
          session_id: closeout.session.id,
          review: reviewPayload,
          session_updates: sessionUpdates,
          topic_updates: topicUpdates,
        })
      } catch (storageError) {
        setBusy(false)
        setErrorMessage(`Could not save this session offline: ${storageError instanceof Error ? storageError.message : String(storageError)}. ${reason}`)
        return false
      }
      finishLocally(localReview, true)
      try {
        savePlannerSnapshot(userId, {
          subjects,
          topics: topics.map((item) => item.id === updatedTopic.id ? updatedTopic : item),
          sessions: sessions.map((item) => item.id === closeout.session.id ? { ...item, ...sessionUpdates } : item),
          reviews: [localReview, ...reviews.filter((item) => item.session_id !== closeout.session.id)],
          availability,
          preferences,
        })
      } catch (storageError) {
        console.error('Could not update the offline planner cache:', storageError)
      }
      return true
    }

    if (isOffline()) {
      setBusy(true)
      saveOffline('Check your connection before reopening the planner.')
      return
    }

    setBusy(true)
    const { data: savedReview, error: reviewError } = await client.from('study_reviews')
      .upsert(reviewPayload, { onConflict: 'session_id' }).select().single()
    if (reviewError) {
      if (isNetworkFailure(reviewError.message) || isOffline()) {
        if (saveOffline(reviewError.message)) return
      }
      setBusy(false)
      setErrorMessage(`Could not save review: ${reviewError.message}`)
      return
    }
    const { error: sessionError } = await client.from('study_sessions').update(sessionUpdates)
      .eq('id', closeout.session.id).eq('user_id', userId)
    if (sessionError) {
      if (isNetworkFailure(sessionError.message) || isOffline()) {
        if (saveOffline(sessionError.message)) return
      }
      setBusy(false)
      setErrorMessage(`Review saved, but the session could not be completed: ${sessionError.message}`)
      return
    }
    const { data: savedTopic, error: topicError } = await client.from('study_topics').update(topicUpdates)
      .eq('id', topic.id).eq('user_id', userId).select().single()
    if (topicError) {
      if (isNetworkFailure(topicError.message) || isOffline()) {
        if (saveOffline(topicError.message)) return
      }
      setBusy(false)
      setErrorMessage(`Review and session saved, but the topic could not be updated: ${topicError.message}`)
      return
    }
    const finalTopic = savedTopic as StudyTopic
    finishLocally(savedReview as StudyReview, false)
    try {
      savePlannerSnapshot(userId, {
        subjects,
        topics: topics.map((item) => item.id === finalTopic.id ? finalTopic : item),
        sessions: sessions.map((item) => item.id === closeout.session.id ? { ...item, ...sessionUpdates } : item),
        reviews: [savedReview as StudyReview, ...reviews.filter((item) => item.session_id !== closeout.session.id)],
        availability,
        preferences,
      })
    } catch (cacheError) {
      console.error('Could not update the study planner cache:', cacheError)
    }
    void load()
  }

  async function snooze(item: QueuedStudySession, minutes: number) {
    const until = new Date(Date.now() + minutes * 60_000)
    const updated = await updateSession(item.session, {
      status: 'snoozed',
      scheduled_date: localDateKey(until),
      scheduled_time: timeInputValue(until),
      snoozed_until: until.toISOString(),
    })
    if (updated) setNoticeMessage(`Snoozed until ${new Intl.DateTimeFormat('en', { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(until)}.`)
  }

  async function skipTopic(topic: StudyTopic, until: string) {
    const { data, error: updateError } = await client.from('study_topics').update({ skip_until: until })
      .eq('id', topic.id).eq('user_id', userId).select().single()
    if (updateError) {
      setErrorMessage(`Could not skip this topic: ${updateError.message}`)
      return
    }
    setTopics((current) => current.map((item) => item.id === topic.id ? data as StudyTopic : item))
    const { error: sessionsError } = await client.from('study_sessions').delete()
      .eq('topic_id', topic.id).eq('user_id', userId).lte('scheduled_date', until)
      .in('status', ['planned', 'snoozed'])
    if (sessionsError) {
      setErrorMessage(`Topic was skipped, but existing sessions could not be cleared: ${sessionsError.message}`)
      void load()
      return
    }
    setSessions((current) => current.filter((item) =>
      !(item.topic_id === topic.id && item.scheduled_date <= until && ['planned', 'snoozed'].includes(item.status))))
    setTopicToSkip(null)
    setNoticeMessage(`Skipped until ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(dateFromKey(until))}.`)
  }

  async function archiveTopic(topic: StudyTopic) {
    const { error: updateError } = await client.from('study_topics').update({ archived_at: new Date().toISOString() })
      .eq('id', topic.id).eq('user_id', userId)
    if (updateError) setErrorMessage(`Could not archive topic: ${updateError.message}`)
    else {
      setTopics((current) => current.map((item) => item.id === topic.id ? { ...item, archived_at: new Date().toISOString() } : item))
      setNoticeMessage('Topic archived.')
    }
  }

  async function restoreTopic(topic: StudyTopic) {
    const { error: updateError } = await client.from('study_topics').update({ archived_at: null, graduated_at: null, skip_until: null })
      .eq('id', topic.id).eq('user_id', userId)
    if (updateError) setErrorMessage(`Could not restore topic: ${updateError.message}`)
    else {
      setTopics((current) => current.map((item) => item.id === topic.id
        ? { ...item, archived_at: null, graduated_at: null, skip_until: null }
        : item))
      setNoticeMessage('Topic restored.')
      void load()
    }
  }

  async function scheduleSlot(topic: StudyTopic, date: string, time: string) {
    const result = await client.from('study_sessions').upsert({
      user_id: userId,
      topic_id: topic.id,
      scheduled_date: date,
      scheduled_time: time,
      duration_minutes: topic.duration_minutes,
      reason: topic.spaced_repetition && topic.next_due_date === date ? 'both' : topic.spaced_repetition ? 'review' : 'study',
      status: 'planned',
    }, { onConflict: 'topic_id,scheduled_date' }).select().single()
    if (result.error) {
      setErrorMessage(`Could not schedule this session: ${result.error.message}`)
      return
    }
    setSessions((current) => [...current.filter((item) => item.id !== result.data.id), result.data as StudySession])
    setNoticeMessage('Session scheduled.')
  }

  async function saveAvailability(draft: Omit<StudyAvailability, 'id' | 'user_id' | 'active'>) {
    const { data, error: insertError } = await client.from('study_availability')
      .insert({ ...draft, user_id: userId, active: true }).select().single()
    if (insertError) setErrorMessage(`Could not save availability: ${insertError.message}`)
    else {
      setAvailability((current) => [...current, data as StudyAvailability])
      setAvailabilityDialog(false)
    }
  }

  async function deleteAvailability(id: string) {
    const { error: deleteError } = await client.from('study_availability').delete().eq('id', id).eq('user_id', userId)
    if (deleteError) setErrorMessage(`Could not remove availability: ${deleteError.message}`)
    else setAvailability((current) => current.filter((item) => item.id !== id))
  }

  function parseQuickAdd() {
    const input = quickText.trim()
    if (!input) return
    const parsed = parseQuickAddText(input, subjects, new Date())
    setQuickText('')
    setTopicDialog(true)
    setEditingTopic({
      id: '',
      user_id: userId,
      subject_id: parsed.subjectId ?? subjects[0]?.id ?? '',
      legacy_reminder_id: null,
      title: parsed.title,
      repeat_weekdays: parsed.repeatDays,
      spaced_repetition: false,
      anytime_today: !parsed.startTime,
      start_date: parsed.startDate,
      start_time: parsed.startTime,
      duration_minutes: parsed.durationMinutes ?? subjects.find((subject) => subject.id === parsed.subjectId)?.default_duration_minutes ?? subjects[0]?.default_duration_minutes ?? 45,
      goal: '',
      first_step: '',
      materials_url: '',
      next_due_date: null,
      last_reviewed_at: null,
      review_count: 0,
      lapse_count: 0,
      interval_days: 0,
      stability: null,
      difficulty: null,
      recall_probability: null,
      fsrs_state: null,
      skip_until: null,
      graduated_at: null,
      archived_at: null,
    })
  }

  async function moveBacklog() {
    const pending = [...overdueSessions]
    const updates: StudySession[] = []
    let planningSessions = [...sessions]
    for (const item of pending) {
      let found: { date: string; start: string } | undefined
      for (let offset = 1; offset <= 28 && !found; offset += 1) {
        const date = dateOffset(todayKey, offset)
        const slot = findFreeSlots(date, availability, planningSessions, item.session.duration_minutes, preferences.daily_cap_minutes, 1)[0]
        if (slot) found = { date, start: slot.start }
      }
      if (!found) continue
      const { error: updateError } = await client.from('study_sessions').update({
        scheduled_date: found.date,
        scheduled_time: found.start,
        status: 'planned',
        snoozed_until: null,
      }).eq('id', item.session.id).eq('user_id', userId)
      if (updateError) {
        setErrorMessage(`Some overdue sessions may have moved, but this session could not be rescheduled: ${updateError.message}`)
        void load()
        return
      }
      const updated = { ...item.session, scheduled_date: found.date, scheduled_time: found.start, status: 'planned' as const, snoozed_until: null }
      updates.push(updated)
      planningSessions = planningSessions.map((session) => session.id === updated.id ? updated : session)
    }
    setSessions((current) => current.map((session) => updates.find((updated) => updated.id === session.id) ?? session))
    setNoticeMessage(updates.length === pending.length
      ? 'Overdue sessions moved into your available study windows.'
      : `Moved ${updates.length} of ${pending.length}; add availability or free more time to place the rest.`)
  }

  async function softResetBacklog() {
    const overdueIds = overdueSessions.map((item) => item.session.id)
    if (!overdueIds.length) return
    const { error: sessionError } = await client.from('study_sessions').update({ status: 'skipped' })
      .in('id', overdueIds).eq('user_id', userId)
    if (sessionError) {
      setErrorMessage(`Could not reset the overdue queue: ${sessionError.message}`)
      return
    }
    const reviewTopics = [...new Set(overdueSessions.filter((item) => item.topic.spaced_repetition).map((item) => item.topic.id))]
    for (const topicId of reviewTopics) {
      const { error: topicError } = await client.from('study_topics').update({ next_due_date: dateOffset(todayKey, 1) })
        .eq('id', topicId).eq('user_id', userId)
      if (topicError) {
        setErrorMessage(`Backlog cleared, but a review could not be reset: ${topicError.message}`)
        void load()
        return
      }
    }
    setSessions((current) => current.map((session) => overdueIds.includes(session.id) ? { ...session, status: 'skipped' } : session))
    setTopics((current) => current.map((topic) => reviewTopics.includes(topic.id)
      ? { ...topic, next_due_date: dateOffset(todayKey, 1) }
      : topic))
    setNoticeMessage('Backlog reset. Your completed review history was kept.')
    void load()
  }

  const searchResults = topics.filter((topic) => {
    if (screen === 'archived' && !topic.archived_at && !topic.graduated_at) return false
    if (screen === 'skipped' && (topic.archived_at || topic.graduated_at || !topic.skip_until || topic.skip_until < todayKey)) return false
    const subject = subjectFor(topic)
    return !search.trim() || `${topic.title} ${topic.goal} ${subject?.name ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
  })
  const subjectOptions = subjects.filter((subject) => !subject.archived_at)
  const slotSuggestions = (() => {
    const suggestions: { topic: StudyTopic; date: string; start: string; end: string }[] = []
    for (let offset = 0; offset < 14 && suggestions.length < 8; offset += 1) {
      const date = dateOffset(todayKey, offset)
      const weekday = dateFromKey(date).getDay()
      for (const topic of activeTopics) {
        if (topic.skip_until && topic.skip_until >= date) continue
        const planned = sessions.some((session) =>
          session.topic_id === topic.id && session.scheduled_date === date && session.status !== 'skipped')
        const due = topic.spaced_repetition && topic.next_due_date && topic.next_due_date <= date
        const recurring = topic.repeat_weekdays.includes(weekday)
        if (planned || (!due && !recurring)) continue
        const slot = findFreeSlots(date, availability, [...sessions, ...suggestions.map((item) => ({
          id: `suggested-${item.topic.id}-${item.date}-${item.start}`,
          user_id: userId,
          topic_id: item.topic.id,
          scheduled_date: item.date,
          scheduled_time: item.start,
          duration_minutes: item.topic.duration_minutes,
          reason: 'study' as const,
          status: 'planned' as const,
          started_at: null,
          ended_at: null,
          actual_minutes: null,
          snoozed_until: null,
          created_at: '',
        }))], topic.duration_minutes, preferences.daily_cap_minutes, 1)[0]
        if (slot) suggestions.push({ topic, date, start: slot.start, end: slot.end })
        if (suggestions.length >= 8) break
      }
    }
    return suggestions
  })()
  const monthDays = Array.from({ length: 28 }, (_, index) => dateOffset(todayKey, index))
  const weeklyReviewSessions = sessions.filter((session) => session.scheduled_date >= dateOffset(todayKey, -6) && session.scheduled_date <= todayKey)
  const weeklyDone = weeklyReviewSessions.filter((session) => session.status === 'completed')
  const weeklyMissed = weeklyReviewSessions.filter((session) => ['planned', 'snoozed'].includes(session.status) && session.scheduled_date < todayKey)
  const recentReviews = reviews.slice(0, 10)
  const recallTrend = getRecallTrend(recentReviews)
  const recentWeekSessions = sessions.filter((session) => session.scheduled_date >= dateOffset(todayKey, -83) && session.scheduled_date <= todayKey)
  const onTimeSessions = recentWeekSessions.filter((session) => session.status === 'completed' && session.started_at && session.scheduled_time)
  const onTimeCount = onTimeSessions.filter((session) => {
    const scheduled = new Date(`${session.scheduled_date}T${session.scheduled_time}`)
    return new Date(session.started_at as string).getTime() <= scheduled.getTime() + 10 * 60_000
  }).length
  const completedByHour = recentWeekSessions.filter((session) => session.status === 'completed' && session.started_at)
    .reduce<Record<string, number>>((counts, session) => {
      const hour = String(new Date(session.started_at as string).getHours())
      counts[hour] = (counts[hour] ?? 0) + 1
      return counts
    }, {})
  const bestHour = Object.entries(completedByHour).sort((a, b) => b[1] - a[1])[0]?.[0]
  const weeklyTarget = subjectOptions.reduce((total, subject) => total + subject.weekly_target_minutes, 0)
  const projectedReadiness = activeTopics.map((topic) => ({
    topic,
    subject: subjectFor(topic),
    readiness: getReadiness(topic, subjectFor(topic)?.exam_date ?? null, new Date()),
  })).filter((item) => item.readiness != null && item.subject?.exam_date)

  function openTopic(topic: StudyTopic) {
    setEditingTopic(topic)
    setTopicDialog(true)
  }

  function addTopic() {
    setEditingTopic(null)
    setTopicDialog(true)
  }

  function renderTopicRow(topic: StudyTopic) {
    const subject = subjectFor(topic)
    const nextDate = getNextStudyDate(topic, todayKey, subject?.semester_end_date ?? null)
    const readiness = getReadiness(topic, subject?.exam_date ?? null, new Date())
    return <article className="sp-topic-card" key={topic.id}>
      <div className="sp-topic-main">
        <span className="sp-subject-dot" style={{ backgroundColor: subject?.color ?? '#89928a' }} />
        <div className="sp-topic-copy">
          <strong>{topic.title}</strong>
          <span>{subject?.name ?? 'Unknown subject'} · {topic.duration_minutes} min{topic.anytime_today ? ' · Anytime today' : topic.start_time ? ` · ${topic.start_time.slice(0, 5)}` : ''}</span>
          {topic.goal && <small>Goal: {topic.goal}</small>}
          {topic.first_step && <small>Start with: {topic.first_step}</small>}
          {topic.materials_url && <a href={topic.materials_url} target="_blank" rel="noreferrer">Open materials</a>}
        </div>
      </div>
      <div className="sp-topic-meta">
        {topic.spaced_repetition && <span>Next review {topic.next_due_date ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(dateFromKey(topic.next_due_date)) : 'not scheduled'}</span>}
        {!topic.spaced_repetition && <span>{topic.repeat_weekdays.length ? `Repeats ${topic.repeat_weekdays.map((day) => weekdayNames[day]).join(', ')}` : `Next ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(dateFromKey(nextDate))}`}</span>}
        {readiness != null && <span aria-label={`Recall readiness ${Math.round(Number(readiness) * 100)} percent`}>{Math.round(Number(readiness) * 100)}% readiness</span>}
        {topic.review_count > 0 && <span>{getRecallTrend(reviews.filter((review) => review.topic_id === topic.id)) === null
          ? 'Review history available'
          : `${Math.round((getRecallTrend(reviews.filter((review) => review.topic_id === topic.id)) ?? 0) * 100)}% recent Good/Easy`}</span>}
      </div>
      <details className="sp-overflow">
        <summary aria-label={`More actions for ${topic.title}`}><MoreHorizontal size={17} /></summary>
        <div className="sp-overflow-menu">
          <button onClick={() => openTopic(topic)}>Edit topic</button>
          <button onClick={() => { setTopicToSkip(topic); setSkipDate(dateOffset(todayKey, 7)) }}>Skip until…</button>
          <button onClick={() => void archiveTopic(topic)}>Archive</button>
          <button onClick={() => { setEditingSubject(subject ?? null); setSubjectDialog(true) }}>Edit subject</button>
        </div>
      </details>
    </article>
  }

  function renderQueueItem(item: QueuedStudySession) {
    const isActive = activeSession?.session.id === item.session.id
    const duration = isActive ? minutesSince(item.session.started_at, timerNow) : item.session.duration_minutes
    return <article className={`sp-queue-card ${isActive ? 'is-active' : ''}`} key={item.session.id}>
      <span className="sp-subject-dot" style={{ backgroundColor: item.subject.color }} />
      <div className="sp-queue-copy">
        <div className="sp-queue-title"><strong>{item.topic.title}</strong><span className={`sp-status sp-status-${item.bucket}`}>{item.bucket === 'overdue' ? 'Overdue' : item.bucket === 'due' ? 'Due now' : 'Later today'}</span></div>
        <span>{item.subject.name} · {item.session.scheduled_time?.slice(0, 5) ?? 'Anytime today'} · {item.session.duration_minutes} min · {item.session.reason === 'both' ? 'Study + review' : item.session.reason === 'review' ? 'Review' : 'Study'}</span>
        {item.topic.goal && <small>Goal: {item.topic.goal}</small>}
        {item.topic.first_step && <small>Start with: {item.topic.first_step}</small>}
        {isActive && <strong className="sp-timer">{duration} min elapsed</strong>}
      </div>
      <div className="sp-card-actions">
        <button className="button button-primary sp-action-button" onClick={() => isActive ? openCloseout(item) : void startSession(item)}><Play size={14} />{isActive ? 'Finish' : 'Start'}</button>
        <button className="button sp-action-button" onClick={() => openCloseout(item)}><Check size={14} />Done</button>
        <details className="sp-overflow">
          <summary aria-label={`More actions for ${item.topic.title}`}><MoreHorizontal size={17} /></summary>
          <div className="sp-overflow-menu">
            <button onClick={() => void snooze(item, 15)}>Snooze 15 min</button>
            <button onClick={() => void snooze(item, 60)}>Snooze 1 hour</button>
            <button onClick={() => openTopic(item.topic)}>Edit topic</button>
            <button onClick={() => { setTopicToSkip(item.topic); setSkipDate(dateOffset(todayKey, 7)) }}>Skip topic…</button>
            <button onClick={() => void archiveTopic(item.topic)}>Archive topic</button>
          </div>
        </details>
      </div>
    </article>
  }

  if (loading) return <div className="sp-loading" role="status">Loading your study planner…</div>

  return <section className="study-planner" aria-label="Study planner">
    <header className="sp-header">
      <div>
        <span className="sp-eyebrow">STUDY PLANNER</span>
        <h1>{screen === 'today' ? 'Today queue' : screen === 'planner' ? 'Plan your week' : screen === 'calendar' ? 'Study calendar' : screen === 'insights' ? 'Insights' : screen === 'weekly' ? 'Weekly review' : screen === 'upcoming' ? 'Upcoming' : screen === 'skipped' ? 'Skipped topics' : 'Archived topics'}</h1>
        <p>{screen === 'today' ? 'One focused queue: overdue first, then due now, then later today.' : 'Your study plan, history, and next steps in one place.'}</p>
      </div>
      <div className="sp-header-actions">
        <button className="button" onClick={() => setShowQuickAdd((value) => !value)}><Sparkles size={15} /> Quick add</button>
        <button className="button button-primary" onClick={addTopic}><Plus size={16} /> Add topic</button>
      </div>
    </header>

    {error && <div className="sp-alert sp-error" role="alert">{error}<button aria-label="Dismiss error" onClick={() => setError('')}><X size={15} /></button></div>}
    {notice && <div className="sp-alert sp-notice" role="status">{notice}</div>}

    <nav className="sp-nav" aria-label="Study planner sections">
      {([
        ['today', `Today${todayQueue.length ? ` · ${todayQueue.length}` : ''}`],
        ['upcoming', 'Upcoming'],
        ['planner', 'Planner'],
        ['calendar', 'Calendar'],
        ['insights', 'Insights'],
        ['weekly', 'Weekly review'],
        ['skipped', `Skipped${skippedTopics.length ? ` · ${skippedTopics.length}` : ''}`],
        ['archived', 'Archived'],
      ] as [Screen, string][]).map(([key, label]) => <button key={key} className={screen === key ? 'selected' : ''} onClick={() => setScreen(key)}>{label}</button>)}
    </nav>

    {showQuickAdd && <form className="sp-quick-add" onSubmit={(event) => { event.preventDefault(); parseQuickAdd() }}>
      <label htmlFor="sp-quick-text">Describe a session</label>
      <input id="sp-quick-text" value={quickText} onChange={(event) => setQuickText(event.target.value)} placeholder="Calc II derivatives Tue/Thu 7pm 45m" autoFocus />
      <button className="button button-primary" type="submit">Continue</button>
      <small>Dates, weekdays, times, and durations are parsed locally.</small>
    </form>}

    {screen === 'today' && <>
      {backlog >= preferences.catch_up_threshold && <aside className="sp-catch-up">
        <div><strong>{backlog} overdue sessions</strong><span>Catch up without losing your review history.</span></div>
        <button className="button" onClick={() => void moveBacklog()}>Reschedule into free slots</button>
        <button className="button" onClick={() => void softResetBacklog()}>Soft reset backlog</button>
      </aside>}
      {activeSession && <section className="sp-start-now">
        <div><span className="sp-eyebrow">START NOW</span><h2>{activeSession.topic.title}</h2><p>{activeSession.subject.name} · {minutesSince(activeSession.session.started_at, timerNow)} minutes elapsed</p></div>
        <button className="button button-primary" onClick={() => openCloseout(activeSession)}><Check size={15} /> Finish session</button>
      </section>}
      {!activeSession && nextNow && <section className="sp-start-now">
        <div><span className="sp-eyebrow">START NOW</span><h2>{nextNow.topic.title}</h2><p>{nextNow.subject.name} · {nextNow.session.duration_minutes} minutes{nextNow.topic.first_step ? ` · ${nextNow.topic.first_step}` : ''}</p></div>
        <button className="button button-primary" onClick={() => void startSession(nextNow)}><Play size={15} /> Start</button>
      </section>}
      <section className="sp-section">
        <div className="sp-section-heading"><div><h2>Today queue</h2><p>{overdueCount} overdue · {dueCount} due now · {todayQueue.length - overdueCount - dueCount} later today</p></div>
          <label className="sp-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by topic or subject" /></label>
        </div>
        {todayQueue.filter((item) => !search.trim() || `${item.topic.title} ${item.subject.name}`.toLowerCase().includes(search.trim().toLowerCase())).length
          ? <div className="sp-queue-list">{todayQueue.filter((item) => !search.trim() || `${item.topic.title} ${item.subject.name}`.toLowerCase().includes(search.trim().toLowerCase())).map(renderQueueItem)}</div>
          : <div className="sp-empty"><BookOpen size={22} /><strong>Your queue is clear</strong><span>Add a topic or check the upcoming planner for your next study block.</span><button className="button button-primary" onClick={addTopic}><Plus size={15} /> Add a topic</button></div>}
      </section>
    </>}

    {screen === 'upcoming' && <section className="sp-section">
      <div className="sp-section-heading"><div><h2>Upcoming sessions</h2><p>Next 40 days, grouped in date order.</p></div><label className="sp-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by topic or subject" /></label></div>
      {upcomingSessions.length ? <div className="sp-queue-list">{upcomingSessions.filter((session) => {
        const topic = topics.find((item) => item.id === session.topic_id)
        const subject = topic && subjectFor(topic)
        return !search.trim() || `${topic?.title ?? ''} ${subject?.name ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())
      }).map((session) => {
        const topic = topics.find((item) => item.id === session.topic_id)
        const subject = topic && subjectFor(topic)
        if (!topic || !subject) return null
        return <article className="sp-queue-card" key={session.id}><span className="sp-subject-dot" style={{ backgroundColor: subject.color }} /><div className="sp-queue-copy"><strong>{topic.title}</strong><span>{subject.name} · {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(dateFromKey(session.scheduled_date))} · {session.scheduled_time?.slice(0, 5) ?? 'Anytime'} · {session.duration_minutes} min</span></div><button className="button" onClick={() => openTopic(topic)}>Edit</button></article>
      })}</div> : <div className="sp-empty">No upcoming sessions yet.</div>}
      <div className="sp-topic-list">{activeTopics.filter((topic) => topic.repeat_weekdays.length || topic.spaced_repetition).map(renderTopicRow)}</div>
    </section>}

    {(screen === 'skipped' || screen === 'archived') && <section className="sp-section">
      <div className="sp-section-heading"><div><h2>{screen === 'skipped' ? 'Skipped until' : 'Archived and graduated'}</h2><p>{screen === 'skipped' ? 'These topics stay out of your queue until their skip date.' : 'Restore a topic whenever you want it back.'}</p></div></div>
      {searchResults.length ? <div className="sp-topic-list">{searchResults.map((topic) => <div className="sp-topic-restore" key={topic.id}>{renderTopicRow(topic)}<button className="button" onClick={() => void restoreTopic(topic)}>Restore</button></div>)}</div> : <div className="sp-empty">Nothing here right now.</div>}
    </section>}

    {screen === 'planner' && <div className="sp-two-column">
      <section className="sp-section">
        <div className="sp-section-heading"><div><h2>Free-slot suggestions</h2><p>Based on your availability, daily cap, and due topics.</p></div><button className="button" onClick={() => setAvailabilityDialog(true)}><Plus size={14} /> Add study window</button></div>
        {!availability.length && <div className="sp-inline-hint">Add your weekly free windows first. Sessions are not moved automatically.</div>}
        {slotSuggestions.length ? <div className="sp-suggestion-list">{slotSuggestions.map((slot) => <article className="sp-suggestion" key={`${slot.topic.id}-${slot.date}-${slot.start}`}><span className="sp-subject-dot" style={{ backgroundColor: subjectFor(slot.topic)?.color }} /><div><strong>{slot.topic.title}</strong><span>{subjectFor(slot.topic)?.name} · {new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(dateFromKey(slot.date))} · {slot.start}–{slot.end}</span></div><button className="button" onClick={() => void scheduleSlot(slot.topic, slot.date, slot.start)}>Schedule it</button></article>)}</div> : <div className="sp-empty">No free-slot suggestions. Add availability or a repeating/due topic.</div>}
        <div className="sp-availability-list">{availability.map((window) => <div key={window.id}><span><strong>{weekdayNames[window.weekday]}</strong> {window.start_time.slice(0, 5)}–{window.end_time.slice(0, 5)} · {window.label}</span><button className="icon-button" aria-label={`Remove ${window.label}`} onClick={() => void deleteAvailability(window.id)}><X size={14} /></button></div>)}</div>
      </section>
      <section className="sp-section">
        <div className="sp-section-heading"><div><h2>Subjects</h2><p>Targets, default session length, and exam dates.</p></div><button className="button" onClick={() => { setEditingSubject(null); setSubjectDialog(true) }}><Plus size={14} /> Add subject</button></div>
        {subjectOptions.length ? <div className="sp-subject-list">{subjectOptions.map((subject) => <article key={subject.id} className="sp-subject-card"><span className="sp-subject-dot" style={{ backgroundColor: subject.color }} /><div><strong>{subject.name}</strong><span>{Math.round(subject.weekly_target_minutes / 60)}h target / week · {subject.default_duration_minutes} min default</span>{subject.exam_date && <small>Exam {new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateFromKey(subject.exam_date))}</small>}</div><button className="button sp-subject-edit" aria-label={`Edit ${subject.name}`} onClick={() => { setEditingSubject(subject); setSubjectDialog(true) }}>Edit</button></article>)}</div> : <div className="sp-empty">Create a subject before adding topics.</div>}
      </section>
    </div>}

    {screen === 'calendar' && <section className="sp-section">
      <div className="sp-section-heading"><div><h2>Next 4 weeks</h2><p>Review sessions are summarized once per day.</p></div></div>
      <div className="sp-calendar-grid">{monthDays.map((date) => {
        const daySessions = sessions.filter((session) => session.scheduled_date === date && !['skipped', 'completed'].includes(session.status))
        const reviewCount = daySessions.filter((session) => session.reason === 'review' || session.reason === 'both').length
        const studyCount = daySessions.length - reviewCount
        return <article className={`sp-calendar-day ${date === todayKey ? 'is-today' : ''}`} key={date}><strong>{new Intl.DateTimeFormat('en', { weekday: 'short' }).format(dateFromKey(date))}</strong><span>{new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(dateFromKey(date))}</span>{reviewCount > 0 && <span className="sp-calendar-chip">{reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</span>}{studyCount > 0 && <span className="sp-calendar-chip sp-study-chip">{studyCount} {studyCount === 1 ? 'session' : 'sessions'}</span>}</article>
      })}</div>
    </section>}

    {screen === 'insights' && <div className="sp-insights">
      <section className="sp-insight-card"><span>Study this week</span><strong>{Math.round(completedMinutes / 60 * 10) / 10}h</strong><small>of {Math.round(weeklyTarget / 60 * 10) / 10}h subject targets</small></section>
      <section className="sp-insight-card"><span>Session adherence</span><strong>{weekSessions.length ? Math.round(completedWeekSessions.length / weekSessions.length * 100) : 0}%</strong><small>{completedWeekSessions.length} completed of {weekSessions.length} planned this week</small></section>
      <section className="sp-insight-card"><span>On-time starts</span><strong>{onTimeSessions.length ? `${Math.round(onTimeCount / onTimeSessions.length * 100)}%` : '—'}</strong><small>Started within 10 minutes of schedule</small></section>
      <section className="sp-insight-card"><span>Recall trend</span><strong>{recallTrend === null ? '—' : `${Math.round(recallTrend * 100)}%`}</strong><small>Good/Easy ratings across 10 recent reviews</small></section>
      <section className="sp-section sp-insights-full"><div className="sp-section-heading"><div><h2>Subject targets</h2><p>Completed study time compared with weekly target.</p></div></div>{subjectOptions.map((subject) => {
        const minutes = completedWeekSessions.filter((session) => topics.find((topic) => topic.id === session.topic_id)?.subject_id === subject.id).reduce((total, session) => total + (session.actual_minutes ?? 0), 0)
        const percent = subject.weekly_target_minutes ? Math.min(100, Math.round(minutes / subject.weekly_target_minutes * 100)) : 0
        return <div className="sp-progress-row" key={subject.id}><span>{subject.name}</span><div className="sp-progress-track"><i style={{ width: `${percent}%`, backgroundColor: subject.color }} /></div><small>{Math.round(minutes / 60 * 10) / 10}h / {Math.round(subject.weekly_target_minutes / 60 * 10) / 10}h</small></div>
      })}</section>
      <section className="sp-section sp-insights-full"><div className="sp-section-heading"><div><h2>Last 12 weeks</h2><p>Completed study load by day.</p></div><span>{bestHour ? `Most productive start: ${new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(new Date(2000, 0, 1, Number(bestHour)))}` : 'No completed sessions yet'}</span></div><div className="sp-heatmap">{Array.from({ length: 84 }, (_, index) => {
        const date = dateOffset(todayKey, index - 83)
        const minutes = sessions.filter((session) => session.scheduled_date === date && session.status === 'completed').reduce((total, session) => total + (session.actual_minutes ?? 0), 0)
        return <span key={date} title={`${date}: ${minutes} minutes`} data-level={minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4} />
      })}</div></section>
      <section className="sp-section sp-insights-full"><div className="sp-section-heading"><div><h2>Exam readiness</h2><p>Predicted recall based on FSRS state.</p></div></div>{projectedReadiness.length ? projectedReadiness.map(({ topic, subject, readiness }) => <div className="sp-readiness-row" key={topic.id}><span>{subject?.name} · {topic.title}</span><strong>{Math.round(Number(readiness ?? 0) * 100)}%</strong><small>by {subject?.exam_date}</small></div>) : <div className="sp-inline-hint">Add an exam date and complete spaced-repetition reviews to see readiness estimates.</div>}</section>
    </div>}

    {screen === 'weekly' && <section className="sp-section">
      <div className="sp-section-heading"><div><h2>Your week, closed out</h2><p>Planned versus done, what slipped, and what to adjust.</p></div><button className="button" onClick={() => setWeeklyReviewOpen(true)}>Open review</button></div>
      <div className="sp-review-summary"><div><strong>{weeklyDone.length}</strong><span>completed</span></div><div><strong>{weeklyReviewSessions.length}</strong><span>planned</span></div><div><strong>{weeklyMissed.length}</strong><span>slipped</span></div><div><strong>{Math.round(completedWeekSessions.reduce((total, item) => total + (item.actual_minutes ?? 0), 0) / 60 * 10) / 10}h</strong><span>focused</span></div></div>
      <h3>Suggested blocks for next week</h3>
      {slotSuggestions.slice(0, 5).map((slot) => <article className="sp-suggestion" key={`weekly-${slot.topic.id}-${slot.date}-${slot.start}`}><div><strong>{slot.topic.title}</strong><span>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(dateFromKey(slot.date))} · {slot.start}–{slot.end}</span></div><button className="button" onClick={() => void scheduleSlot(slot.topic, slot.date, slot.start)}>Schedule</button></article>)}
      {!availability.length && <div className="sp-inline-hint">Set weekly study windows in Planner to get suggested blocks.</div>}
    </section>}

    {topicDialog && <TopicEditor topic={editingTopic} subjects={subjectOptions} busy={busy} onCancel={() => { setTopicDialog(false); setEditingTopic(null) }} onCreateSubject={() => { setTopicDialog(false); setSubjectDialog(true) }} onSave={saveTopic} />}
    {subjectDialog && <SubjectEditor subject={editingSubject} busy={busy} onCancel={() => { setSubjectDialog(false); setEditingSubject(null) }} onSave={saveSubject} />}
    {availabilityDialog && <AvailabilityEditor onCancel={() => setAvailabilityDialog(false)} onSave={saveAvailability} />}
    {topicToSkip && <SkipDialog topic={topicToSkip} value={skipDate} onChange={setSkipDate} onCancel={() => setTopicToSkip(null)} onSave={() => void skipTopic(topicToSkip, skipDate)} />}
    {closeout && <CloseoutDialog item={closeout} rating={rating} note={reviewNote} busy={busy} onRating={setRating} onNote={setReviewNote} onCancel={() => setCloseout(null)} onSave={finishSession} />}
    {weeklyReviewOpen && <WeeklyReviewDialog done={weeklyDone.length} planned={weeklyReviewSessions.length} missed={weeklyMissed.length} onClose={() => setWeeklyReviewOpen(false)} />}
  </section>
}
