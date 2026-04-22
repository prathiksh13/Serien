export default function ReportList({ title, reports = [], actionLabel = 'Download report', onAction, onDelete }) {
  return (
    <section className="workspace-panel glass p-4 dashboard-card-hover">
      <p className="dashboard-panel__eyebrow">Reports</p>
      <h2 className="section-heading">{title}</h2>
      <ul className="mt-4 space-y-3">
        {reports.length === 0 ? (
          <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-400">No reports yet</li>
        ) : (
          reports.map((report) => (
            <li
              key={report.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-100">{report.title}</p>
                <p className="mt-1 text-xs text-slate-400">{report.subtitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAction?.(report)}
                  className="workspace-button workspace-button--secondary rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  {actionLabel}
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(report)}
                    className="workspace-button settings-logout rounded-lg px-2 py-1.5 text-xs font-semibold"
                    aria-label="Delete report"
                    title="Delete report"
                  >
                    X
                  </button>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
