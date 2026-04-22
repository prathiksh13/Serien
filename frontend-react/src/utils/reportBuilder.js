function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

const PRIORITY_EMOTIONS = ['sad', 'angry', 'fearful']

function safePercent(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 100)
}

function getDominantEmotion(timeline = []) {
  const bucket = timeline.reduce((acc, item) => {
    const emotion = String(item?.emotion || '').toLowerCase()
    if (!emotion) return acc
    acc[emotion] = (acc[emotion] || 0) + 1
    return acc
  }, {})

  const dominant = Object.entries(bucket).sort((a, b) => b[1] - a[1])[0]
  if (!dominant) return 'neutral'
  return dominant[0]
}

function computeAverage(values = []) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length
}

function buildStressSeries(timeline = []) {
  return timeline.map((item) => {
    if (typeof item?.stressScore === 'number') return item.stressScore

    const expressions = item?.expressions || {}
    const stressValue =
      (Number(expressions.sad || 0) +
        Number(expressions.angry || 0) +
        Number(expressions.fearful || 0) +
        Number(expressions.disgusted || 0)) /
      4
    return clamp(stressValue, 0, 1)
  })
}

function buildRiskLabel({ sadAvg = 0, angryAvg = 0, fearfulAvg = 0, stressSeries = [] }) {
  const averageStress = stressSeries.length
    ? stressSeries.reduce((sum, value) => sum + value, 0) / stressSeries.length
    : (sadAvg * 0.34) + (angryAvg * 0.38) + (fearfulAvg * 0.28)

  if (averageStress >= 0.62) return 'High'
  if (averageStress >= 0.35) return 'Medium'
  return 'Low'
}

function resolvePriorityEmotion({ averages = {}, dominantEmotion = 'neutral' }) {
  const rankedPriority = PRIORITY_EMOTIONS
    .map((emotion) => ({ emotion, score: Number(averages[emotion] || 0) }))
    .sort((a, b) => b.score - a.score)

  const topPriority = rankedPriority[0] || { emotion: 'sad', score: 0 }
  const hasMeaningfulPriority = rankedPriority.some((entry) => entry.score >= 0.18)

  if (dominantEmotion === 'neutral' && hasMeaningfulPriority) {
    return {
      selectedEmotion: topPriority.emotion,
      isNeutralDominant: true,
      hasMeaningfulPriority,
      rankedPriority,
    }
  }

  if (PRIORITY_EMOTIONS.includes(dominantEmotion)) {
    return {
      selectedEmotion: dominantEmotion,
      isNeutralDominant: false,
      hasMeaningfulPriority,
      rankedPriority,
    }
  }

  return {
    selectedEmotion: hasMeaningfulPriority ? topPriority.emotion : dominantEmotion,
    isNeutralDominant: dominantEmotion === 'neutral',
    hasMeaningfulPriority,
    rankedPriority,
  }
}

function buildAiSummary({ dominantEmotion, firstEmotion, lastEmotion, riskLabel, prioritizedEmotion, averages = {} }) {
  const neutralAvg = Math.round((Number(averages.neutral || 0)) * 100)
  const sadAvg = Math.round((Number(averages.sad || 0)) * 100)
  const angryAvg = Math.round((Number(averages.angry || 0)) * 100)
  const fearfulAvg = Math.round((Number(averages.fearful || 0)) * 100)

  const startText = firstEmotion ? `started with ${firstEmotion}` : 'started without a clear trend'
  const endText = lastEmotion ? `ended with ${lastEmotion}` : 'ended without a clear trend'
  const instabilityText = dominantEmotion === 'neutral' && (sadAvg > 12 || angryAvg > 10 || fearfulAvg > 10)
    ? 'Neutral expressions were frequent, but meaningful sadness and stress signals indicate emotional instability requiring attention.'
    : 'Observed emotions suggest the session remained behaviorally interpretable without strong masking by neutral affect.'

  return `The patient ${startText} and ${endText}. Expressions were mostly ${dominantEmotion} (neutral ${neutralAvg}%), with sad ${sadAvg}%, angry ${angryAvg}%, and fearful ${fearfulAvg}%. Prioritized clinical focus is ${prioritizedEmotion}. ${instabilityText} Emotional risk was assessed as ${riskLabel}.`
}

function buildSuggestions({ riskLabel, topPriority = [], averages = {} }) {
  const topNames = topPriority.map((entry) => entry.emotion)
  const hasSad = topNames.includes('sad') || Number(averages.sad || 0) >= 0.2
  const hasFear = topNames.includes('fearful') || Number(averages.fearful || 0) >= 0.2
  const hasAngry = topNames.includes('angry') || Number(averages.angry || 0) >= 0.2

  if (hasSad && hasFear) {
    return [
      'Continue therapy sessions weekly and add structured stress management routines.',
      'Introduce breathwork, sleep hygiene, and daily emotional journaling between sessions.',
      'Use cognitive reframing prompts to reduce fear-linked anticipation and sadness spirals.',
    ]
  }

  if (hasAngry) {
    return [
      'Add anger regulation exercises and trigger mapping with post-session reflection.',
      'Use grounding techniques during high-arousal periods and review de-escalation plans weekly.',
      'Track frustration spikes and pair them with coping actions in daily logs.',
    ]
  }

  if (riskLabel === 'High') {
    return [
      'Schedule frequent follow-up sessions within the next 3 to 5 days.',
      'Introduce guided stress management techniques and grounding exercises.',
      'Coordinate a therapist follow-up plan with clear safety check-ins.',
    ]
  }

  if (riskLabel === 'Medium') {
    return [
      'Continue regular sessions and monitor stress triggers closely.',
      'Reinforce breathing routines and practical coping strategies.',
      'Plan therapist follow-up to review emotional progress next session.',
    ]
  }

  return [
    'Continue sessions to maintain positive emotional stability.',
    'Encourage daily mindfulness and preventive stress management.',
    'Keep therapist follow-up focused on sustaining healthy routines.',
  ]
}

export function buildTheraSenseReport({
  sessionId,
  patientId,
  therapistId,
  patientName,
  therapistName,
  timeline = [],
  labels = [],
  happy = [],
  neutral = [],
  sad = [],
  angry = [],
  fearful = [],
  sessionNotes = '',
  sessionStart,
  sessionEnd,
}) {
  const stress = buildStressSeries(timeline)
  const dominantEmotion = getDominantEmotion(timeline)
  const firstEmotion = timeline[0]?.emotion ? String(timeline[0].emotion).toLowerCase() : ''
  const lastEmotion = timeline[timeline.length - 1]?.emotion ? String(timeline[timeline.length - 1].emotion).toLowerCase() : ''
  const avgHappy = computeAverage(happy)
  const avgNeutral = computeAverage(neutral)
  const avgSad = computeAverage(sad)
  const avgAngry = computeAverage(angry)
  const avgFearful = computeAverage(fearful)

  const riskLabel = buildRiskLabel({
    sadAvg: avgSad,
    angryAvg: avgAngry,
    fearfulAvg: avgFearful,
    stressSeries: stress,
  })

  const averages = {
    happy: avgHappy,
    neutral: avgNeutral,
    sad: avgSad,
    angry: avgAngry,
    fearful: avgFearful,
  }

  const priorityDetails = resolvePriorityEmotion({ averages, dominantEmotion })
  const totalReadings = timeline.length

  const mixTotal = avgHappy + avgNeutral + avgSad + avgAngry + avgFearful
  const breakdown = {
    happy: safePercent(avgHappy, mixTotal),
    neutral: safePercent(avgNeutral, mixTotal),
    sad: safePercent(avgSad, mixTotal),
    angry: safePercent(avgAngry, mixTotal),
    fearful: safePercent(avgFearful, mixTotal),
  }

  const neutralMasking = priorityDetails.isNeutralDominant && priorityDetails.hasMeaningfulPriority
    ? ' Neutral signals were frequent, but critical emotions indicate underlying instability.'
    : ''

  const normalizedSummary = `Dominant emotion was ${dominantEmotion}, with prioritized attention on ${priorityDetails.selectedEmotion} and a ${riskLabel.toLowerCase()} risk profile.${neutralMasking}`
  const aiSummary = buildAiSummary({
    dominantEmotion,
    firstEmotion,
    lastEmotion,
    riskLabel,
    prioritizedEmotion: priorityDetails.selectedEmotion,
    averages,
  })

  const suggestions = buildSuggestions({
    riskLabel,
    topPriority: priorityDetails.rankedPriority.slice(0, 2),
    averages,
  })
  const durationMinutes = Math.max(
    1,
    Math.round(((sessionEnd?.getTime?.() || Date.now()) - (sessionStart?.getTime?.() || Date.now())) / 60000)
  )

  const summary = sessionNotes?.trim()
    ? `${normalizedSummary} Therapist notes: ${sessionNotes.trim()}`
    : normalizedSummary

  return {
    sessionId: sessionId || '',
    patientId: patientId || '',
    therapistId: therapistId || '',
    patientName: patientName || 'Unknown Patient',
    therapistName: therapistName || 'Therapist',
    summary,
    emotionSummary: normalizedSummary,
    emotionData: {
      labels,
      happy,
      neutral,
      sad,
      angry,
      fearful,
      stress,
      timeline,
      dominantEmotion,
      prioritizedEmotion: priorityDetails.selectedEmotion,
      priorityEmotions: PRIORITY_EMOTIONS,
      breakdown,
      aiSummary,
      suggestions,
      riskIndicator: riskLabel,
      sessionNotes: sessionNotes || '',
      durationMinutes,
      sessionDateTime: sessionEnd ? sessionEnd.toISOString() : new Date().toISOString(),
    },
  }
}
