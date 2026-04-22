import { useEffect, useMemo, useRef, useState } from 'react'
import { firebaseAuth } from '../lib/firebase'

const FALLBACK_REPLY = 'I am here with you. Could you share a little more about what feels strongest right now?'

function buildWelcomeMessage(mode) {
  if (mode === 'therapist') {
    return 'Hello. I can help you draft calm, supportive responses and summarize emotional concerns from your session context.'
  }
  return 'Hello. I am here to support you. Share how you are feeling, and we can work through it together.'
}

function resolveDetectedEmotion() {
  if (typeof window === 'undefined') return ''

  const candidates = [
    window.sessionStorage.getItem('currentEmotion'),
    window.sessionStorage.getItem('latestEmotion'),
    window.localStorage.getItem('therasense-current-emotion'),
  ]

  const value = candidates.find((item) => String(item || '').trim())
  return String(value || '').trim()
}

export default function Chatbot({ mode = 'patient' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [messages, setMessages] = useState(() => [
    { id: 'welcome', role: 'assistant', text: buildWelcomeMessage(mode) },
  ])
  const [errorText, setErrorText] = useState('')
  const messagesRef = useRef(null)

  const placeholder = useMemo(() => (mode === 'therapist' ? 'Ask for guidance...' : 'Type how you feel...'), [mode])

  useEffect(() => {
    if (!messagesRef.current) return
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight
  }, [messages, isLoading, isOpen])

  useEffect(() => {
    setMessages([{ id: `welcome-${mode}`, role: 'assistant', text: buildWelcomeMessage(mode) }])
    setInput('')
    setErrorText('')
  }, [mode])

  async function handleSend() {
    const trimmed = input.trim()
    if (!trimmed) {
      setErrorText('Please enter a message before sending.')
      return
    }

    setErrorText('')
    setInput('')

    const userMessage = { id: `u-${Date.now()}`, role: 'user', text: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    try {
      const emotion = resolveDetectedEmotion()
      const token = await firebaseAuth?.currentUser?.getIdToken?.()
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: trimmed,
          emotion,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || `Chat request failed with status ${response.status}`)
      }

      const reply = String(data?.reply || '').trim() || FALLBACK_REPLY
      if (data?.booking && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('therasense:session-booked', { detail: data.booking }))
      }
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: reply }])
    } catch (error) {
      console.error('Chatbot request failed:', error)
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          text: 'I could not reach the support assistant right now. Please try again in a moment.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      if (!isLoading) {
        handleSend()
      }
    }
  }

  return (
    <div className="floating-chatbot" aria-live="polite">
      {isOpen ? (
        <section className="chatbot-panel" role="dialog" aria-label="TheraSense AI assistant">
          <header className="chatbot-panel__header">
            <div>
              <p className="chatbot-panel__eyebrow">TheraSense Assistant</p>
              <h2 className="chatbot-panel__title">{mode === 'therapist' ? 'Clinical Support Chat' : 'Support Chat'}</h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="chatbot-panel__close"
              aria-label="Close chatbot"
            >
              X
            </button>
          </header>

          <div ref={messagesRef} className="chatbot-panel__messages">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chatbot-message ${message.role === 'user' ? 'chatbot-message--user' : 'chatbot-message--assistant'}`}
              >
                <p>{message.text}</p>
              </div>
            ))}

            {isLoading ? (
              <div className="chatbot-message chatbot-message--assistant">
                <p className="chatbot-loading">AI is typing...</p>
              </div>
            ) : null}
          </div>

          <footer className="chatbot-panel__footer">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="chatbot-input"
              rows={2}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleSend}
              className="chatbot-send"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </footer>

          {errorText ? <p className="chatbot-error">{errorText}</p> : null}
        </section>
      ) : null}

      <button
        type="button"
        className="chatbot-fab"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open AI chatbot"
      >
        <svg viewBox="0 0 24 24" className="chatbot-fab__icon" aria-hidden="true">
          <path
            d="M6 4h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  )
}
