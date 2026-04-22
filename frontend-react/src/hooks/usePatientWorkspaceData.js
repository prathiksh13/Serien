import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { firebaseAuth, firestoreDb } from '../lib/firebase'

function parseReportPayload(data = {}, fallbackId = '') {
  const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate() : null
  const createdLabel = createdAt ? createdAt.toLocaleString() : 'Timestamp unavailable'

  return {
    id: fallbackId,
    title: `Session: ${data?.sessionId || fallbackId}`,
    subtitle: `${data?.emotionSummary || 'No emotion summary'} | ${createdLabel}`,
    details: JSON.stringify(
      {
        sessionId: data?.sessionId || fallbackId,
        emotionSummary: data?.emotionSummary || 'No emotion summary',
        timeline: data?.timeline || [],
        graphData: data?.graphData || {},
        createdAt: createdLabel,
      },
      null,
      2
    ),
  }
}

export default function usePatientWorkspaceData() {
  const [loading, setLoading] = useState(true)
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [pastReports, setPastReports] = useState([])
  const [therapistOptions, setTherapistOptions] = useState([])
  const [currentTherapist, setCurrentTherapist] = useState(null)
  const [patientProfile, setPatientProfile] = useState({ name: '', email: '', emergencyEmail: '' })

  const uid = firebaseAuth?.currentUser?.uid

  const loadCurrentTherapist = useCallback(async (therapistId) => {
    if (!therapistId) {
      setCurrentTherapist(null)
      return
    }

    try {
      const therapistQuery = query(collection(firestoreDb, 'users'), where('uid', '==', therapistId), limit(1))
      const therapistSnapshot = await getDocs(therapistQuery)

      if (!therapistSnapshot.empty) {
        const therapistData = therapistSnapshot.docs[0].data()
        setCurrentTherapist({
          id: therapistId,
          name: therapistData?.name || 'Therapist',
          specialization: therapistData?.specialization || '',
          email: therapistData?.email || '',
        })
        return
      }

      const therapistDoc = await getDoc(doc(firestoreDb, 'users', therapistId))
      if (therapistDoc.exists()) {
        const therapistData = therapistDoc.data()
        setCurrentTherapist({
          id: therapistId,
          name: therapistData?.name || 'Therapist',
          specialization: therapistData?.specialization || '',
          email: therapistData?.email || '',
        })
        return
      }

      setCurrentTherapist(null)
    } catch (error) {
      console.error('Failed to load therapist details:', error)
      setCurrentTherapist(null)
    }
  }, [])

  const refresh = useCallback(async () => {
    if (!uid) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const [profileSnapshot, therapistSnapshot, sessionsSnapshot, reportsSnapshot] = await Promise.all([
        getDoc(doc(firestoreDb, 'users', uid)),
        getDocs(query(collection(firestoreDb, 'users'), where('role', '==', 'therapist'))),
        getDocs(query(collection(firestoreDb, 'sessions'), where('patientId', '==', uid))),
        getDocs(query(collection(firestoreDb, 'reports'), where('patientId', '==', uid))),
      ])
      const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null

      if (profileSnapshot.exists()) {
        setPatientProfile({
          name: profileData?.name || firebaseAuth.currentUser?.displayName || '',
          email: profileData?.email || firebaseAuth.currentUser?.email || '',
          emergencyEmail: profileData?.emergencyEmail || '',
        })
      }

      const therapists = therapistSnapshot.docs.map((entry) => {
        const data = entry.data()
        return {
          id: entry.id,
          name: data?.name || data?.email || 'Therapist',
          email: data?.email || '',
          specialization: data?.specialization || '',
        }
      })
      setTherapistOptions(therapists)

      const mappedSessions = sessionsSnapshot.docs
        .map((entry) => {
          const data = entry.data()
          const scheduledAtRaw = data?.scheduledAt || data?.startTime || null
          const startTime = scheduledAtRaw?.toDate ? scheduledAtRaw.toDate() : null
          const createdAt = data?.createdAt?.toDate ? data.createdAt.toDate() : null
          const title = startTime
            ? `${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Scheduled session'

          return {
            id: entry.id,
            title,
            subtitle: data?.therapistName || data?.therapistId || 'Assigned therapist',
            patientName: data?.patientName || profileData?.name || firebaseAuth.currentUser?.displayName || '',
            therapistName: data?.therapistName || '',
            therapistId: data?.therapistId || '',
            status: data?.status || 'pending',
            roomId: data?.roomId || entry.id,
            startTime,
            scheduledAt: startTime,
            createdAt,
          }
        })
        .sort((a, b) => (b.startTime?.getTime?.() || 0) - (a.startTime?.getTime?.() || 0))

      setUpcomingSessions(mappedSessions)
      await loadCurrentTherapist(mappedSessions[0]?.therapistId)

      const mappedReports = reportsSnapshot.docs.map((entry) => parseReportPayload(entry.data(), entry.id))
      setPastReports(mappedReports)
    } catch (error) {
      console.error('Failed to load patient workspace:', error)
    } finally {
      setLoading(false)
    }
  }, [loadCurrentTherapist, uid])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    window.addEventListener('therasense:session-booked', refresh)
    return () => window.removeEventListener('therasense:session-booked', refresh)
  }, [refresh])

  const bookAppointment = useCallback(async (formData) => {
    if (!uid || !formData?.therapistId) return null

    const startTime = new Date(`${formData.date}T${formData.time}`)
    const scheduledAt = Timestamp.fromDate(startTime)
    const roomId = `${uid}_${formData.therapistId}_${Date.now()}`

    const docRef = await addDoc(collection(firestoreDb, 'sessions'), {
      patientId: uid,
      patientName: patientProfile.name || firebaseAuth.currentUser?.displayName || '',
      therapistId: formData.therapistId,
      therapistName: formData.therapistName || '',
      status: 'pending',
      roomId,
      scheduledAt,
      startTime: scheduledAt,
      createdAt: Timestamp.now(),
    })

    const meetingLink = `${window.location.origin}/patient?sessionId=${docRef.id}`

    fetch('/send-booking-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: docRef.id, meetingLink }),
    }).catch((error) => {
      console.error('Failed to send booking email:', error)
    })

    const assignmentId = `${formData.therapistId}_${uid}`
    await setDoc(
      doc(firestoreDb, 'therapistPatients', assignmentId),
      {
        therapistId: formData.therapistId,
        patientId: uid,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    )

    await refresh()
    return docRef.id
  }, [refresh, uid])

  const deleteSessionById = useCallback(async (sessionId) => {
    if (!sessionId) return
    await deleteDoc(doc(firestoreDb, 'sessions', sessionId))
    setUpcomingSessions((prev) => prev.filter((item) => item.id !== sessionId))
  }, [])

  const deleteReportById = useCallback(async (reportId) => {
    if (!reportId) return
    await deleteDoc(doc(firestoreDb, 'reports', reportId))
    setPastReports((prev) => prev.filter((item) => item.id !== reportId))
  }, [])

  const metrics = useMemo(() => {
    const totalSessions = upcomingSessions.length + pastReports.length
    const lastMood = pastReports[0]?.subtitle?.split('|')?.[0]?.replace(/.*Session: /, '') || 'Neutral'
    const improvementScore = Math.min(100, 72 + pastReports.length * 4)

    const recentBookedSessions = [...upcomingSessions]
      .sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || a.startTime?.getTime?.() || 0
        const bTime = b.createdAt?.getTime?.() || b.startTime?.getTime?.() || 0
        return bTime - aTime
      })
      .slice(0, 2)

    const recentActivity = [
      ...recentBookedSessions.map((session) => ({
        title: 'Meeting booked',
        description: session.subtitle,
        time: session.title,
      })),
      ...pastReports.slice(0, 2).map((report) => ({
        title: 'Report generated',
        description: report.title,
        time: report.subtitle,
      })),
    ]

    return {
      totalSessions,
      lastMood,
      improvementScore,
      recentActivity,
    }
  }, [pastReports, upcomingSessions])

  return {
    loading,
    uid,
    patientProfile,
    therapistOptions,
    currentTherapist,
    upcomingSessions,
    pastReports,
    metrics,
    refresh,
    bookAppointment,
    deleteSessionById,
    deleteReportById,
  }
}
