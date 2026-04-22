import { useEffect, useMemo, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import SearchBar from '../components/ui/SearchBar'
import SectionHeader from '../components/ui/SectionHeader'
import useUserRole from '../hooks/useUserRole'
import { firestoreDb } from '../lib/firebase'
import '../styles/journalReports.css'

function formatJournalDate(createdAt) {
  if (!createdAt?.toDate) return 'Just now'
  return createdAt.toDate().toLocaleString()
}

function JournalIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4h10a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 8h6M8 12h5M8 16h4" />
    </svg>
  )
}

const JOURNAL_MOODS = [
  { key: 'anxious', label: 'Anxious', icon: '😟' },
  { key: 'calm', label: 'Calm', icon: '😌' },
  { key: 'stressed', label: 'Stressed', icon: '😣' },
  { key: 'sad', label: 'Sad', icon: '😔' },
  { key: 'angry', label: 'Angry', icon: '😠' },
]

function normalizeMoodValue(value) {
  const text = String(value || '').toLowerCase().trim()
  if (!text) return ''

  const direct = JOURNAL_MOODS.find((item) => item.key === text)
  if (direct) return direct.key

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

function getMoodMeta(value) {
  const normalized = normalizeMoodValue(value)
  return JOURNAL_MOODS.find((item) => item.key === normalized) || null
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

function toUploadErrorMessage(error) {
  const code = String(error?.code || '').toLowerCase()
  const message = String(error?.message || '').toLowerCase()

  if (code.includes('storage/unauthorized')) {
    return 'Upload blocked by Firebase Storage rules. Check storage rules for this user.'
  }

  if (code.includes('storage/canceled')) {
    return 'Upload was canceled.'
  }

  if (code.includes('storage/quota-exceeded')) {
    return 'Storage quota exceeded. Increase plan or free up space.'
  }

  if (code.includes('storage/retry-limit-exceeded')) {
    return 'Upload retry limit exceeded. Check internet/CORS and try again.'
  }

  if (message.includes('cors') || message.includes('preflight') || message.includes('xmlhttprequest')) {
    return 'Upload failed due to CORS policy. Configure Firebase Storage CORS for your frontend domain.'
  }

  return 'Media upload failed. Check Firebase Storage bucket, CORS settings, and network connectivity.'
}

async function uploadJournalMedia(uid, files = []) {
  try {
    const uploads = await Promise.all(
      files.map(async (file, index) => {
        const safeName = String(file.name || `upload-${index + 1}`).replace(/[^a-zA-Z0-9._-]/g, '_')
        const base64Data = await fileToBase64(file)
        const response = await fetch('/upload-journal-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid,
            fileName: file.name || safeName,
            mimeType: file.type || '',
            base64Data,
          }),
        })

        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload?.error || 'Upload failed')
        }

        return {
          kind: payload.kind || fileKind(file.name, file.type),
          url: payload.url,
          name: payload.name || file.name || safeName,
          mimeType: payload.mimeType || file.type || '',
          size: Number(payload.size || file.size || 0),
          storagePath: payload.storagePath || `journals/${uid}/${Date.now()}-${index}-${safeName}`,
          bucket: payload.bucket || '',
        }
      })
    )

    return uploads
  } catch (error) {
    const wrappedError = new Error(toUploadErrorMessage(error))
    wrappedError.cause = error
    throw wrappedError
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      const base64Part = result.includes(',') ? result.split(',')[1] : ''
      if (!base64Part) {
        reject(new Error('Could not read file data'))
        return
      }
      resolve(base64Part)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

export default function Journal() {
  const { loading, role, uid } = useUserRole()
  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [moodFilter, setMoodFilter] = useState('all')
  const [showEditor, setShowEditor] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [expandedId, setExpandedId] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [existingMedia, setExistingMedia] = useState([])
  const [journalVisibility, setJournalVisibility] = useState('public')

  const suggestedTags = ['stress', 'anxiety', 'calm', 'sleep', 'focus', 'motivation']

  useEffect(() => {
    if (!uid || role !== 'patient') return

    async function loadEntries() {
      try {
        const journalsQuery = query(
          collection(firestoreDb, 'journals'),
          where('userId', '==', uid),
          where('role', '==', 'patient')
        )
        const snapshot = await getDocs(journalsQuery)
        const mappedEntries = snapshot.docs
          .map((entry) => ({ id: entry.id, ...entry.data() }))
          .sort((a, b) => {
            const aTime = a?.createdAt?.toMillis?.() || 0
            const bTime = b?.createdAt?.toMillis?.() || 0
            return bTime - aTime
          })

        setEntries(mappedEntries)
      } catch (error) {
        console.error('Failed to load journals:', error)
        setStatus('Could not load journal entries.')
      }
    }

    loadEntries()
  }, [role, uid])

  useEffect(() => {
    if (!uid || role !== 'patient') return

    async function loadJournalVisibility() {
      try {
        const userSnapshot = await getDoc(doc(firestoreDb, 'users', uid))
        if (!userSnapshot.exists()) return
        const visibility = userSnapshot.data()?.journalVisibility
        setJournalVisibility(visibility === 'private' ? 'private' : 'public')
      } catch {
        setJournalVisibility('public')
      }
    }

    loadJournalVisibility()
  }, [role, uid])

  const canSubmit = useMemo(() => {
    const hasText = content.trim().length > 0
    const hasMedia = selectedFiles.length > 0 || existingMedia.length > 0
    return !!uid && (hasText || hasMedia)
  }, [content, existingMedia.length, selectedFiles.length, uid])

  const filteredEntries = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return entries.filter((entry) => {
      const matchesSearch = !needle || String(entry.content || '').toLowerCase().includes(needle)
      const matchesMood = moodFilter === 'all' || normalizeMoodValue(entry.mood) === moodFilter
      return matchesSearch && matchesMood
    })
  }, [entries, moodFilter, search])

  const parsedTags = useMemo(() => {
    return tagsInput
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8)
  }, [tagsInput])

  function resetEditor() {
    setContent('')
    setMood('')
    setTagsInput('')
    setEditingId('')
    setSelectedFiles([])
    setExistingMedia([])
  }

  function startEdit(entry) {
    setEditingId(entry.id)
    setContent(entry.content || '')
    setMood(normalizeMoodValue(entry.mood))
    setTagsInput(Array.isArray(entry.tags) ? entry.tags.join(', ') : '')
    setExistingMedia(Array.isArray(entry.media) ? entry.media : [])
    setSelectedFiles([])
    setShowEditor(true)
  }

  async function handleDelete(entryId) {
    const shouldDelete = window.confirm('Delete this journal entry?')
    if (!shouldDelete) return

    try {
      await deleteDoc(doc(firestoreDb, 'journals', entryId))
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId))
      setStatus('Entry deleted.')
      if (editingId === entryId) {
        resetEditor()
      }
    } catch (error) {
      console.error('Failed to delete journal entry:', error)
      setStatus('Could not delete this entry.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!canSubmit || role !== 'patient') return

    setSaving(true)
    setStatus('')

    try {
      const payload = {
        userId: uid,
        role: 'patient',
        content: content.trim(),
        mood: mood || null,
        tags: parsedTags,
        visibility: journalVisibility,
        updatedAt: serverTimestamp(),
      }

      let uploadedMedia = []
      if (selectedFiles.length > 0) {
        setStatus('Uploading files...')
        uploadedMedia = await uploadJournalMedia(uid, selectedFiles)
      }

      const mergedMedia = [...existingMedia, ...uploadedMedia].slice(0, 8)
      payload.media = mergedMedia

      if (editingId) {
        await updateDoc(doc(firestoreDb, 'journals', editingId), payload)
        setEntries((prev) =>
          prev.map((entry) =>
            entry.id === editingId
              ? {
                ...entry,
                ...payload,
              }
              : entry
          )
        )
        setStatus('Journal entry updated.')
      } else {
        const createPayload = {
          ...payload,
          createdAt: serverTimestamp(),
        }
        const docRef = await addDoc(collection(firestoreDb, 'journals'), createPayload)
        setEntries((prev) => [{ ...createPayload, id: docRef.id }, ...prev])
        setStatus('Journal entry saved.')
      }

      resetEditor()
      setShowEditor(false)
    } catch (error) {
      console.error('Failed to save journal:', error)
      setStatus(error?.message || 'Failed to save journal entry.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Card><p className="ts-text-secondary">Loading journal...</p></Card>
  }

  if (role !== 'patient') {
    return <Card><p className="ts-text-secondary">You are not allowed to view this page.</p></Card>
  }

  return (
    <section className="ts-page ths-journal-page ths-journal-page--patient">
      <SectionHeader
        title="Patient Journal"
        subtitle="Personal reflection space for your emotional check-ins"
        actionLabel="+ New Entry"
        onAction={() => {
          resetEditor()
          setShowEditor(true)
        }}
      />

      <div className="ts-toolbar ths-journal-toolbar">
        <SearchBar
          placeholder="Search entries..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select className="ts-select" value={moodFilter} onChange={(event) => setMoodFilter(event.target.value)}>
          <option value="all">All Moods</option>
          {JOURNAL_MOODS.map((item) => (
            <option key={item.key} value={item.key}>{item.label}</option>
          ))}
        </select>
      </div>

      {showEditor ? (
        <Card className="ths-journal-composer">
          <form className="ts-stack" onSubmit={handleSubmit}>
            <label className="ts-field-label" htmlFor="journal-content">Write Entry</label>
            <textarea
              id="journal-content"
              rows={10}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="ts-input ts-textarea ths-journal-focus-input"
              placeholder="How are you feeling today?"
            />

            <div className="ths-journal-mood-row">
              <label className="ts-field-label">How are you feeling today?</label>
            </div>
            <div className="ths-journal-mood-chip-row" role="radiogroup" aria-label="Mood selection">
              {JOURNAL_MOODS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={mood === item.key}
                  className={`ths-journal-mood-chip ${mood === item.key ? 'is-selected' : ''}`}
                  onClick={() => setMood(item.key)}
                >
                  <span className="ths-journal-mood-chip__icon" aria-hidden="true">{item.icon}</span>
                  <span className="ths-journal-mood-chip__label">{item.label}</span>
                </button>
              ))}
            </div>

            <label className="ts-field-label" htmlFor="journal-tags">Tags (optional)</label>
            <input
              id="journal-tags"
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              className="ts-input"
              placeholder="stress, anxiety, calm"
            />
            <div className="ths-journal-tag-suggestions">
              {suggestedTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="ths-journal-tag-chip"
                  onClick={() => {
                    const current = tagsInput
                      .split(',')
                      .map((item) => item.trim())
                      .filter(Boolean)
                    if (!current.includes(tag)) {
                      setTagsInput([...current, tag].join(', '))
                    }
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <label className="ts-field-label" htmlFor="journal-media">Upload media (image, video, audio)</label>
            <input
              id="journal-media"
              type="file"
              accept="image/*,video/*,audio/*"
              multiple
              className="ts-input"
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                setSelectedFiles(files.slice(0, 4))
              }}
            />

            {(existingMedia.length > 0 || selectedFiles.length > 0) ? (
              <div className="ths-journal-media-preview-grid">
                {existingMedia.map((media, index) => (
                  <div key={`existing-${index}`} className="ths-journal-media-preview-item">
                    {resolveMediaKind(media) === 'image' ? <img src={resolveMediaSrc(media)} alt={media.name || 'Journal media'} /> : null}
                    {resolveMediaKind(media) === 'video' ? <video src={resolveMediaSrc(media)} controls /> : null}
                    {resolveMediaKind(media) === 'audio' ? <audio src={resolveMediaSrc(media)} controls /> : null}
                    {resolveMediaKind(media) === 'file' ? <p className="ts-text-secondary">{media.name || 'File attached'}</p> : null}
                  </div>
                ))}
                {selectedFiles.map((file, index) => (
                  <div key={`new-${index}`} className="ths-journal-media-preview-item is-upload-pending">
                    <p className="ts-text-secondary">{file.name}</p>
                    <p className="ts-text-secondary">Ready to upload</p>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="ts-row-actions">
              <button type="submit" className="ts-btn ts-btn--primary" disabled={!canSubmit || saving}>
                {saving ? 'Saving...' : 'Save Entry'}
              </button>
              <button
                type="button"
                className="ts-btn ts-btn--outline"
                onClick={() => {
                  resetEditor()
                  setShowEditor(false)
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      {!showEditor && filteredEntries.length === 0 ? (
        <EmptyState
          icon={<JournalIcon />}
          title="No journal entries yet"
          description="Start journaling to track your feelings and progress"
          actionLabel="+ Create First Entry"
          onAction={() => setShowEditor(true)}
        />
      ) : null}

      {filteredEntries.length > 0 ? (
        <div className="ts-stack">
          {filteredEntries.map((entry) => (
            <Card key={entry.id} className="ths-journal-entry-card">
              <div className="ts-row-between">
                <p className="ts-text-secondary">{formatJournalDate(entry.createdAt)}</p>
                <span className="ths-journal-mood-pill">
                  {getMoodMeta(entry?.mood)?.icon ? `${getMoodMeta(entry.mood).icon} ` : ''}
                  {getMoodMeta(entry?.mood)?.label || 'Mood not set'}
                </span>
              </div>

              <p className="ts-entry-content">
                {expandedId === entry.id
                  ? entry.content
                  : `${String(entry.content || '').slice(0, 180)}${String(entry.content || '').length > 180 ? '...' : ''}`}
              </p>

              {Array.isArray(entry.media) && entry.media.length ? (
                <div className="ths-journal-media-grid">
                  {entry.media.map((media, index) => (
                    <div key={`${entry.id}-media-${index}`} className="ths-journal-media-item">
                      {resolveMediaKind(media) === 'image' ? <img src={resolveMediaSrc(media)} alt={media.name || 'Journal attachment'} loading="lazy" /> : null}
                      {resolveMediaKind(media) === 'video' ? <video src={resolveMediaSrc(media)} controls preload="metadata" /> : null}
                      {resolveMediaKind(media) === 'audio' ? <audio src={resolveMediaSrc(media)} controls preload="metadata" /> : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {Array.isArray(entry.tags) && entry.tags.length ? (
                <div className="ths-journal-tag-row">
                  {entry.tags.map((tag) => (
                    <span key={`${entry.id}-${tag}`} className="ths-journal-tag-pill">{tag}</span>
                  ))}
                </div>
              ) : null}

              <div className="ths-journal-entry-actions">
                <button
                  type="button"
                  className="ths-journal-link-btn"
                  onClick={() => setExpandedId((current) => (current === entry.id ? '' : entry.id))}
                >
                  {expandedId === entry.id ? 'Hide' : 'View full entry'}
                </button>
                <button type="button" className="ths-journal-link-btn" onClick={() => startEdit(entry)}>
                  Edit
                </button>
                <button type="button" className="ths-journal-link-btn is-danger" onClick={() => handleDelete(entry.id)}>
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {status ? <p className="ts-text-secondary">{status}</p> : null}
    </section>
  )
}
