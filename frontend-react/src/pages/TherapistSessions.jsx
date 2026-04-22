import { useNavigate } from 'react-router-dom'
import SessionList from '../components/SessionList'
import TherapistNotes from '../components/TherapistNotes'
import useTherapistWorkspaceData from '../hooks/useTherapistWorkspaceData'

export default function TherapistSessions() {
  const navigate = useNavigate()
  const { deleteSessionById, sessions, uid } = useTherapistWorkspaceData()
  const joinableSessions = sessions.filter((session) => session.status === 'ongoing')

  function handleJoinSession(session) {
    if (session?.status !== 'ongoing' || !session?.roomId) return
    if (session?.id) {
      sessionStorage.setItem('activeSessionId', session.roomId)
    }
    if (session?.patientId) {
      sessionStorage.setItem('activePatientId', session.patientId)
    }
    navigate(`/video-call/${session.roomId}`)
  }

  async function handleDeleteSession(session) {
    if (!session?.id) return
    const shouldDelete = window.confirm('Are you sure?')
    if (!shouldDelete) return

    try {
      await deleteSessionById(session.id)
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  return (
    <section className="dashboard-grid--cards">
      <SessionList
        title="Ongoing Therapy Sessions"
        sessions={joinableSessions}
        actionLabel="Join Call"
        onAction={handleJoinSession}
        onDelete={handleDeleteSession}
        emptyText="No ongoing sessions"
      />
      <TherapistNotes therapistId={uid} sessions={sessions} />
    </section>
  )
}
