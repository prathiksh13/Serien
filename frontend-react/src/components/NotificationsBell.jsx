import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

function isUpcomingSoon(startTime) {
  if (!startTime?.toDate) return false
  const time = startTime.toDate().getTime()
  const now = Date.now()
  const horizon = now + 1000 * 60 * 60 * 24
  return time > now && time <= horizon
}

export default function NotificationsBell({ uid, role }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    if (!uid || !role) {
      setNotifications([])
      return
    }

    let cancelled = false

    async function loadNotifications() {
      try {
        const sessionField = role === 'therapist' ? 'therapistId' : 'patientId'
        const reportField = role === 'therapist' ? 'therapistId' : 'patientId'

        const [sessionsSnapshot, reportsSnapshot] = await Promise.all([
          getDocs(query(collection(firestoreDb, 'sessions'), where(sessionField, '==', uid))),
          getDocs(query(collection(firestoreDb, 'reports'), where(reportField, '==', uid))),
        ])

        const upcoming = sessionsSnapshot.docs
          .filter((entry) => isUpcomingSoon(entry.data()?.startTime))
          .slice(0, 3)
          .map((entry) => {
            const data = entry.data()
            const start = data?.startTime?.toDate ? data.startTime.toDate() : null
            return {
              id: `s-${entry.id}`,
              type: 'upcoming',
              title: 'Upcoming session',
              detail: start ? start.toLocaleString() : 'Scheduled soon',
            }
          })

        const readyReports = reportsSnapshot.docs
          .slice(0, 3)
          .map((entry) => {
            const data = entry.data()
            const created = data?.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : 'Recently generated'
            return {
              id: `r-${entry.id}`,
              type: 'report',
              title: 'Report ready',
              detail: created,
            }
          })

        if (!cancelled) {
          setNotifications([...upcoming, ...readyReports])
        }
      } catch (error) {
        console.error('Failed to load notifications:', error)
      }
    }

    loadNotifications()
    const timer = window.setInterval(loadNotifications, 60000)

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [role, uid])

  const unreadCount = useMemo(() => notifications.length, [notifications])

  return (
    <div className="notifications-bell">
      <button
        type="button"
        className="notifications-bell__button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notifications"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14v-3a6 6 0 0 0-12 0v3a2 2 0 0 1-.5 1.5L4 17h5" />
          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
        </svg>
        {unreadCount ? <span className="notifications-bell__badge">{unreadCount}</span> : null}
      </button>

      {open ? (
        <div className="notifications-bell__panel glass" style={{ top: 'calc(100% + 0.7rem)' }}>
          <h3 className="notifications-bell__title">Notifications</h3>
          {notifications.length ? (
            <ul className="notifications-bell__list">
              {notifications.map((item) => (
                <li key={item.id} className="notifications-bell__item">
                  <p className="notifications-bell__item-title">{item.title}</p>
                  <p className="notifications-bell__item-detail">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="notifications-bell__empty">No new notifications</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
