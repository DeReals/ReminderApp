import { createEmptyCard, fsrs, Rating, type Card, type Grade } from 'ts-fsrs'
import { parse as parseDateText } from 'chrono-node'
import type { QueueBucket, QueuedStudySession, RecallRating, StudyAvailability, StudySession, StudySubject, StudyTopic } from './types'

const scheduler = fsrs({ request_retention: 0.9, maximum_interval: 365 })
const ratingValues: Record<RecallRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
}

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function dateFromKey(value: string) {
  const [year = 0, month = 1, day = 1] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function getQueueBucket(session: StudySession, topic: StudyTopic, now: Date, leadMinutes = 0): QueueBucket {
  const today = localDateKey(now)
  if (session.scheduled_date < today) return 'overdue'
  if (session.scheduled_date > today) return 'later'
  if (topic.anytime_today || !session.scheduled_time) return 'due'

  const [hours = '0', minutes = '0'] = session.scheduled_time.split(':')
  const scheduledAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(hours), Number(minutes))
  const minutesUntil = (scheduledAt.getTime() - now.getTime()) / 60_000
  if (minutesUntil < -leadMinutes) return 'overdue'
  return minutesUntil <= leadMinutes ? 'due' : 'later'
}

export function buildTodayQueue(
  sessions: StudySession[],
  topics: StudyTopic[],
  subjects: StudySubject[],
  now: Date,
  leadMinutes = 0,
): QueuedStudySession[] {
  const topicsById = new Map(topics.map((topic) => [topic.id, topic]))
  const subjectsById = new Map(subjects.map((subject) => [subject.id, subject]))

  return sessions.flatMap((session) => {
    if (!['planned', 'started', 'snoozed'].includes(session.status)) return []
    const topic = topicsById.get(session.topic_id)
    const subject = topic && subjectsById.get(topic.subject_id)
    if (!topic || !subject || topic.archived_at || topic.skip_until && topic.skip_until >= localDateKey(now)) return []
    const bucket = getQueueBucket(session, topic, now, leadMinutes)
    const [hours = '0', minutes = '0'] = session.scheduled_time?.split(':') ?? []
    const scheduledAt = session.scheduled_time
      ? new Date(dateFromKey(session.scheduled_date).getFullYear(), dateFromKey(session.scheduled_date).getMonth(), dateFromKey(session.scheduled_date).getDate(), Number(hours), Number(minutes))
      : dateFromKey(session.scheduled_date)
    return [{ session, topic, subject, bucket, scheduledAt }]
  }).sort((a, b) => {
    const bucketOrder: Record<QueueBucket, number> = { overdue: 0, due: 1, later: 2 }
    if (bucketOrder[a.bucket] !== bucketOrder[b.bucket]) return bucketOrder[a.bucket] - bucketOrder[b.bucket]
    return a.scheduledAt.getTime() - b.scheduledAt.getTime()
  })
}

function restoreCard(state: Card | null, now: Date): Card {
  if (!state) return createEmptyCard(now)
  return {
    ...state,
    due: new Date(state.due),
    last_review: state.last_review ? new Date(state.last_review) : undefined,
  }
}

export function scheduleRecall(topic: StudyTopic, rating: RecallRating, now: Date) {
  const previous = restoreCard(topic.fsrs_state, now)
  const result = scheduler.next(previous, now, ratingValues[rating])
  const nextCard: Card = result.card
  const predictedRecall = scheduler.retrievability(nextCard, now)

  return {
    card: nextCard,
    fsrsState: nextCard,
    nextDueDate: localDateKey(nextCard.due),
    intervalDays: Math.max(0, Math.ceil((nextCard.due.getTime() - now.getTime()) / 86_400_000)),
    stability: nextCard.stability,
    difficulty: nextCard.difficulty,
    predictedRecall,
    lapseCount: Math.max(nextCard.lapses, topic.lapse_count + Number(rating === 'again')),
    reviewCount: topic.review_count + 1,
  }
}

export function getRecallTrend(reviews: { rating: RecallRating }[]) {
  const recent = reviews.slice(0, 10)
  if (!recent.length) return null
  const positive = recent.filter((review) => review.rating === 'good' || review.rating === 'easy').length
  return positive / recent.length
}

export function nextLocalDate(date: Date, days: number) {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  next.setDate(next.getDate() + days)
  return next
}

export function getReadiness(topic: StudyTopic, examDate: string | null, now: Date) {
  if (!examDate || !topic.fsrs_state) return null
  const card = restoreCard(topic.fsrs_state, now)
  return scheduler.retrievability(card, dateFromKey(examDate))
}

export function planExamAwareDueDate(
  proposedDate: string,
  today: string,
  examDate: string | null,
  semesterEndDate: string | null,
) {
  if (examDate && examDate <= today || semesterEndDate && semesterEndDate <= today) {
    return { date: null, graduated: true }
  }
  let date = proposedDate < today ? today : proposedDate
  const examDeadline = examDate ? localDateKey(nextLocalDate(dateFromKey(examDate), -1)) : null
  const deadline = examDeadline && semesterEndDate
    ? examDeadline < semesterEndDate ? examDeadline : semesterEndDate
    : examDeadline ?? semesterEndDate
  if (deadline && date > deadline) date = deadline < today ? today : deadline
  return { date, graduated: false }
}

export function scaleIntervalForExam(intervalDays: number, daysUntilExam: number) {
  if (daysUntilExam <= 2) return 1
  return Math.max(1, Math.min(intervalDays, Math.floor(daysUntilExam / 3)))
}

export function getNextStudyDate(topic: StudyTopic, today: string, semesterEndDate: string | null = null) {
  if (topic.skip_until && topic.skip_until > today) return topic.skip_until
  if (topic.spaced_repetition && topic.next_due_date) return topic.next_due_date < today ? today : topic.next_due_date
  if (!topic.repeat_weekdays.length) return topic.start_date
  const date = dateFromKey(topic.start_date > today ? topic.start_date : today)
  for (let offset = 0; offset < 7; offset += 1) {
    const candidate = nextLocalDate(date, offset)
    if (semesterEndDate && localDateKey(candidate) > semesterEndDate) return semesterEndDate
    if (topic.repeat_weekdays.includes(candidate.getDay())) return localDateKey(candidate)
  }
  return today
}

export function getMinutes(value: string | null) {
  if (!value) return null
  const [hours = '0', minutes = '0'] = value.split(':')
  return Number(hours) * 60 + Number(minutes)
}

export function parseQuickAddText(
  input: string,
  subjects: Pick<StudySubject, 'id' | 'name'>[],
  now: Date,
) {
  const parsedDate = parseDateText(input, now, { forwardDate: true })[0]
  const timeMatch = input.match(/\b(?:(\d{1,2})(?::([0-5]\d))?\s*([ap]m)|([01]?\d|2[0-3]):([0-5]\d))\b/i)
  let hour = Number(timeMatch?.[1] ?? timeMatch?.[4])
  const minute = Number(timeMatch?.[2] ?? timeMatch?.[5] ?? 0)
  const meridiem = timeMatch?.[3]?.toLowerCase()
  if (meridiem === 'pm' && hour < 12) hour += 12
  if (meridiem === 'am' && hour === 12) hour = 0
  const time = timeMatch
    ? `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    : null
  const duration = input.match(/\b(\d{1,3})\s*(m|min|minutes|h|hr|hours)\b/i)
  const durationMinutes = duration
    ? Number(duration[1]) * (/^(h|hr|hours)$/i.test(duration[2] ?? '') ? 60 : 1)
    : null
  const dayMatches = [...input.matchAll(/\b(sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/gi)]
  const daysByToken: Record<string, number> = {
    sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tues: 2, tuesday: 2, wed: 3, wednesday: 3,
    thu: 4, thur: 4, thurs: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
  }
  const repeatDays = [...new Set(dayMatches
    .map((match) => daysByToken[(match[1] ?? '').toLowerCase()])
    .filter((day): day is number => day !== undefined && Number.isInteger(day)))].sort((a, b) => a - b)
  const matchedSubject = [...subjects]
    .sort((a, b) => b.name.length - a.name.length)
    .find((subject) => input.toLowerCase().startsWith(subject.name.toLowerCase()))
  const topicText = matchedSubject ? input.slice(matchedSubject.name.length) : input
  const title = topicText
    .replace(parsedDate?.text ?? '', '')
    .replace(timeMatch?.[0] ?? '', '')
    .replace(duration?.[0] ?? '', '')
    .replace(/\b(sun|sunday|mon|monday|tue|tues|tuesday|wed|wednesday|thu|thur|thurs|thursday|fri|friday|sat|saturday)\b/gi, '')
    .replace(/[\/,]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    title,
    subjectId: matchedSubject?.id ?? null,
    repeatDays,
    startDate: parsedDate ? localDateKey(parsedDate.start.date()) : localDateKey(now),
    startTime: time,
    durationMinutes,
  }
}

export function generateStudyOccurrences(topics: StudyTopic[], fromDate: string, throughDate: string) {
  const occurrences = new Map<string, { topic: StudyTopic; date: string; reason: StudySession['reason'] }>()
  for (const topic of topics) {
    if (topic.archived_at || topic.graduated_at) continue
    const addOccurrence = (date: string, reason: StudySession['reason']) => {
      if (date < fromDate || date > throughDate || date < topic.start_date) return
      if (topic.skip_until && date <= topic.skip_until) return
      const key = `${topic.id}:${date}`
      const current = occurrences.get(key)
      occurrences.set(key, {
        topic,
        date,
        reason: current?.reason === reason || current?.reason === 'both' || reason === 'both'
          ? 'both'
          : current ? 'both' : reason,
      })
    }

    if (topic.repeat_weekdays.length) {
      for (let date = dateFromKey(fromDate); localDateKey(date) <= throughDate; date = nextLocalDate(date, 1)) {
        const key = localDateKey(date)
        if (topic.repeat_weekdays.includes(date.getDay())) addOccurrence(key, 'study')
      }
    } else if (!topic.spaced_repetition) {
      addOccurrence(topic.start_date, 'study')
    }

    if (topic.spaced_repetition && topic.next_due_date) {
      addOccurrence(topic.next_due_date < fromDate ? fromDate : topic.next_due_date, 'review')
    }
  }
  return [...occurrences.values()]
}

export function findFreeSlots(
  date: string,
  availability: StudyAvailability[],
  sessions: StudySession[],
  durationMinutes: number,
  dailyCapMinutes: number,
  maxSlots = 3,
) {
  const day = dateFromKey(date).getDay()
  const busy = sessions
    .filter((session) => session.scheduled_date === date && session.status !== 'skipped' && session.scheduled_time)
    .map((session) => {
      const start = getMinutes(session.scheduled_time) ?? 0
      return { start, end: start + session.duration_minutes }
    })
  const plannedMinutes = sessions
    .filter((session) => session.scheduled_date === date && session.status !== 'skipped')
    .reduce((total, session) => total + session.duration_minutes, 0)
  if (plannedMinutes + durationMinutes > dailyCapMinutes) return []

  const slots: { date: string; start: string; end: string }[] = []
  for (const window of availability
    .filter((item) => item.active && item.weekday === day)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))) {
    const startBoundary = getMinutes(window.start_time) ?? 0
    const endBoundary = getMinutes(window.end_time) ?? 0
    for (let start = startBoundary; start + durationMinutes <= endBoundary; start += 15) {
      const end = start + durationMinutes
      if (busy.some((slot) => start < slot.end && end > slot.start)) continue
      slots.push({
        date,
        start: `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`,
        end: `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`,
      })
      if (slots.length >= maxSlots) return slots
    }
  }
  return slots
}

