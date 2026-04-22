import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import ChatWidget from '../components/ChatWidget'
import Dashboard from '../components/Dashboard'
import DashboardShell from '../components/DashboardShell'
import ReportList from '../components/ReportList'
import SessionList from '../components/SessionList'
import { firebaseAuth, firestoreDb } from '../lib/firebase'

function downloadTextFile(fileName, content) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function TherapistHome() {
  const navigate = useNavigate()
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [reports, setReports] = useState([])
  const totalSessions = upcomingSessions.length + reports.length
  const lastMood = reports[0]?.subtitle?.split('|')?.[0] || 'Neutral'
  const improvementScore = Math.min(100, 70 + reports.length * 3)

  const dashboardStats = [
    {
      icon: 'TS',
      title: 'Total sessions',
      value: String(totalSessions),
      subtext: 'Handled consultations this cycle',
    },
    {
      icon: 'LM',
      title: 'Last mood',
      value: lastMood,
      subtext: 'Most recent emotional snapshot',
    },
    {
      icon: 'IS',
      title: 'Improvement score',
      value: `${improvementScore}%`,
      subtext: 'Patient trend across sessions',
    },
  ]

  const recentActivities = [
    ...(upcomingSessions.slice(0, 2).map((session) => ({
      title: 'Session scheduled',
      description: session.title,
      time: session.subtitle,
    }))),
    ...(reports.slice(0, 2).map((report) => ({
      title: 'Report updated',
      description: report.title,
      time: report.subtitle,
    }))),
  ]

  async function fetchReports(userId) {
    const reportsSnapshot = await getDocs(query(collection(firestoreDb, 'reports'), where('therapistId', '==', userId)))
    return reportsSnapshot.docs.map((entry) => {
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
            emotionSummary: data?.emotionSummary || 'No emotion summary',
            timeline: data?.timeline || [],
            graphData: data?.graphData || {},
            createdAt: createdLabel,
          },
          null,
          2
        ),
      }
    })
  }

  useEffect(() => {
    const uid = firebaseAuth?.currentUser?.uid
    if (!uid) return

    async function loadDashboardData() {
      try {
        const sessionsSnapshot = await getDocs(query(collection(firestoreDb, 'sessions'), where('therapistId', '==', uid)))
        const mappedSessions = sessionsSnapshot.docs.map((entry) => {
          const data = entry.data()
          const scheduledAtRaw = data?.scheduledAt || data?.startTime || null
          const startTime = scheduledAtRaw?.toDate ? scheduledAtRaw.toDate() : null
          const subtitle = startTime
            ? `${startTime.toLocaleDateString()} at ${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
            : 'Scheduled session'

          return {
            id: entry.id,
            title: data?.patientName ? `Patient: ${data.patientName}` : `Patient ID: ${data?.patientId || 'Unknown'}`,
            subtitle,
            patientId: data?.patientId || '',
            roomId: data?.roomId || entry.id,
            status: data?.status || 'pending',
          }
        })
        setUpcomingSessions(mappedSessions)

        const fetchedReports = await fetchReports(uid)
        setReports(fetchedReports)
      } catch (error) {
        console.error('Failed to load therapist dashboard:', error)
      }
    }

    loadDashboardData()
  }, [])

  const sessionSummary = reports
    .map((report) => `${report.title}: ${report.details}`)
    .join(' | ')

  function handleJoinSession(session) {
    if (!session?.roomId || session?.status !== 'ongoing') return
    sessionStorage.setItem('activeSessionId', session.roomId)
    if (session?.patientId) {
      sessionStorage.setItem('activePatientId', session.patientId)
    }
    navigate(`/video-call/${session.roomId}`)
  }

  function handleDownloadReport(report) {
    downloadTextFile(`${report.id}.txt`, `${report.title}\n${report.subtitle}\n\n${report.details}`)
  }

  async function handleDeleteSession(session) {
    if (!session?.id) return
    const shouldDelete = window.confirm('Are you sure?')
    if (!shouldDelete) return

    try {
      await deleteDoc(doc(firestoreDb, 'sessions', session.id))
      setUpcomingSessions((prev) => prev.filter((item) => item.id !== session.id))
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  async function handleDeleteReport(report) {
    if (!report?.id) return
    const shouldDelete = window.confirm('Are you sure?')
    if (!shouldDelete) return

    try {
      await deleteDoc(doc(firestoreDb, 'reports', report.id))
      setReports((prev) => prev.filter((item) => item.id !== report.id))
    } catch (error) {
      console.error('Failed to delete report:', error)
    }
  }

  return (
    <DashboardShell homePath="/therapist-home">
      <section className="dashboard-stack">
        <Dashboard
          upcomingSession={upcomingSessions[0] ? {
            title: upcomingSessions[0].title,
            subtitle: 'Next consultation',
            date: upcomingSessions[0].subtitle,
            time: 'Join from session panel',
          } : null}
          stats={dashboardStats}
          activities={recentActivities}
        />

        <div className="dashboard-grid--cards" id="sessions">
          <SessionList
            title="Upcoming Sessions"
            sessions={upcomingSessions.filter((session) => session.status === 'ongoing')}
            actionLabel="Join Call"
            onAction={handleJoinSession}
            onDelete={handleDeleteSession}
            emptyText="No ongoing sessions"
          />
          <ReportList
            title="Patient Reports"
            reports={reports}
            actionLabel="Download report"
            onAction={handleDownloadReport}
            onDelete={handleDeleteReport}
          />
        </div>

        <div id="reports" />
      </section>
      <ChatWidget mode="therapist" context={{ emotionTimeline: [], sessionSummary }} />
    </DashboardShell>
  )
}
