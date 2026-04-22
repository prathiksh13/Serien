const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

function getSystemPrompt(mode) {
  if (mode === 'therapist') {
    return 'Act as a mental health assistant and provide helpful insights.'
  }
  return 'Act as a supportive mental health chatbot.'
}

export async function sendGeminiMessage({ message, mode = 'patient', history = [] }) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY. Add it to your .env file.')
  }

  const trimmedMessage = message?.trim()
  if (!trimmedMessage) {
    throw new Error('Message cannot be empty.')
  }

  const normalizedHistory = history
    .filter((item) => item?.text && (item.role === 'user' || item.role === 'assistant'))
    .slice(-10)
    .map((item) => ({
      role: item.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: item.text }],
    }))

  const payload = {
    system_instruction: {
      parts: [{ text: getSystemPrompt(mode) }],
    },
    contents: [...normalizedHistory, { role: 'user', parts: [{ text: trimmedMessage }] }],
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      topK: 32,
      maxOutputTokens: 512,
    },
  }

  const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Gemini request failed: ${response.status} ${errorBody}`)
  }

  const data = await response.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join(' ').trim()

  if (!text) {
    throw new Error('No response returned from Gemini.')
  }

  return text
}
