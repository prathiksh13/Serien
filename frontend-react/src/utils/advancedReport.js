const NEGATIVE_EMOTIONS = new Set(['sad', 'angry', 'fearful', 'disgusted'])

function scoreFromEmotionLabel(emotion = '') {
  const normalized = String(emotion).toLowerCase()
  if (normalized === 'happy' || normalized === 'surprised') return 0.7
  if (normalized === 'neutral') return 0.2
  if (NEGATIVE_EMOTIONS.has(normalized)) return -0.8
  return 0
}

function scoreFromExpressions(expressions = {}) {
  const happy = Number(expressions.happy || 0)
  const neutral = Number(expressions.neutral || 0)
  const sad = Number(expressions.sad || 0)
  const angry = Number(expressions.angry || 0)
  const fearful = Number(expressions.fearful || 0)
  const disgusted = Number(expressions.disgusted || 0)

  const positive = happy + neutral * 0.2
  const negative = sad + angry + fearful + disgusted
  return positive - negative
}

function getDominantEmotion(timeline = []) {
  const counts = {}
  timeline.forEach((item) => {
    const key = String(item?.emotion || 'unknown').toLowerCase()
    counts[key] = (counts[key] || 0) + 1
  })

  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  return top ? top[0] : 'unknown'
}

function summarizeTrend(timeline = []) {
  if (timeline.length < 2) {
    return 'Insufficient data'
  }

  const scores = timeline.map((item) => {
    if (item?.expressions) {
      return scoreFromExpressions(item.expressions)
    }
    return scoreFromEmotionLabel(item?.emotion)
  })

  const segment = Math.max(1, Math.floor(scores.length / 3))
  const startAvg = scores.slice(0, segment).reduce((a, b) => a + b, 0) / segment
  const endAvg = scores.slice(-segment).reduce((a, b) => a + b, 0) / segment
  const delta = endAvg - startAvg

  if (delta > 0.12) return 'Improving'
  if (delta < -0.12) return 'Declining'
  return 'Stable'
}

function getRiskLevel(timeline = []) {
  if (!timeline.length) return 'Low'

  const negativeCount = timeline.filter((item) => NEGATIVE_EMOTIONS.has(String(item?.emotion || '').toLowerCase())).length
  const ratio = negativeCount / timeline.length

  if (ratio >= 0.55) return 'High'
  if (ratio >= 0.3) return 'Moderate'
  return 'Low'
}

function getRecommendations(riskLevel, trend) {
  if (riskLevel === 'High') {
    return [
      'Schedule a closer follow-up check-in within 3-5 days.',
      'Use grounding techniques and structured coping routines daily.',
      'Consider escalation to higher-support care if distress increases.',
    ]
  }

  if (riskLevel === 'Moderate' || trend === 'Declining') {
    return [
      'Continue weekly sessions and monitor mood fluctuations.',
      'Use brief journaling to identify triggers and recovery patterns.',
      'Practice breathing and sleep hygiene interventions consistently.',
    ]
  }

  return [
    'Maintain current routine and reinforce positive coping habits.',
    'Track mood patterns weekly for preventive support planning.',
    'Keep regular therapy cadence to sustain progress.',
  ]
}

export function buildAdvancedReport({ timeline = [], emotionSummary = '' }) {
  const dominantEmotion = getDominantEmotion(timeline)
  const emotionTrend = summarizeTrend(timeline)
  const riskLevel = getRiskLevel(timeline)
  const recommendations = getRecommendations(riskLevel, emotionTrend)

  const aiSummary = timeline.length
    ? `Timeline indicates ${emotionTrend.toLowerCase()} emotional direction with dominant ${dominantEmotion}. Current risk profile is ${riskLevel.toLowerCase()}. ${emotionSummary || ''}`.trim()
    : `No timeline samples were captured. Risk profile defaults to ${riskLevel.toLowerCase()}. ${emotionSummary || ''}`.trim()

  return {
    emotionTrend,
    aiSummary,
    riskLevel,
    recommendations,
    dominantEmotion,
  }
}
