import { useEffect, useMemo, useState } from 'react'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const EMOJI_OPTIONS = ['🙂', '😐', '😔', '😟', '😄']

export default function PatientJournal({ userId }) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10))
  const [mood, setMood] = useState(5)
  const [emoji, setEmoji] = useState('🙂')
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [entries, setEntries] = useState([])

  useEffect(() => {
    if (!userId) return

    async function loadEntries() {
      try {
        const snapshot = await getDocs(query(collection(firestoreDb, 'patientJournals'), where('userId', '==', userId)))
        const mapped = snapshot.docs
          .map((docItem) => ({ id: docItem.id, ...docItem.data() }))
          .sort((a, b) => String(a.entryDate || '').localeCompare(String(b.entryDate || '')))
        setEntries(mapped)
      } catch (error) {
        console.error('Failed to load journal entries:', error)
      }
    }

    loadEntries()
  }, [userId])

  const chartData = useMemo(() => {
    const lastEntries = entries.slice(-14)
    return {
      labels: lastEntries.map((item) => item.entryDate || '-'),
      datasets: [
        {
          label: 'Daily mood',
          data: lastEntries.map((item) => Number(item.mood || 0)),
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.12)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
        },
      ],
    }
  }, [entries])

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 1,
          max: 10,
          ticks: { color: '#9fb0cc' },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
        x: {
          ticks: { color: '#9fb0cc', maxTicksLimit: 7 },
          grid: { color: 'rgba(255,255,255,0.08)' },
        },
      },
      plugins: {
        legend: {
          labels: { color: '#dce6f8' },
        },
      },
    }),
    []
  )

  async function handleSaveJournal(event) {
    event.preventDefault()
    if (!userId || !entryDate || !text.trim()) {
      setStatus('Please add date and journal text.')
      return
    }

    setSaving(true)
    setStatus('')

    try {
      const payload = {
        userId,
        entryDate,
        mood: Number(mood),
        text: text.trim(),
        emoji: emoji || '',
        createdAt: serverTimestamp(),
      }

      const ref = await addDoc(collection(firestoreDb, 'patientJournals'), payload)
      setEntries((prev) => [...prev, { ...payload, id: ref.id }].sort((a, b) => String(a.entryDate).localeCompare(String(b.entryDate))))
      setText('')
      setStatus('Journal saved.')
    } catch (error) {
      console.error('Failed to save journal:', error)
      setStatus('Could not save journal entry.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="glass p-4 dashboard-card-hover">
      <p className="dashboard-panel__eyebrow">Patient journal</p>
      <h2 className="dashboard-panel__title">Daily mood logging</h2>

      <form className="mt-3 grid gap-3" onSubmit={handleSaveJournal}>
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm text-slate-300">
            Date
            <input
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </label>

          <label className="text-sm text-slate-300">
            Mood: {mood}/10
            <input
              type="range"
              min="1"
              max="10"
              value={mood}
              onChange={(event) => setMood(event.target.value)}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="text-sm text-slate-300">
            Emoji (optional)
            <select
              value={emoji}
              onChange={(event) => setEmoji(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            >
              {EMOJI_OPTIONS.map((option) => (
                <option key={option} value={option} className="bg-slate-900">
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="text-sm text-slate-300">
          Journal entry
          <textarea
            rows={3}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            placeholder="How are you feeling today?"
          />
        </label>

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-70"
        >
          {saving ? 'Saving...' : 'Save Journal'}
        </button>
      </form>

      {status ? <p className="mt-2 text-xs text-cyan-200">{status}</p> : null}

      <div className="mt-4 h-[240px] rounded-xl border border-white/10 bg-white/5 p-3">
        <Line data={chartData} options={chartOptions} />
      </div>

      <ul className="mt-3 space-y-2 text-sm text-slate-200">
        {entries.slice(-5).reverse().map((entry) => (
          <li key={entry.id} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="font-semibold">{entry.entryDate} - Mood {entry.mood}/10 {entry.emoji || ''}</p>
            <p className="mt-1 text-xs text-slate-300">{entry.text}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
