import { useMemo } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export default function EmotionGraph({
  labels = [],
  happy = [],
  neutral = [],
  sad = [],
  angry = [],
  fearful = [],
  tone = 'light',
}) {
  const data = useMemo(
    () =>
      labels.map((label, index) => ({
        time: label,
        happy: happy[index] || 0,
        neutral: neutral[index] || 0,
        sad: sad[index] || 0,
        angry: angry[index] || 0,
        fear: fearful[index] || 0,
      })),
    [labels, happy, neutral, sad, angry, fearful]
  )

  const axisColor = tone === 'dark' ? '#c5d4e2' : '#526173'
  const gridColor = tone === 'dark' ? 'rgba(198,217,230,0.2)' : 'rgba(47,65,86,0.12)'

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 8, left: -6, bottom: 6 }}>
          <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
          <XAxis dataKey="time" tick={{ fill: axisColor, fontSize: 11 }} interval="preserveStartEnd" minTickGap={20} />
          <YAxis domain={[0, 1]} tick={{ fill: axisColor, fontSize: 11 }} width={30} />
          <Tooltip
            contentStyle={{
              background: tone === 'dark' ? 'rgba(22, 31, 44, 0.95)' : 'rgba(255, 255, 255, 0.96)',
              border: `1px solid ${gridColor}`,
              borderRadius: '10px',
              color: tone === 'dark' ? '#f8fafc' : '#1e293b',
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="happy" stroke="#22c55e" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="neutral" stroke="#6b7280" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="sad" stroke="#ef4444" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="angry" stroke="#f97316" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="fear" stroke="#8b5cf6" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
