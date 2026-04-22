import { doc, getDoc } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

export function normalizeCallStatus(status = '') {
  const value = String(status || '').toLowerCase()
  if (value === 'accepted') return 'confirmed'
  if (value === 'ongoing' || value === 'live') return 'active'
  if (value === 'done') return 'completed'
  if (value === 'canceled') return 'cancelled'
  return value || 'pending'
}

export async function getSessionById(sessionId) {
  if (!sessionId) return null
  const snapshot = await getDoc(doc(firestoreDb, 'sessions', sessionId))
  if (!snapshot.exists()) return null
  return { id: snapshot.id, ...snapshot.data() }
}

export async function handleJoinCall({ sessionId, role, currentUserId, navigate }) {
  const session = await getSessionById(sessionId)
  if (!session) {
    window.alert('Session not found.')
    return
  }

  const status = normalizeCallStatus(session.status)
  if (status !== 'active') {
    window.alert('Session is not active yet')
    return
  }

  if (role === 'patient' && session?.patientId && currentUserId && session.patientId !== currentUserId) {
    window.alert('This session does not belong to your account.')
    return
  }

  const roomUrl = session.roomUrl || session.callUrl || session.meetingUrl
  if (roomUrl) {
    if (/^https?:\/\//i.test(roomUrl)) {
      window.open(roomUrl, '_blank', 'noopener,noreferrer')
      return
    }
    navigate(roomUrl)
    return
  }

  const roomId = session.roomId || session.id
  if (roomId) {
    sessionStorage.setItem('activeSessionId', roomId)
    if (session.patientId) {
      sessionStorage.setItem('activePatientId', session.patientId)
    }
    if (session.patientName) {
      sessionStorage.setItem('activePatientName', session.patientName)
    }
    navigate(`/video-call/${roomId}`)
    return
  }

  console.log('joinCall placeholder for session:', session.id)
  window.alert(`Connecting to session ${session.id}...`)
}