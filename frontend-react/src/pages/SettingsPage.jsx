import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import Card from '../components/ui/Card'
import SectionHeader from '../components/ui/SectionHeader'
import Toggle from '../components/ui/Toggle'
import { useAuth } from '../context/AuthContext'
import { firestoreDb } from '../lib/firebase'

const STORAGE_KEY = 'therasense-ui-settings'

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 17h5l-1.5-1.5A2 2 0 0 1 18 14v-3a6 6 0 0 0-12 0v3a2 2 0 0 1-.5 1.5L4 17h5" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
    </svg>
  )
}

export default function SettingsPage() {
  const { uid, role } = useAuth()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    sessionReminders: true,
    reportNotifications: true,
  })
  const [journalVisibility, setJournalVisibility] = useState('public')
  const [savingVisibility, setSavingVisibility] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      setSettings((prev) => ({ ...prev, ...parsed }))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    if (!uid || role !== 'patient') return

    async function loadJournalVisibility() {
      try {
        const snapshot = await getDoc(doc(firestoreDb, 'users', uid))
        if (!snapshot.exists()) return
        const visibility = snapshot.data()?.journalVisibility
        setJournalVisibility(visibility === 'private' ? 'private' : 'public')
      } catch {
        setJournalVisibility('public')
      }
    }

    loadJournalVisibility()
  }, [role, uid])

  function toggleSetting(key) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  async function toggleJournalVisibility() {
    if (!uid || role !== 'patient') return

    const nextVisibility = journalVisibility === 'public' ? 'private' : 'public'
    setJournalVisibility(nextVisibility)
    setSavingVisibility(true)

    try {
      await setDoc(
        doc(firestoreDb, 'users', uid),
        {
          journalVisibility: nextVisibility,
        },
        { merge: true }
      )
    } catch {
      setJournalVisibility((current) => (current === 'public' ? 'private' : 'public'))
    } finally {
      setSavingVisibility(false)
    }
  }

  return (
    <section className="ts-page">
      <SectionHeader
        title="Settings"
        subtitle="Manage your preferences"
      />

      <Card>
        <div className="ts-card-title-inline">
          <span className="ts-meta-icon"><BellIcon /></span>
          <h2 className="ts-section-title">Notifications</h2>
        </div>

        <div className="ts-settings-list">
          <div className="ts-settings-row">
            <p>Email Notifications</p>
            <Toggle checked={settings.emailNotifications} onChange={() => toggleSetting('emailNotifications')} />
          </div>
          <div className="ts-settings-row">
            <p>Session Reminders</p>
            <Toggle checked={settings.sessionReminders} onChange={() => toggleSetting('sessionReminders')} />
          </div>
          <div className="ts-settings-row">
            <p>Report Notifications</p>
            <Toggle checked={settings.reportNotifications} onChange={() => toggleSetting('reportNotifications')} />
          </div>
        </div>
      </Card>

      {role === 'patient' ? (
        <Card>
          <div className="ts-card-title-inline">
            <span className="ts-meta-icon"><LockIcon /></span>
            <h2 className="ts-section-title">Journal Privacy</h2>
          </div>

          <div className="ts-settings-list">
            <div className="ts-settings-row">
              <div>
                <p>Journal visibility for therapist review</p>
                <p className="ts-text-secondary">
                  {journalVisibility === 'public' ? 'Public: therapist can view your journal posts.' : 'Private: therapist cannot view your journal posts.'}
                </p>
              </div>
              <Toggle
                checked={journalVisibility === 'public'}
                onChange={toggleJournalVisibility}
                label={journalVisibility === 'public' ? 'Public' : 'Private'}
              />
            </div>
            {savingVisibility ? <p className="ts-text-secondary">Saving journal visibility...</p> : null}
          </div>
        </Card>
      ) : null}
    </section>
  )
}
