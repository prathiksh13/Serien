import { useState } from 'react'

export default function EmergencyButton({ patientId, patientName, emergencyEmail }) {
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  async function handleEmergency() {
    if (!patientId) {
      setMessage('Patient profile is not available.')
      return
    }

    if (!emergencyEmail) {
      setMessage('Add an emergency email in your profile first.')
      return
    }

    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported in this browser.')
      return
    }

    setSending(true)
    setMessage('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const payload = {
            patientId,
            emergencyEmail,
            patientName,
            location: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            },
          }

          const response = await fetch('/send-emergency-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          })

          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            throw new Error(data?.error || 'Unable to send emergency email')
          }

          setMessage('Emergency email sent.')
        } catch (error) {
          setMessage(error.message || 'Emergency email failed.')
        } finally {
          setSending(false)
        }
      },
      (error) => {
        setSending(false)
        setMessage(error.message || 'Unable to access location.')
      }
    )
  }

  return (
    <div className="workspace-panel glass p-4 dashboard-card-hover">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="dashboard-panel__eyebrow">Emergency</p>
          <h2 className="section-heading">Emergency</h2>
          <p className="mt-1 text-sm text-slate-400">Sends your live location to your emergency contact.</p>
        </div>
        <button
          type="button"
          onClick={handleEmergency}
          disabled={sending}
          className="workspace-button settings-logout rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
        >
          {sending ? 'Sending...' : 'Emergency Button'}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
    </div>
  )
}
