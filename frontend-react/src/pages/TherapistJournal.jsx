import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import useUserRole from '../hooks/useUserRole'
import { firestoreDb } from '../lib/firebase'
import '../styles/journalReports.css'

function formatJournalDate(createdAt) {
  if (!createdAt?.toDate) return 'Just now'
  return createdAt.toDate().toLocaleString()
}

const MOOD_OPTIONS = [
  { key: 'anxious', label: 'Anxious' },
  { key: 'calm', label: 'Calm' },
  { key: 'stressed', label: 'Stressed' },
  { key: 'sad', label: 'Sad' },
  { key: 'angry', label: 'Angry' },
]

function normalizeMoodValue(value) {
  const text = String(value || '').toLowerCase().trim()
  if (!text) return ''

  if (MOOD_OPTIONS.some((item) => item.key === text)) return text

  const numeric = Number(text)
  if (!Number.isNaN(numeric)) {
    if (numeric <= 2) return 'sad'
    if (numeric <= 4) return 'stressed'
    if (numeric <= 6) return 'anxious'
    if (numeric <= 8) return 'calm'
    return 'calm'
  }

  return ''
}

function avatarFromName(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'PT'
}

function fileKind(fileName = '', mime = '') {
  const type = String(mime || '').toLowerCase()
  const name = String(fileName || '').toLowerCase()
  if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(name)) return 'image'
  if (type.startsWith('video/') || /\.(mp4|mov|m4v|webm|ogg|avi)$/i.test(name)) return 'video'
  if (type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(name)) return 'audio'
  return 'file'
}

function resolveMediaKind(media = {}) {
  if (media?.kind) return media.kind
  return fileKind(media?.name || media?.fileName || media?.url || '', media?.mimeType || media?.type || '')
}

function resolveMediaSrc(media = {}) {
  const storagePath = String(media?.storagePath || '').trim()
  if (storagePath) {
    const params = new URLSearchParams({ storagePath })
    if (media?.bucket) params.set('bucket', String(media.bucket))
    return `/journal-media?${params.toString()}`
  }

  return String(media?.url || media?.downloadURL || media?.downloadUrl || '').trim()
}

export default function TherapistJournal() {
  const { loading, role, uid } = useUserRole()
  const [assignedPatients, setAssignedPatients] = useState([])
  const [selectedPatientId, setSelectedPatientId] = useState('all')
  const [entries, setEntries] = useState([])
  const [status, setStatus] = useState('')
  const [selectedMood, setSelectedMood] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [expandedEntryId, setExpandedEntryId] = useState('')
  const [hiddenByPrivacyCount, setHiddenByPrivacyCount] = useState(0)
  const [feedbackDrafts, setFeedbackDrafts] = useState({})

  const emotionKeywords = ['sad', 'anxious', 'anxiety', 'panic', 'fear', 'overwhelmed', 'hopeless', 'tired', 'calm', 'better', 'angry']

  useEffect(() => {
    if (!uid || role !== 'therapist') return

    async function loadAssignedPatients() {
      try {
        const sessionsSnapshot = await getDocs(query(collection(firestoreDb, 'sessions'), where('therapistId', '==', uid)))
        const patientIds = Array.from(
          new Set(
            sessionsSnapshot.docs
              .map((sessionDoc) => sessionDoc.data()?.patientId)
              .filter(Boolean)
          )
        )

        const patientData = await Promise.all(
          patientIds.map(async (patientId) => {
            const patientDoc = await getDoc(doc(firestoreDb, 'users', patientId))
            const profile = patientDoc.exists() ? patientDoc.data() : {}
            return {
              id: patientId,
              label: profile?.name || profile?.email || patientId,
              journalVisibility: profile?.journalVisibility === 'private' ? 'private' : 'public',
            }
          })
        )

        setAssignedPatients(patientData)
      } catch (error) {
        console.error('Failed to load assigned patients:', error)
        setStatus('Could not load assigned patients.')
      }
    }

    loadAssignedPatients()
  }, [role, uid])

  useEffect(() => {
    if (role !== 'therapist') {
      setEntries([])
      return
    }

    async function loadPatientJournals() {
      try {
        setStatus('')
        const patientIds = selectedPatientId === 'all'
          ? assignedPatients.map((patient) => patient.id)
          : [selectedPatientId]

        if (!patientIds.length) {
          setEntries([])
          return
        }

        const snapshots = await Promise.all(
          patientIds.map((patientId) =>
            getDocs(
              query(
                collection(firestoreDb, 'journals'),
                where('userId', '==', patientId),
                where('role', '==', 'patient')
              )
            )
          )
        )

        const patientNameMap = new Map(assignedPatients.map((patient) => [patient.id, patient.label]))
        const patientVisibilityMap = new Map(assignedPatients.map((patient) => [patient.id, patient.journalVisibility || 'public']))

        const allEntries = snapshots
          .flatMap((snapshot) => snapshot.docs)
          .map((entry) => {
            const data = entry.data()
            return {
              id: entry.id,
              ...data,
              patientName: patientNameMap.get(data?.userId) || data?.userId || 'Unknown patient',
              patientVisibility: patientVisibilityMap.get(data?.userId) || 'public',
              normalizedMood: normalizeMoodValue(data?.mood),
            }
          })

        const visibleEntries = allEntries.filter((entry) => {
          const entryVisibility = entry?.visibility || entry?.patientVisibility || 'public'
          return entryVisibility !== 'private'
        })

        setHiddenByPrivacyCount(allEntries.length - visibleEntries.length)

        const mappedEntries = visibleEntries
          .sort((a, b) => {
            const aTime = a?.createdAt?.toMillis?.() || 0
            const bTime = b?.createdAt?.toMillis?.() || 0
            return bTime - aTime
          })

        setEntries(mappedEntries)
      } catch (error) {
        console.error('Failed to load patient journals:', error)
        setStatus('Could not load patient journals.')
      }
    }

    loadPatientJournals()
  }, [assignedPatients, role, selectedPatientId])

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const moodOk = selectedMood === 'all' || normalizeMoodValue(entry?.mood) === selectedMood
      const dateValue = entry?.createdAt?.toDate ? entry.createdAt.toDate() : null

      let startOk = true
      let endOk = true

      if (startDate && dateValue) {
        startOk = dateValue >= new Date(`${startDate}T00:00:00`)
      }

      if (endDate && dateValue) {
        endOk = dateValue <= new Date(`${endDate}T23:59:59`)
      }

      return moodOk && startOk && endOk
    })
  }, [endDate, entries, selectedMood, startDate])

  function renderHighlightedText(text) {
    const normalized = String(text || '')
    if (!normalized) return null

    const pattern = new RegExp(`(${emotionKeywords.join('|')})`, 'gi')
    const segments = normalized.split(pattern)

    return segments.map((segment, index) => {
      const isKeyword = emotionKeywords.includes(segment.toLowerCase())
      if (!isKeyword) {
        return <span key={`${segment}-${index}`}>{segment}</span>
      }

      return (
        <mark key={`${segment}-${index}`} className="ths-journal-keyword-mark">
          {segment}
        </mark>
      )
    })
  }

  const selectedPatientLabel = useMemo(
    () => assignedPatients.find((patient) => patient.id === selectedPatientId)?.label || '',
    [assignedPatients, selectedPatientId]
  )

  const pendingReviewCount = filteredEntries.length

  if (loading) {
    return <section className="glass p-4">Loading journals...</section>
  }

  if (role !== 'therapist') {
    return <section className="glass p-4">You are not allowed to view this page.</section>
  }

  return (
    <section className="ths-therapist-journal-shell">
      <header className="ths-therapist-journal-head">
        <h1>Patient Daily Feed</h1>
        <p>Review and provide therapeutic feedback on recent journal entries.</p>
      </header>

      <section className="ths-therapist-filter-bar">
        <label>
          Patient
          <select value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)}>
            <option value="all">All assigned patients</option>
            {assignedPatients.length ? (
              assignedPatients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.label}
                </option>
              ))
            ) : (
              <option value="">No assigned patients</option>
            )}
          </select>
        </label>

        <label>
          Mood
          <select value={selectedMood} onChange={(event) => setSelectedMood(event.target.value)}>
            <option value="all">All moods</option>
            {MOOD_OPTIONS.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          From date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>

        <label>
          To date
          <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </section>

      {status ? <p className="ths-therapist-status-text">{status}</p> : null}
      {selectedPatientLabel ? <p className="ths-therapist-status-text">Showing entries for {selectedPatientLabel}.</p> : null}
      {hiddenByPrivacyCount > 0 ? (
        <p className="ths-therapist-status-text">{hiddenByPrivacyCount} entries are hidden because patients set journals to private.</p>
      ) : null}

      <section className="ths-therapist-feed-list">
        {filteredEntries.length ? (
          filteredEntries.map((entry) => (
            <article key={entry.id} className="ths-therapist-feed-card">
              <div className="ths-therapist-feed-header">
                <div className="ths-therapist-feed-profile">
                  <span className="ths-therapist-feed-avatar" aria-hidden="true">{avatarFromName(entry.patientName)}</span>
                  <div>
                    <p className="ths-therapist-feed-name">{entry.patientName}</p>
                    <p className="ths-therapist-feed-date">{formatJournalDate(entry.createdAt)}</p>
                  </div>
                </div>
                <span className="ths-therapist-feed-mood">{entry?.normalizedMood || 'no mood'}</span>
              </div>

              <p className="ths-therapist-feed-content">
                {expandedEntryId === entry.id
                  ? renderHighlightedText(entry.content)
                  : `${String(entry.content || '').slice(0, 220)}${String(entry.content || '').length > 220 ? '...' : ''}`}
              </p>

              {Array.isArray(entry.media) && entry.media.length ? (
                <div className="ths-therapist-feed-media-grid">
                  {entry.media.slice(0, 4).map((media, index) => (
                    <div key={`${entry.id}-media-${index}`} className="ths-therapist-feed-media-item">
                      {resolveMediaKind(media) === 'image' ? <img src={resolveMediaSrc(media)} alt={media.name || 'Journal media'} loading="lazy" /> : null}
                      {resolveMediaKind(media) === 'video' ? <video src={resolveMediaSrc(media)} controls preload="metadata" /> : null}
                      {resolveMediaKind(media) === 'audio' ? <audio src={resolveMediaSrc(media)} controls preload="metadata" /> : null}
                      {resolveMediaKind(media) === 'file' ? <p>{media.name || 'File attached'}</p> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {Array.isArray(entry.tags) && entry.tags.length ? (
                <div className="ths-therapist-feed-tags">
                  {entry.tags.slice(0, 6).map((tag) => (
                    <span key={`${entry.id}-tag-${tag}`} className="ths-journal-tag-pill">#{tag}</span>
                  ))}
                </div>
              ) : null}

              <div className="ths-therapist-feedback-box">
                <label htmlFor={`feedback-${entry.id}`}>Clinical feedback</label>
                <div className="ths-therapist-feedback-row">
                  <textarea
                    id={`feedback-${entry.id}`}
                    placeholder="Type your professional insight here..."
                    value={feedbackDrafts[entry.id] || ''}
                    onChange={(event) => setFeedbackDrafts((prev) => ({ ...prev, [entry.id]: event.target.value }))}
                  />
                  <button
                    type="button"
                    className="ths-therapist-send-btn"
                    onClick={() => {
                      const note = String(feedbackDrafts[entry.id] || '').trim()
                      if (!note) {
                        setStatus('Add feedback text before sending.')
                        return
                      }
                      setStatus('Feedback drafted successfully. Backend save can be wired next.')
                    }}
                    aria-label="Send feedback"
                  >
                    ▶
                  </button>
                </div>
              </div>

              <div className="ths-therapist-feed-actions">
                <button
                  type="button"
                  className="ths-journal-link-btn"
                  onClick={() => setExpandedEntryId((current) => (current === entry.id ? '' : entry.id))}
                >
                  {expandedEntryId === entry.id ? 'Collapse entry' : 'View full post'}
                </button>
              </div>
            </article>
          ))
        ) : (
          <article className="ths-therapist-empty-card">
            No journal entries found for this filter set.
          </article>
        )}
      </section>

      <div className="ths-therapist-pending-chip">
        {pendingReviewCount} pending review{pendingReviewCount === 1 ? '' : 's'}
      </div>
    </section>
  )
}
