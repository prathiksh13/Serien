import Navbar from '../components/Navbar'
import VideoCall from '../components/VideoCall'
import { useDemoSignaling } from '../hooks/useDemoSignaling'

export default function PatientDashboard() {
  const { connectionStatus } = useDemoSignaling('patient')

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto mt-5 w-[95%] max-w-6xl">
        <VideoCall title="Patient Dashboard" status={connectionStatus} />

        <section className="glass mt-4 flex items-center justify-between p-4 text-sm text-slate-300">
          <p>Connected Session: Therapy Room A</p>
          <div className="flex gap-2">
            <button className="rounded-lg bg-red-500/80 px-3 py-1.5 text-white">End Call</button>
            <button className="rounded-lg bg-white/10 px-3 py-1.5">Mute</button>
          </div>
        </section>
      </main>
    </div>
  )
}
