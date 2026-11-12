import { describe, expect, it } from 'vitest'
import {
  buildTodayQueue,
  dateFromKey,
  findFreeSlots,
  generateStudyOccurrences,
  listAvailableStudySlots,
  localDateKey,
  nextLocalDate,
  parseQuickAddText,
  planExamAwareDueDate,
  scaleIntervalForExam,
  scheduleRecall,
  suggestStudySlots,
} from './scheduling'
import type { StudyAvailability, StudySession, StudySubject, StudyTopic } from './types'

const subject: StudySubject = {
  id: 'subject-1',
  user_id: 'user-1',
  name: 'Calculus',
  color: '#568467',
  weekly_target_minutes: 180,
  default_duration_minutes: 45,
  exam_date: null,
  semester_end_date: null,
  archived_at: null,
  created_at: '2026-01-01T00:00:00.000Z',
}

function topic(id: string, updates: Partial<StudyTopic> = {}): StudyTopic {
  return {
    id,
    user_id: 'user-1',
    subject_id: subject.id,
    legacy_reminder_id: null,
    title: id,
    repeat_weekdays: [],
    spaced_repetition: false,
    anytime_today: false,
    start_date: '2026-01-01',
    start_time: null,
    duration_minutes: 45,
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
    ...updates,
  }
}

function session(id: string, topicId: string, date: string, time: string | null, updates: Partial<StudySession> = {}): StudySession {
  return {
    id,
    user_id: 'user-1',
    topic_id: topicId,
    scheduled_date: date,
    scheduled_time: time,
    duration_minutes: 45,
    reason: 'study',
    status: 'planned',
    started_at: null,
    ended_at: null,
    actual_minutes: null,
    snoozed_until: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...updates,
  }
}

describe('study queue scheduling', () => {
  it('orders overdue, due, and later sessions in that order', () => {
    const now = new Date(2026, 3, 5, 10, 0)
    const topics = [topic('late'), topic('now'), topic('later')]
    const sessions = [
      session('later-session', 'later', '2026-04-05', '11:00'),
      session('due-session', 'now', '2026-04-05', '10:10'),
      session('late-session', 'late', '2026-04-04', '09:00'),
    ]

    const queue = buildTodayQueue(sessions, topics, [subject], now, 15)

    expect(queue.map((item) => item.topic.id)).toEqual(['late', 'now', 'later'])
    expect(queue.map((item) => item.bucket)).toEqual(['overdue', 'due', 'later'])
  })

  it('treats anytime-today sessions as ready now and honors skip and archive', () => {
    const now = new Date(2026, 3, 5, 10, 0)
    const topics = [
      topic('anytime', { anytime_today: true }),
      topic('skipped', { skip_until: '2026-04-06' }),
      topic('archived', { archived_at: '2026-04-01T00:00:00.000Z' }),
    ]

    const queue = buildTodayQueue([
      session('anytime-session', 'anytime', '2026-04-05', null),
      session('skipped-session', 'skipped', '2026-04-05', '09:00'),
      session('archived-session', 'archived', '2026-04-05', '09:00'),
    ], topics, [subject], now)

    expect(queue).toHaveLength(1)
    expect(queue[0]?.bucket).toBe('due')
  })

  it('advances calendar dates across month-end and leap day', () => {
    expect(localDateKey(nextLocalDate(dateFromKey('2024-02-28'), 1))).toBe('2024-02-29')
    expect(localDateKey(nextLocalDate(dateFromKey('2024-02-29'), 1))).toBe('2024-03-01')
    expect(localDateKey(nextLocalDate(dateFromKey('2026-01-31'), 1))).toBe('2026-02-01')
  })

  it('keeps date keys stable when advancing across daylight-saving time', () => {
    const beforeSpringForward = dateFromKey('2026-03-08')
    expect(localDateKey(nextLocalDate(beforeSpringForward, 1))).toBe('2026-03-09')
    expect(localDateKey(nextLocalDate(dateFromKey('2026-11-01'), 1))).toBe('2026-11-02')
  })

  it('creates recurring sessions and combines a review due on the same day', () => {
    const recurring = topic('recurring', {
      repeat_weekdays: [0],
      spaced_repetition: true,
      next_due_date: '2026-04-05',
    })
    const occurrences = generateStudyOccurrences([recurring], '2026-04-05', '2026-04-12')

    expect(occurrences).toHaveLength(2)
    expect(occurrences.find((item) => item.date === '2026-04-05')?.reason).toBe('both')
    expect(occurrences.find((item) => item.date === '2026-04-12')?.reason).toBe('study')
  })

  it('parses a subject, weekly days, time, and duration from quick add', () => {
    const parsed = parseQuickAddText('Calc II derivatives Tue/Thu 7pm 45m', [
      { id: 'calc', name: 'Calc II' },
      { id: 'chem', name: 'Chemistry' },
    ], new Date(2026, 3, 5, 12))

    expect(parsed).toMatchObject({
      title: 'derivatives',
      subjectId: 'calc',
      repeatDays: [2, 4],
      startDate: '2026-04-07',
      startTime: '19:00',
      durationMinutes: 45,
    })
  })

  it('moves a past-due spaced repetition into today instead of generating historical repeats', () => {
    const overdue = topic('overdue-review', {
      spaced_repetition: true,
      next_due_date: '2026-03-01',
    })
    const occurrences = generateStudyOccurrences([overdue], '2026-04-05', '2026-04-12')
    expect(occurrences.map((item) => item.date)).toEqual(['2026-04-05'])
  })

  it('suggests free slots without overlaps and respects the daily cap', () => {
    const availability: StudyAvailability[] = [{
      id: 'window',
      user_id: 'user-1',
      week_start: '2026-04-05',
      label: 'Free time',
      weekday: 0,
      start_time: '09:00',
      end_time: '12:00',
      active: true,
    }]
    const existing = session('busy', 'other', '2026-04-05', '09:30', { duration_minutes: 45 })

    const slots = findFreeSlots('2026-04-05', availability, [existing], 45, 120)

    expect(slots.map((slot) => slot.start)).toEqual(['10:15', '10:30', '10:45'])
    expect(findFreeSlots('2026-04-05', availability, [existing], 90, 100)).toEqual([])
  })

  it('lists available gaps of at least 30 minutes between 8 AM and 10 PM', () => {
    const availability: StudyAvailability[] = [{
      id: 'window',
      user_id: 'user-1',
      week_start: '2026-04-05',
      label: 'Sunday study window',
      weekday: 0,
      start_time: '07:00',
      end_time: '23:00',
      active: true,
    }]
    const existing = session('busy', 'other', '2026-04-05', '09:30')

    const slots = listAvailableStudySlots(['2026-04-05'], availability, [existing])

    expect(slots).toEqual([
      { date: '2026-04-05', start: '08:00', end: '09:30', maxDurationMinutes: 90 },
      { date: '2026-04-05', start: '10:15', end: '22:00', maxDurationMinutes: 705 },
    ])
    expect(listAvailableStudySlots(['2026-04-05'], availability, [existing], 120)).toHaveLength(1)
  })

  it('does not reuse availability saved for a different week', () => {
    const availability: StudyAvailability[] = [{
      id: 'old-window',
      user_id: 'user-1',
      week_start: '2026-03-29',
      label: 'Last week',
      weekday: 0,
      start_time: '09:00',
      end_time: '12:00',
      active: true,
    }]

    expect(listAvailableStudySlots(['2026-04-05'], availability, [])).toEqual([])
  })

  it('suggests recurring study in an available gap after existing calendar sessions', () => {
    const availability: StudyAvailability[] = [{
      id: 'window',
      user_id: 'user-1',
      week_start: '2026-04-05',
      label: 'Sunday study window',
      weekday: 0,
      start_time: '09:00',
      end_time: '12:00',
      active: true,
    }]
    const recurring = topic('recurring', { repeat_weekdays: [0] })
    const existing = session('busy', 'other', '2026-04-05', '09:00')

    expect(suggestStudySlots([recurring], ['2026-04-05'], availability, [existing], 180))
      .toEqual([{ topic: recurring, date: '2026-04-05', start: '09:45', end: '10:30' }])
  })

  it('suggests a one-off topic once in the current planning range', () => {
    const availability: StudyAvailability[] = [0, 1].map((weekday) => ({
      id: `window-${weekday}`,
      user_id: 'user-1',
      week_start: '2026-04-05',
      label: 'Study window',
      weekday,
      start_time: '09:00',
      end_time: '12:00',
      active: true,
    }))
    const oneOff = topic('one-off')

    expect(suggestStudySlots([oneOff], ['2026-04-05', '2026-04-06'], availability, [], 180))
      .toHaveLength(1)
  })

  it('suggests an overdue review once instead of repeating it every day', () => {
    const availability: StudyAvailability[] = [0, 1].map((weekday) => ({
      id: `window-${weekday}`,
      user_id: 'user-1',
      week_start: '2026-04-05',
      label: 'Study window',
      weekday,
      start_time: '09:00',
      end_time: '12:00',
      active: true,
    }))
    const overdueReview = topic('overdue-review', {
      spaced_repetition: true,
      next_due_date: '2026-04-04',
    })

    expect(suggestStudySlots([overdueReview], ['2026-04-05', '2026-04-06'], availability, [], 180))
      .toHaveLength(1)
  })

  it('caps exam reviews and graduates topics after the term', () => {
    expect(planExamAwareDueDate('2026-06-10', '2026-06-01', '2026-06-05', null))
      .toEqual({ date: '2026-06-04', graduated: false })
    expect(planExamAwareDueDate('2026-06-10', '2026-06-06', '2026-06-05', null))
      .toEqual({ date: null, graduated: true })
    expect(scaleIntervalForExam(30, 6)).toBe(2)
  })

  it.each(['again', 'hard', 'good', 'easy'] as const)('schedules a future FSRS state after rating %s', (rating) => {
    const now = new Date('2026-04-05T10:00:00.000Z')
    const result = scheduleRecall(topic('topic'), rating, now)

    expect(result.card.due.getTime()).toBeGreaterThan(now.getTime())
    expect(result.nextDueDate.localeCompare(localDateKey(now))).toBeGreaterThanOrEqual(0)
    expect(result.lapseCount).toBe(rating === 'again' ? 1 : 0)
  })

  it('shortens a mature review interval after an Again rating', () => {
    let reviewedTopic = topic('mature')
    let reviewedAt = new Date('2026-04-05T10:00:00.000Z')
    let intervalDays = 0
    for (let index = 0; index < 8; index += 1) {
      const result = scheduleRecall(reviewedTopic, 'good', reviewedAt)
      intervalDays = result.intervalDays
      reviewedTopic = {
        ...reviewedTopic,
        fsrs_state: result.fsrsState,
        review_count: result.reviewCount,
        lapse_count: result.lapseCount,
        interval_days: result.intervalDays,
      }
      reviewedAt = result.card.due
    }

    const lapse = scheduleRecall(reviewedTopic, 'again', reviewedAt)
    expect(lapse.lapseCount).toBe(reviewedTopic.lapse_count + 1)
    expect(lapse.intervalDays).toBeLessThan(intervalDays)
  })
})
