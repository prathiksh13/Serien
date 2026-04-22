import { useEffect, useMemo, useRef, useState } from 'react'
import MessageBubble from './MessageBubble'

export default function ChatWindow({ mode = 'patient', context = {}, onClose }) {
  const endRef = useRef(null)
  const recognitionRef = useRef(null)

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [language, setLanguage] = useState('en-US')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [messages, setMessages] = useState(() => [
    {
      id: `intro-${mode}`,
      role: 'ai',
      text:
        mode === 'therapist'
          ? 'Therapist assistant ready. Share a session summary or concern and I will generate insights.'
          : 'Hi, I am here for you. Share how you feel and I will respond supportively.',
    },
  ])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const header = useMemo(() => (mode === 'therapist' ? 'Therapist AI Assistant' : 'Support AI Chat'), [mode])

  const supportsSpeech = useMemo(
    () => typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  )

  function toApiHistory(nextUserMessage) {
    return [...messages, nextUserMessage].map((item) => ({
      role: item.role === 'ai' ? 'assistant' : 'user',
      text: item.text,
    }))
  }

  async function sendMessage(customText) {
    const text = (customText ?? input).trim()
    if (!text || isSending) return

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsSending(true)

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          role: mode,
          history: toApiHistory(userMessage),
          context,
        }),
      })

      const data = await response.json()
      const reply = data.reply || data.response || data.error || 'Unable to generate a reply right now.'

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random()}`,
          role: 'ai',
          text: reply,
        },
      ])
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}-${Math.random()}`,
          role: 'ai',
          text: 'Network error. Please try again.',
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  function startListening() {
    if (!supportsSpeech) {
      setVoiceStatus('Speech recognition is not supported in this browser.')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    recognition.lang = language
    recognition.interimResults = false
    recognition.continuous = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      setVoiceStatus('Listening...')
    }

    recognition.onerror = () => {
      setIsListening(false)
      setVoiceStatus('Could not recognize speech')
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onresult = async (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || ''
      setVoiceStatus(transcript ? `Recognized: ${transcript}` : 'No speech detected.')
      if (transcript) {
        setInput(transcript)
        await sendMessage(transcript)
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <div className="w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-white/15 bg-slate-900/95 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <p className="text-sm font-semibold text-cyan-100">{header}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-white/10"
        >
          Close
        </button>
      </div>

      <div className="border-b border-white/10 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className={isListening ? 'text-cyan-300' : 'text-slate-400'}>{isListening ? 'Listening...' : 'Voice ready'}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            className="rounded-lg border border-white/15 bg-slate-950/70 px-2 py-1 text-xs text-slate-100 outline-none"
          >
            <option value="en-US">English</option>
            <option value="hi-IN">Hindi</option>
            <option value="te-IN">Telugu</option>
          </select>
        </div>
        {voiceStatus ? <p className="mt-2 text-xs text-slate-300">{voiceStatus}</p> : null}
      </div>

      <div className="h-80 space-y-2 overflow-y-auto px-3 py-3">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} role={msg.role} text={msg.text} />
        ))}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2 rounded-2xl border border-white/15 bg-slate-950/80 px-3 py-2 shadow-inner">
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`grid h-10 w-10 place-items-center rounded-full text-sm transition ${
              isListening ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-white/10 text-cyan-200 hover:bg-white/15'
            }`}
            aria-label="Voice input"
            title={isListening ? 'Stop voice input' : 'Start voice input'}
          >
            🎤
          </button>

          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                sendMessage()
              }
            }}
            placeholder={mode === 'therapist' ? 'Ask for session insights...' : 'Type your message...'}
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-400"
          />

          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={isSending}
            className="grid h-10 w-10 place-items-center rounded-full bg-cyan-500 text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Send message"
            title="Send"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
