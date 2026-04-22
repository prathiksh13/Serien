function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="13" height="10" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  )
}

function EndCallIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 14c4.6-4 11.4-4 16 0" />
      <path d="M6 15v3M18 15v3" />
    </svg>
  )
}

function NotesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 16h6" />
    </svg>
  )
}

function ReportIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 4h14v16H5z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  )
}

export default function VideoControls({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
  onEndCall,
  onOpenNotes,
  onOpenReport,
  showUtilityButtons = false,
}) {
  return (
    <div className="call-controls-dock">
      <button
        type="button"
        onClick={onToggleMic}
        className={`call-control-btn ${micOn ? '' : 'call-control-btn--muted'}`}
        aria-label={micOn ? 'Mute microphone' : 'Unmute microphone'}
      >
        <MicIcon />
      </button>

      <button
        type="button"
        onClick={onToggleCamera}
        className={`call-control-btn ${cameraOn ? '' : 'call-control-btn--muted'}`}
        aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}
      >
        <CameraIcon />
      </button>

      <button
        type="button"
        onClick={onEndCall}
        className="call-control-btn call-control-btn--danger call-control-btn--wide"
      >
        <EndCallIcon />
        End Call
      </button>

      {showUtilityButtons ? (
        <>
          <button
            type="button"
            onClick={onOpenNotes}
            className="call-control-btn"
            aria-label="Open notes"
          >
            <NotesIcon />
          </button>
          <button
            type="button"
            onClick={onOpenReport}
            className="call-control-btn"
            aria-label="Open report"
          >
            <ReportIcon />
          </button>
        </>
      ) : null}
    </div>
  )
}
