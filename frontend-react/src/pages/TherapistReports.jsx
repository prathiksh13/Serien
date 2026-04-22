import { useMemo } from 'react'
import AdvancedReportInsights from '../components/AdvancedReportInsights'
import EmotionGraph from '../components/Graph'
import ReportList from '../components/ReportList'
import SessionTimelineReplay from '../components/SessionTimelineReplay'
import useTherapistWorkspaceData from '../hooks/useTherapistWorkspaceData'

function parseReportDetails(details) {
  try {
    return JSON.parse(details)
  } catch {
    return { graphData: {} }
  }
}

export default function TherapistReports() {
  const { deleteReportById, reports } = useTherapistWorkspaceData()

  const selectedReport = reports[0] || null
  const parsed = useMemo(() => parseReportDetails(selectedReport?.details || '{}'), [selectedReport?.details])
  const graph = parsed?.graphData || { labels: [], happy: [], neutral: [], sad: [] }
  const timeline = parsed?.timeline || []

  async function handleDeleteReport(report) {
    if (!report?.id) return
    const shouldDelete = window.confirm('Are you sure?')
    if (!shouldDelete) return
    try {
      await deleteReportById(report.id)
    } catch (error) {
      console.error('Failed to delete report:', error)
    }
  }

  function handleDownloadReport(report) {
    const blob = new Blob([`${report.title}\n${report.subtitle}\n\n${report.details}`], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${report.id}.txt`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="dashboard-stack">
      <section className="glass p-4 dashboard-card-hover">
        <p className="dashboard-panel__eyebrow">Analytics</p>
        <h2 className="dashboard-panel__title">Patient emotion analytics</h2>
        <div className="mt-4 h-[280px] rounded-xl border border-white/10 bg-white/5 p-3">
          <EmotionGraph
            labels={graph.labels || ['Start', 'Middle', 'End']}
            happy={graph.happy || [0.4, 0.5, 0.55]}
            neutral={graph.neutral || [0.45, 0.4, 0.35]}
            sad={graph.sad || [0.2, 0.17, 0.12]}
          />
        </div>
      </section>

      <section className="glass p-4 dashboard-card-hover">
        <p className="dashboard-panel__eyebrow">Session timeline replay</p>
        <h2 className="dashboard-panel__title">Hover points for timestamp and emotion</h2>
        <div className="mt-4">
          <SessionTimelineReplay timeline={timeline} />
        </div>
      </section>

      <AdvancedReportInsights timeline={timeline} emotionSummary={parsed?.emotionSummary || ''} />

      <section className="glass p-4 dashboard-card-hover">
        <h2 className="text-lg font-semibold text-slate-100">Patient List</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {Array.from(new Set(reports.map((item) => item.patientId).filter(Boolean))).length ? (
            Array.from(new Set(reports.map((item) => item.patientId).filter(Boolean))).map((patientId) => (
              <li key={patientId} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                {patientId}
              </li>
            ))
          ) : (
            <li className="text-slate-400">No patients found from reports yet.</li>
          )}
        </ul>
      </section>

      <ReportList
        title="Therapist Reports"
        reports={reports}
        actionLabel="Download report"
        onAction={handleDownloadReport}
        onDelete={handleDeleteReport}
      />
    </section>
  )
}
