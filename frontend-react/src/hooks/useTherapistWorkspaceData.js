import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { firebaseAuth, firestoreDb } from '../lib/firebase'

function mapReport(entry) {
  const data = entry.data()
  const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate() : null
  const createdLabel = createdAt ? createdAt.toLocaleString() : 'Timestamp unavailable'
  return {
    id: entry.id,
    title: `Session: ${data?.sessionId || entry.id}`,
    subtitle: `${data?.emotionSummary || 'No emotion summary'} | ${createdLabel}`,
    details: JSON.stringify(
      {
        sessionId: data?.sessionId || entry.id,
        patientId: data?.patientId || '',
        emotionSummary: data?.emotionSummary || 'No emotion summary',
        timeline: data?.timeline || [],
        graphData: data?.graphData || {},
        createdAt: createdLabel,
      },
      null,
      2
    ),
    patientId: data?.patientId || '',
    timeline: data?.timeline || [],
  }
}

function normalizeStatus(status = '') {
  const value = String(status || '').toLowerCase()
  if (value === 'accepted') return 'confirmed'
  if (value === 'ongoing' || value === 'live') return 'active'
  if (value === 'done') return 'completed'
  if (value === 'canceled') return 'cancelled'
  if (value === 'pending' || value === 'confirmed' || value === 'active' || value === 'completed' || value === 'cancelled') {
    return value
  }
  return 'pending'
}

export default function useTherapistWorkspaceData() {
  const [loading, setLoading] = useState(true)
  const [sessions, setSessions] = useState([])
  const [reports, setReports] = useState([])

  const uid = firebaseAuth?.currentUser?.uid || ''

  const refresh = useCallback(async () => {
    if (!uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [sessionsSnapshot, reportsSnapshot] = await Promise.all([
        getDocs(query(collection(firestoreDb, 'sessions'), where('therapistId', '==', uid))),
        getDocs(query(collection(firestoreDb, 'reports'), where('therapistId', '==', uid))),
      ])

      const mappedSessions = sessionsSnapshot.docs.map((entry) => {
        const data = entry.data()
        const scheduledAtRaw = data?.scheduledAt || data?.startTime || null
        const scheduledAt = scheduledAtRaw?.toDate ? scheduledAtRaw.toDate() : null
        const subtitle = scheduledAt
          ? `${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
          : 'Scheduled session'

        return {
          id: entry.id,
          title: data?.patientName ? `Patient: ${data.patientName}` : `Patient ID: ${data?.patientId || 'Unknown'}`,
          subtitle,
          patientId: data?.patientId || '',
          patientName: data?.patientName || data?.patientId || 'Patient',
          status: normalizeStatus(data?.status || 'pending'),
          roomId: data?.roomId || entry.id,
          scheduledAt,
        }
      }).sort((a, b) => (a.scheduledAt?.getTime?.() || 0) - (b.scheduledAt?.getTime?.() || 0))

      const mappedReports = reportsSnapshot.docs.map(mapReport)
      setSessions(mappedSessions)
      setReports(mappedReports)
    } catch (error) {
      console.error('Failed to load therapist workspace:', error)
    } finally {
      setLoading(false)
    }
  }, [uid])

  useEffect(() => {
    refresh()
  }, [refresh])

  const patients = useMemo(() => {
    const patientMap = new Map()
    sessions.forEach((session) => {
      if (!session.patientId) return
      patientMap.set(session.patientId, {
        id: session.patientId,
        label: session.title,
        latestSession: session.subtitle,
      })
    })
    return Array.from(patientMap.values())
  }, [sessions])

  const metrics = useMemo(() => {
    const totalSessions = sessions.length
    const totalPatients = patients.length
    const avgReportsPerPatient = totalPatients ? (reports.length / totalPatients).toFixed(1) : '0.0'

    const recentActivity = [
      ...sessions.slice(0, 2).map((session) => ({
        title: 'Session scheduled',
        description: session.title,
        time: session.subtitle,
      })),
      ...reports.slice(0, 2).map((report) => ({
        title: 'Report updated',
        description: report.title,
        time: report.subtitle,
      })),
    ]

    return {
      totalSessions,
      totalPatients,
      avgReportsPerPatient,
      recentActivity,
    }
  }, [patients.length, reports, sessions])

  const categorizedSessions = useMemo(() => {
    const now = Date.now()

    const ongoingList = sessions.filter((session) => session.status === 'active')
    const ongoingSession = ongoingList[0] || null

    const upcomingSessions = sessions.filter((session) => {
      if (session.status === 'completed' || session.status === 'cancelled') return false
      const sessionTime = session.scheduledAt?.getTime?.() || 0
      return session.status === 'active' || sessionTime >= now || session.status === 'pending' || session.status === 'confirmed'
    })

    const pastSessions = sessions.filter((session) => {
      if (session.status === 'completed') return true
      const sessionTime = session.scheduledAt?.getTime?.() || 0
      return session.status !== 'active' && sessionTime < now
    })

    return { upcomingSessions, ongoingSession, pastSessions }
  }, [sessions])

  const updateSessionStatus = useCallback(async (sessionId, status) => {
    if (!sessionId || !status) return
    await updateDoc(doc(firestoreDb, 'sessions', sessionId), { status })
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? { ...session, status } : session)))
  }, [])

  const acceptSession = useCallback(async (sessionId) => {
    await updateSessionStatus(sessionId, 'confirmed')
  }, [updateSessionStatus])

  const startSession = useCallback(async (sessionId) => {
    await updateSessionStatus(sessionId, 'active')
  }, [updateSessionStatus])

  const endSession = useCallback(async (sessionId) => {
    await updateSessionStatus(sessionId, 'completed')
  }, [updateSessionStatus])

  const deleteSessionById = useCallback(async (sessionId) => {
    if (!sessionId) return
    await deleteDoc(doc(firestoreDb, 'sessions', sessionId))
    setSessions((prev) => prev.filter((item) => item.id !== sessionId))
  }, [])

  const deleteReportById = useCallback(async (reportId) => {
    if (!reportId) return
    await deleteDoc(doc(firestoreDb, 'reports', reportId))
    setReports((prev) => prev.filter((item) => item.id !== reportId))
  }, [])

  return {
    uid,
    loading,
    sessions,
    upcomingSessions: categorizedSessions.upcomingSessions,
    ongoingSession: categorizedSessions.ongoingSession,
    pastSessions: categorizedSessions.pastSessions,
    reports,
    patients,
    metrics,
    refresh,
    acceptSession,
    startSession,
    endSession,
    updateSessionStatus,
    deleteSessionById,
    deleteReportById,
  }
}
