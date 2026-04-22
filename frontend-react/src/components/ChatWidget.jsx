import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import ChatWindow from './ChatWindow'

export default function ChatWidget({ mode = 'patient', context = {} }) {
  const [open, setOpen] = useState(false)

  const title = useMemo(() => (mode === 'therapist' ? 'Therapist AI' : 'Support AI'), [mode])

  const content = (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '12px',
      }}
    >
      {open ? <ChatWindow mode={mode} context={context} onClose={() => setOpen(false)} /> : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Open AI chat"
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '9999px',
          border: '1px solid rgba(255,255,255,0.2)',
          background: '#06b6d4',
          color: '#082f49',
          fontSize: '24px',
          fontWeight: 700,
          display: 'grid',
          placeItems: 'center',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.35)',
          cursor: 'pointer',
        }}
        title={title}
      >
        {open ? '×' : '💬'}
      </button>
    </div>
  )

  return createPortal(content, document.body)
}
