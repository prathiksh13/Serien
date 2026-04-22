export default function MessageBubble({ role, text }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${
          isUser
            ? 'rounded-br-md bg-cyan-500/90 text-white'
            : 'rounded-bl-md border border-white/10 bg-slate-800/95 text-slate-100'
        }`}
      >
        {text}
      </div>
    </div>
  )
}
