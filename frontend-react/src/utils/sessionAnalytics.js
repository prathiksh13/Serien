const STRESS_EMOTIONS = ['angry', 'fearful', 'sad', 'disgusted']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function calculateStressScore(expressions = {}) {
  const angry = Number(expressions.angry || 0)
  const fearful = Number(expressions.fearful || 0)
  const sad = Number(expressions.sad || 0)
  const disgusted = Number(expressions.disgusted || 0)
  const happy = Number(expressions.happy || 0)
  const neutral = Number(expressions.neutral || 0)

  const rawScore = angry * 1 + fearful * 0.95 + sad * 0.75 + disgusted * 0.85 - happy * 0.35 - neutral * 0.2
  return clamp(rawScore, 0, 1)
}

export function deriveMoodState(expressions = {}, topEmotion = '') {
  const score = calculateStressScore(expressions)
  const normalizedTopEmotion = String(topEmotion || '').toLowerCase()

  if (score >= 0.72 || STRESS_EMOTIONS.includes(normalizedTopEmotion)) return 'Stressed'
  if (score >= 0.45) return 'Concerned'
  if (normalizedTopEmotion === 'happy') return 'Positive'
  if (normalizedTopEmotion === 'neutral') return 'Stable'
  return 'Neutral'
}

export function buildSessionMetadata({
  sessionId,
  therapistId,
  patientId,
  startedAt,
  endedAt,
  timeline = [],
  alertEvents = [],
  moodTransitions = [],
}) {
  const durationMs = endedAt && startedAt ? endedAt.getTime() - startedAt.getTime() : 0
  const durationSeconds = Math.max(0, Math.round(durationMs / 1000))
  const durationMinutes = Math.max(0, Math.round(durationSeconds / 60))

  const stressSamples = timeline.map((item) => ({
    time: item.time,
    emotion: item.emotion,
    score: item.stressScore || 0,
  }))

  const peakStressMoments = stressSamples
    .filter((entry) => entry.score >= 0.72)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)

  const averageStressScore = stressSamples.length
    ? Number((stressSamples.reduce((sum, entry) => sum + entry.score, 0) / stressSamples.length).toFixed(3))
    : 0

  const maxStressScore = stressSamples.length ? Math.max(...stressSamples.map((entry) => entry.score)) : 0

  return {
    sessionId,
    therapistId,
    patientId,
    startedAt,
    endedAt,
    durationSeconds,
    durationMinutes,
    averageStressScore,
    maxStressScore,
    peakStressMoments,
    moodChanges: moodTransitions,
    liveAlerts: alertEvents,
    totalReadings: timeline.length,
  }
}
