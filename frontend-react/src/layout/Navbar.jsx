import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationsBell from '../components/NotificationsBell'
import useUserRole from '../hooks/useUserRole'

function getPageTitle(pathname) {
  if (pathname === '/dashboard') return 'Dashboard'
  if (pathname === '/sessions') return 'Appointments'
  if (pathname === '/reports') return 'Reports & Notes'
  if (pathname === '/resources') return 'Resources & Support'
  if (pathname === '/profile') return 'Profile'
  if (pathname === '/journal') return 'My Journal'
  if (pathname === '/therapist/journal') return 'Journal'
  if (pathname === '/settings') return 'Settings'
  return 'Workspace'
}

export default function Navbar({ onMenuToggle }) {
  const location = useLocation()
  const { user } = useAuth()
  const { role, uid } = useUserRole()
  const title = useMemo(() => getPageTitle(location.pathname), [location.pathname])
  const displayName = user?.displayName || user?.email?.split('@')?.[0] || 'User'

  return (
    <nav className="workspace-topbar dashboard-navbar" style={{ overflow: 'visible' }}>
      <div className="workspace-topbar__left dashboard-navbar__left">
        <button
          type="button"
          onClick={onMenuToggle}
          className="dashboard-navbar__menu"
          aria-label="Toggle sidebar"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
        <div className="workspace-topbar__brand">
          <div className="workspace-topbar__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
            </svg>
          </div>
          <div>
            <h1 className="workspace-topbar__title dashboard-navbar__title">TheraSense</h1>
            <p className="workspace-topbar__page-label">{title}</p>
          </div>
        </div>
      </div>

      <div className="workspace-topbar__right dashboard-navbar__right">
        <NotificationsBell uid={uid} role={role} />
        <div className="workspace-topbar__identity">
          <p className="workspace-topbar__name">{displayName}</p>
          <p className="workspace-topbar__role">{role ? role.toUpperCase() : 'PATIENT'}</p>
        </div>
        <div className="workspace-topbar__avatar" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="3.25" />
            <path d="M6.5 19c1.5-3 3.8-4.5 5.5-4.5S16 16 17.5 19" />
          </svg>
        </div>
      </div>
    </nav>
  )
}
