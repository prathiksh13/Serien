/**
 * Analyze emotion timeline and generate professional conclusions
 * @param {Array} emotionHistory - Array of { emotion, confidence, timestamp, ... }
 * @returns {Object} Analysis result with dominant emotion, avg confidence, conclusion
 */
export function analyzeEmotions(emotionHistory) {
  if (!emotionHistory || emotionHistory.length === 0) {
    return {
      dominantEmotion: 'N/A',
      averageConfidence: 0,
      emotionCounts: {},
      conclusion: 'No emotion data recorded during session.',
      state: 'No Data',
    }
  }

  // Count emotion occurrences
  const emotionCounts = {}
  let totalConfidence = 0

  emotionHistory.forEach((item) => {
    const emotion = item.emotion || 'unknown'
    emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1
    totalConfidence += item.confidence || 0
  })

  // Find dominant emotion
  let dominantEmotion = 'neutral'
  let maxCount = 0
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    if (count > maxCount) {
      maxCount = count
      dominantEmotion = emotion
    }
  }

  const averageConfidence = Math.round((totalConfidence / emotionHistory.length) * 100)

  // Generate professional conclusion based on dominant emotion
  let conclusion = ''
  let state = 'Neutral'

  switch (dominantEmotion.toLowerCase()) {
    case 'happy':
    case 'joy':
      conclusion =
        'Patient demonstrates positive emotional engagement with predominantly happy expressions. This indicates good mood and receptiveness to therapeutic discussion.'
      state = 'Positive'
      break

    case 'neutral':
      conclusion =
        'Patient maintains a stable emotional state with neutral expressions. This indicates emotional stability and calm demeanor throughout the session.'
      state = 'Stable'
      break

    case 'sad':
      conclusion =
        'Patient exhibits signs of sadness or low mood. This may indicate emotional distress that requires careful therapeutic attention and support.'
      state = 'Distressed'
      break

    case 'angry':
    case 'rage':
      conclusion =
        'Patient shows signs of anger or frustration. This indicates potential emotional stress that should be addressed with empathy and de-escalation techniques.'
      state = 'Stressed'
      break

    case 'fear':
      conclusion =
        'Patient displays anxiety or fearful expressions. This suggests emotional vulnerability that requires reassurance and supportive therapeutic intervention.'
      state = 'Anxious'
      break

    case 'disgusted':
      conclusion =
        'Patient exhibits disgust or disapproval. This may indicate strong negative reactions that warrant further exploration in therapy.'
      state = 'Disengaged'
      break

    default:
      conclusion = `Patient predominantly showed ${dominantEmotion} expressions. Confidence level indicates ${averageConfidence}% accuracy in emotion detection.`
      state = dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1)
  }

  return {
    dominantEmotion: dominantEmotion.charAt(0).toUpperCase() + dominantEmotion.slice(1),
    averageConfidence,
    emotionCounts,
    conclusion,
    state,
    totalReadings: emotionHistory.length,
  }
}

/**
 * Format session duration from milliseconds to human-readable format
 * @param {number} startTime - Session start timestamp
 * @param {number} endTime - Session end timestamp
 * @returns {string} Formatted duration (e.g., "15 minutes 30 seconds")
 */
export function formatSessionDuration(startTime, endTime) {
  if (!startTime || !endTime) return 'N/A'

  const totalSeconds = Math.floor((endTime - startTime) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  if (minutes === 0) return `${seconds} seconds`
  if (seconds === 0) return `${minutes} minutes`
  return `${minutes} minutes ${seconds} seconds`
}
