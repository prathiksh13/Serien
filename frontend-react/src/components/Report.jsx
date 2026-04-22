import { useMemo } from 'react'
import { analyzeEmotions } from '../utils/analyzeEmotions'
import EmotionGraph from './Graph'

export default function Report({
  doctorName = 'Dr. Meera Shah',
  doctorSpecialization = 'Clinical Psychologist',
  patientName = 'Patient',
  patientID = 'ID-001',
  sessionDate = new Date().toLocaleDateString(),
  sessionDuration = '45 minutes',
  emotionHistory = [],
}) {
  const analysis = useMemo(() => analyzeEmotions(emotionHistory), [emotionHistory])

  // Prepare chart data from emotion history
  const labels = useMemo(() => emotionHistory.map((item) => item.time || ''), [emotionHistory])
  const happy = useMemo(() => emotionHistory.map((item) => item.expressions?.happy || 0), [emotionHistory])
  const neutral = useMemo(() => emotionHistory.map((item) => item.expressions?.neutral || 0), [emotionHistory])
  const sad = useMemo(() => emotionHistory.map((item) => item.expressions?.sad || 0), [emotionHistory])

  return (
    <div
      id="report-section"
      style={{
        width: '800px',
        backgroundColor: '#ffffff',
        color: '#000000',
        padding: '24px',
        lineHeight: '1.6',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '2px solid #d1d5db', paddingBottom: '24px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', margin: '0 0 8px 0' }}>
          AI Teleconsultation Report
        </h1>
        <p style={{ fontSize: '12px', color: '#4b5563', margin: '8px 0 0 0' }}>
          Confidential - For Medical Use Only
        </p>
      </div>

      {/* Doctor Details */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Doctor Details
        </h2>
        <div style={{ borderLeft: '4px solid #3b82f6', backgroundColor: '#eff6ff', padding: '16px' }}>
          <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Name:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{doctorName}</span>
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Specialization:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{doctorSpecialization}</span>
          </p>
        </div>
      </div>

      {/* Patient Details */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Patient Details
        </h2>
        <div style={{ borderLeft: '4px solid #10b981', backgroundColor: '#f0fdf4', padding: '16px' }}>
          <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Name:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{patientName}</span>
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Patient ID:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{patientID}</span>
          </p>
        </div>
      </div>

      {/* Session Info */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Session Information
        </h2>
        <div style={{ borderLeft: '4px solid #a855f7', backgroundColor: '#faf5ff', padding: '16px' }}>
          <p style={{ fontSize: '14px', margin: '0 0 8px 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Date:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{sessionDate}</span>
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Duration:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{sessionDuration}</span>
          </p>
          <p style={{ fontSize: '14px', margin: '8px 0 0 0' }}>
            <span style={{ fontWeight: '600', color: '#374151' }}>Total Emotion Readings:</span>
            <span style={{ marginLeft: '8px', color: '#1f2937' }}>{analysis.totalReadings}</span>
          </p>
        </div>
      </div>

      {/* Emotion Summary */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Emotion Summary
        </h2>
        <div style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '14px', margin: '0' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Dominant Emotion:</span>
                <span style={{ marginLeft: '8px', color: '#1f2937' }}>{analysis.dominantEmotion}</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', margin: '0' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Patient State:</span>
                <span style={{ marginLeft: '8px', fontWeight: '600', color: getStateColorHex(analysis.state) }}>
                  {analysis.state}
                </span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', margin: '0' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Confidence Level:</span>
                <span style={{ marginLeft: '8px', color: '#1f2937' }}>{analysis.averageConfidence}%</span>
              </p>
            </div>
            <div>
              <p style={{ fontSize: '14px', margin: '0' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>Emotional Stability:</span>
                <span style={{ marginLeft: '8px', color: '#1f2937' }}>
                  {getStabilityLevel(Object.values(analysis.emotionCounts))}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Emotion Graph */}
      {emotionHistory.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
            Emotion Analytics Graph
          </h2>
          <div style={{ border: '1px solid #d1d5db', borderRadius: '8px', padding: '16px', backgroundColor: '#f9fafb', height: '300px' }}>
            <EmotionGraph labels={labels} happy={happy} neutral={neutral} sad={sad} />
          </div>
        </div>
      )}

      {/* Final Conclusion */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Clinical Conclusion
        </h2>
        <div style={{ borderLeft: '4px solid #6366f1', backgroundColor: '#eef2ff', padding: '16px' }}>
          <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0', color: '#1f2937' }}>
            {analysis.conclusion}
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '12px', margin: '0 0 12px 0' }}>
          Recommendations
        </h2>
        <div style={{ backgroundColor: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', padding: '16px' }}>
          <ul style={{ fontSize: '14px', margin: '0', paddingLeft: '20px', color: '#1f2937' }}>
            <li style={{ marginBottom: '8px' }}>Continue monitoring emotional patterns in future sessions</li>
            <li style={{ marginBottom: '8px' }}>Focus on building emotional resilience and coping mechanisms</li>
            <li style={{ marginBottom: '8px' }}>Schedule follow-up session within 1-2 weeks</li>
            <li>Encourage journaling of emotional states between sessions</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: '2px solid #d1d5db', paddingTop: '16px', marginTop: '32px' }}>
        <p style={{ fontSize: '11px', color: '#4b5563', margin: '0 0 8px 0' }}>
          Report Generated: {new Date().toLocaleString()}
        </p>
        <p style={{ fontSize: '11px', color: '#4b5563', margin: '8px 0 0 0' }}>
          This report contains AI-assisted emotional analysis. Professional clinical judgment should supersede automated findings.
        </p>
      </div>
    </div>
  )
}


function getStateColorHex(state) {
  switch (state) {
    case 'Positive':
      return '#059669'
    case 'Stable':
      return '#2563eb'
    case 'Distressed':
      return '#dc2626'
    case 'Stressed':
      return '#ea580c'
    case 'Anxious':
      return '#ca8a04'
    default:
      return '#4b5563'
  }
}

function getStabilityLevel(emotionCounts) {
  if (!emotionCounts || emotionCounts.length === 0) return 'Not Available'

  const maxCount = Math.max(...emotionCounts)
  const ratio = emotionCounts.length > 0 ? maxCount / emotionCounts.reduce((a, b) => a + b) : 0

  if (ratio > 0.6) return 'High (Consistent)'
  if (ratio > 0.4) return 'Moderate (Varied)'
  return 'Low (Fluctuating)'
}
