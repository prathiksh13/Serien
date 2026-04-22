import { useMemo } from 'react'
import Navbar from '../components/Navbar'
import VideoCall from '../components/VideoCall'
import EmotionPanel from '../components/EmotionPanel'
import EmotionGraph from '../components/Graph'
import { useDemoSignaling } from '../hooks/useDemoSignaling'

function buildDemoTimeline() {
  const emotions = ['happy', 'neutral', 'sad', 'neutral', 'happy', 'neutral']
  return emotions.map((emotion, idx) => ({
    id: `${emotion}-${idx}`,
    time: `18:2${idx}:3${idx}`,
    emotion,
    confidence: emotion === 'happy' ? 0.76 : emotion === 'neutral' ? 0.88 : 0.55,
  }))
}

export default function TherapistDashboard() {
  const { connectionStatus } = useDemoSignaling('therapist')
  const timeline = useMemo(() => buildDemoTimeline(), [])
  const labels = timeline.map((item) => item.time)

  const happy = timeline.map((t) => (t.emotion === 'happy' ? t.confidence : Math.max(0.2, t.confidence - 0.25)))
  const neutral = timeline.map((t) => (t.emotion === 'neutral' ? t.confidence : Math.max(0.2, t.confidence - 0.2)))
  const sad = timeline.map((t) => (t.emotion === 'sad' ? t.confidence : Math.max(0.1, t.confidence - 0.35)))

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto mt-5 grid w-[95%] max-w-7xl grid-cols-1 gap-4 lg:grid-cols-[2.2fr_1fr]">
        <VideoCall title="Therapist Dashboard" showOverlay status={connectionStatus} />

        <section>
          <EmotionPanel currentEmotion="Neutral" confidence={0.94} timeline={timeline} />
          <EmotionGraph labels={labels} happy={happy} neutral={neutral} sad={sad} />
        </section>
      </main>
    </div>
  )
}
