import { useMemo } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

function normalizeTimeline(timeline = []) {
  return timeline
    .filter(Boolean)
    .map((item, index) => {
      const stamp = item?.time || item?.timestamp || `T${index + 1}`
      const emotion = item?.emotion || 'unknown'
      const confidence = Number(item?.confidence || 0.5)
      return { stamp, emotion, confidence }
    })
}

export default function SessionTimelineReplay({ timeline = [] }) {
  const points = useMemo(() => normalizeTimeline(timeline), [timeline])

  const data = useMemo(
    () => ({
      labels: points.map((point) => point.stamp),
      datasets: [
        {
          label: 'Emotion confidence',
          data: points.map((point) => point.confidence),
          borderColor: '#22d3ee',
          backgroundColor: 'rgba(34, 211, 238, 0.14)',
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.32,
          borderWidth: 2,
        },
      ],
    }),
    [points]
  )

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 1,
          ticks: { color: '#9fb0cc' },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
        x: {
          ticks: { color: '#9fb0cc', maxTicksLimit: 8 },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
      },
      plugins: {
        legend: {
          labels: { color: '#dce6f8' },
        },
        tooltip: {
          callbacks: {
            title(context) {
              const index = context?.[0]?.dataIndex || 0
              return `Timestamp: ${points[index]?.stamp || '-'}`
            },
            label(context) {
              const index = context?.dataIndex || 0
              const emotion = points[index]?.emotion || 'unknown'
              const confidence = Math.round((points[index]?.confidence || 0) * 100)
              return `Emotion: ${emotion} | Confidence: ${confidence}%`
            },
          },
        },
      },
    }),
    [points]
  )

  if (!points.length) {
    return <p className="text-sm text-slate-400">No timeline replay data available for this session.</p>
  }

  return (
    <div className="report-emotion-card h-[280px] rounded-xl border border-white/10 bg-white/5 p-3">
      <Line data={data} options={options} />
    </div>
  )
}
