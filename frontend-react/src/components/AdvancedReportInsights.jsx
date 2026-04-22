import { useMemo } from 'react'
import { buildAdvancedReport } from '../utils/advancedReport'

export default function AdvancedReportInsights({ timeline = [], emotionSummary = '' }) {
  const insights = useMemo(
    () => buildAdvancedReport({ timeline, emotionSummary }),
    [timeline, emotionSummary]
  )

  return (
    <section className="advanced-insight glass p-4 dashboard-card-hover">
      <p className="dashboard-panel__eyebrow">Advanced report</p>
      <h2 className="dashboard-panel__title">AI insights and risk analysis</h2>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Emotion trend</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{insights.emotionTrend}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Risk level</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{insights.riskLevel}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">Dominant emotion</p>
          <p className="mt-1 text-sm font-semibold text-slate-100">{insights.dominantEmotion}</p>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">AI summary</p>
        <p className="mt-1 text-sm text-slate-200">{insights.aiSummary}</p>
      </div>

      <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-wide text-slate-400">Recommendations</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-200">
          {insights.recommendations.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
