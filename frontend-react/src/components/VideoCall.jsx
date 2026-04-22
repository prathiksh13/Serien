export default function VideoCall({ title = 'Video Call', showOverlay = false, status = '' }) {
  return (
    <section className="video-call-panel dark-surface h-full p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="dashboard-panel__eyebrow">Call room</p>
          <h2 className="call-heading">{title}</h2>
        </div>
        {status ? <span className="video-call-stage__pill">{status}</span> : null}
      </div>
      <div className="video-call-stage call-stage relative h-[70vh] w-full overflow-hidden">
        <div className="absolute inset-0 grid place-items-center text-slate-400">Remote Video Stream</div>

        {showOverlay && (
          <div className="video-call-stage__pill absolute left-5 top-5">
            Face Box + Emotion Overlay
          </div>
        )}

        <div className="video-call-stage__pip call-pip absolute bottom-4 right-4 h-36 w-56 overflow-hidden rounded-xl bg-black/70">
          <div className="grid h-full place-items-center text-xs text-slate-300">Self View</div>
        </div>
      </div>
    </section>
  )
}
