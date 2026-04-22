import { useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

function buildConversationId(patientId, therapistId) {
  return `patient_${patientId}__therapist_${therapistId}`
}

function formatMessageTime(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  if (!date) return ''
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatMessageDate(value) {
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : null
  if (!date) return 'Just now'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function avatarText(label = '') {
  return String(label)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'TH'
}

export default function TherapistMessenger({
  patientId,
  patientName,
  therapists = [],
  initialTherapistId = '',
}) {
  const [selectedTherapistId, setSelectedTherapistId] = useState(initialTherapistId || therapists[0]?.id || '')
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')
  const endRef = useRef(null)

  useEffect(() => {
    if (initialTherapistId) {
      setSelectedTherapistId(initialTherapistId)
      return
    }

    if (therapists.length && !therapists.some((item) => item.id === selectedTherapistId)) {
      setSelectedTherapistId(therapists[0].id)
    }
  }, [initialTherapistId, selectedTherapistId, therapists])

  const selectedTherapist = useMemo(
    () => therapists.find((item) => item.id === selectedTherapistId) || null,
    [selectedTherapistId, therapists]
  )

  const conversationId = useMemo(() => {
    if (!patientId || !selectedTherapistId) return ''
    return buildConversationId(patientId, selectedTherapistId)
  }, [patientId, selectedTherapistId])

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      return undefined
    }

    const messagesQuery = query(
      collection(firestoreDb, 'patientTherapistMessages'),
      where('conversationId', '==', conversationId)
    )

    const unsubscribe = onSnapshot(
      messagesQuery,
      (snapshot) => {
        const nextMessages = snapshot.docs
          .map((entry) => ({
            id: entry.id,
            ...entry.data(),
          }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
            const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
            return aTime - bTime
          })
        setMessages(nextMessages)
      },
      (error) => {
        console.error('Failed to subscribe to therapist messages:', error)
        setStatus('Could not load messages right now.')
      }
    )

    return () => unsubscribe()
  }, [conversationId])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSendMessage() {
    const trimmedDraft = draft.trim()
    if (!trimmedDraft || !patientId || !selectedTherapist) return

    setSending(true)
    setStatus('')

    try {
      await addDoc(collection(firestoreDb, 'patientTherapistMessages'), {
        conversationId,
        patientId,
        patientName: patientName || 'Patient',
        therapistId: selectedTherapist.id,
        therapistName: selectedTherapist.name || selectedTherapist.label || 'Therapist',
        senderId: patientId,
        senderRole: 'patient',
        text: trimmedDraft,
        createdAt: serverTimestamp(),
      })
      setDraft('')
    } catch (error) {
      console.error('Failed to send therapist message:', error)
      setStatus('Message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="ts-chat-card">
      <div className="ts-card-header">
        <div>
          <h2 className="ts-section-title">Therapist Messages</h2>
          <p className="ts-text-secondary">Select a therapist and send a direct message.</p>
        </div>
      </div>

      <div className="ts-chat-layout">
        <aside className="ts-chat-list">
          {therapists.length ? (
            therapists.map((therapist) => {
              const isActive = therapist.id === selectedTherapistId
              return (
                <button
                  key={therapist.id}
                  type="button"
                  onClick={() => setSelectedTherapistId(therapist.id)}
                  className={`ts-chat-list__item ${isActive ? 'is-active' : ''}`}
                >
                  <span className="ts-chat-list__avatar">{avatarText(therapist.name || therapist.label)}</span>
                  <span className="ts-chat-list__meta">
                    <strong>{therapist.name || therapist.label || 'Therapist'}</strong>
                    <span>{therapist.specialization || therapist.email || 'Available for consultation'}</span>
                  </span>
                </button>
              )
            })
          ) : (
            <p className="ts-text-secondary">No therapists available yet.</p>
          )}
        </aside>

        <div className="ts-chat-thread">
          {selectedTherapist ? (
            <>
              <header className="ts-chat-thread__header">
                <div className="ts-chat-thread__identity">
                  <span className="ts-chat-list__avatar">{avatarText(selectedTherapist.name || selectedTherapist.label)}</span>
                  <div>
                    <strong>{selectedTherapist.name || selectedTherapist.label || 'Therapist'}</strong>
                    <p>{selectedTherapist.specialization || selectedTherapist.email || 'Therapist'}</p>
                  </div>
                </div>
              </header>

              <div className="ts-chat-thread__messages">
                {messages.length ? (
                  messages.map((message) => {
                    const isOwnMessage = message.senderRole === 'patient'
                    return (
                      <div key={message.id} className={`ts-chat-message ${isOwnMessage ? 'ts-chat-message--own' : ''}`}>
                        <div className="ts-chat-message__bubble">
                          <p>{message.text}</p>
                          <span>{formatMessageTime(message.createdAt) || formatMessageDate(message.createdAt)}</span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="ts-chat-thread__empty">
                    <p>No messages yet.</p>
                    <span>Start the conversation with {selectedTherapist.name || 'your therapist'}.</span>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <footer className="ts-chat-thread__composer">
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={`Message ${selectedTherapist.name || 'therapist'}...`}
                  className="ts-chat-thread__input"
                  rows={1}
                />
                <button
                  type="button"
                  onClick={handleSendMessage}
                  disabled={sending || !draft.trim()}
                  className="ts-chat-thread__send"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </footer>
            </>
          ) : (
            <div className="ts-chat-thread__empty">
              <p>Select a therapist to start chatting.</p>
            </div>
          )}

          {status ? <p className="ts-chat-thread__status">{status}</p> : null}
        </div>
      </div>
    </section>
  )
}
