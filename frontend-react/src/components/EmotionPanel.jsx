export default function EmotionPanel({ currentEmotion = 'Neutral', confidence = 0.97, timeline = [], showTimeline = true, alert = null }) {
  const mood =
    currentEmotion.toLowerCase() === 'happy'
      ? 'Positive'
      : currentEmotion.toLowerCase() === 'neutral'
        ? 'Stable'
        : 'Stress'

  return (
    <div className={`call-analytics-card h-full p-4 ${alert ? 'call-analytics-card--alert' : ''}`}>
      <h2 className="call-analytics-card__title">Emotion Summary</h2>

      {alert ? (
        <div className="call-alert-box mt-3">
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-1">{alert.message}</p>
        </div>
      ) : null}

      <div className="call-analytics-card__inner mt-3">
        <p className="call-analytics-card__label">Current Emotion</p>
        <p className="call-analytics-card__emotion">{currentEmotion}</p>
        <p className="call-analytics-card__line">Confidence: {(confidence * 100).toFixed(1)}%</p>
        <p className="call-analytics-card__line">Session Mood: {mood}</p>
      </div>

      {showTimeline ? (
        <div className="mt-4">
          <p className="call-analytics-card__title" style={{ fontSize: '1rem' }}>Timeline</p>
          <ul className="mt-2 max-h-48 space-y-1 overflow-auto pr-1 text-sm text-slate-700">
            {timeline.length === 0 ? (
              <li>No data yet</li>
            ) : (
              timeline.map((item) => (
                <li key={item.id}>
                  {item.time} - {item.emotion} ({Math.round(item.confidence * 100)}%)
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
