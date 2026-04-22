import { useMemo, useState } from 'react'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

export default function PreSessionForm({ patientId, sessions = [] }) {
  const [selectedSessionId, setSelectedSessionId] = useState('')
  const [mood, setMood] = useState(5)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  const sessionOptions = useMemo(
    () => sessions.map((item) => ({ value: item.id, label: `${item.title} • ${item.subtitle}` })),
    [sessions]
  )

  async function handleSubmit(event) {
    event.preventDefault()
    const trimmedReason = reason.trim()
    if (!selectedSessionId || !trimmedReason || !patientId) {
      setStatus('Select a session and add reason for visit.')
      return
    }

    setSaving(true)
    setStatus('')

    try {
      await addDoc(collection(firestoreDb, 'sessionPreparations'), {
        patientId,
        sessionId: selectedSessionId,
        mood: Number(mood),
        reasonForVisit: trimmedReason,
        notes: notes.trim(),
        createdAt: serverTimestamp(),
      })

      setMood(5)
      setReason('')
      setNotes('')
      setSelectedSessionId('')
      setStatus('Pre-session details saved successfully.')
    } catch (error) {
      console.error('Failed to save pre-session form:', error)
      setStatus('Could not save pre-session details. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="workspace-panel glass p-4 dashboard-card-hover">
      <p className="dashboard-panel__eyebrow">Preparation</p>
      <h2 className="section-heading">Pre-Session Preparation</h2>
      <p className="settings-note mt-1 text-xs">Share how you feel before your appointment.</p>

      <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
        <label className="text-sm text-slate-300">
          Session
          <select
            value={selectedSessionId}
            onChange={(event) => setSelectedSessionId(event.target.value)}
            className="workspace-select mt-1"
          >
            <option value="" className="bg-slate-900">Select upcoming session</option>
            {sessionOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-slate-900">
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Mood level: {mood}/10
          <input
            type="range"
            min="1"
            max="10"
            value={mood}
            onChange={(event) => setMood(event.target.value)}
            className="mt-2 w-full accent-slate-600"
          />
        </label>

        <label className="text-sm text-slate-300">
          Reason for visit
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="workspace-textarea mt-1"
            rows={2}
            placeholder="What would you like to focus on today?"
          />
        </label>

        <label className="text-sm text-slate-300">
          Notes (optional)
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            className="workspace-textarea mt-1"
            rows={3}
            placeholder="Any context you want the therapist to know"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="workspace-button workspace-button--primary rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Preparation'}
        </button>
      </form>

      {status ? <p className="mt-3 text-xs text-cyan-200">{status}</p> : null}
    </section>
  )
}
