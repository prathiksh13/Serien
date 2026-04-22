import { NavLink } from 'react-router-dom'

export default function Sidebar({ open, onClose, homePath = '/patient-home' }) {
  const links = [
    { to: homePath, label: 'Dashboard' },
    { to: `${homePath}#sessions`, label: 'Sessions' },
    { to: `${homePath}#reports`, label: 'Reports' },
    { to: '/profile', label: 'Profile' },
  ]

  return (
    <>
      <aside
        className={`dashboard-sidebar ${open ? 'dashboard-sidebar-open' : ''}`}
        aria-label="Sidebar"
      >
        <div className="dashboard-sidebar__brand">
          <div className="dashboard-sidebar__logo">T</div>
          <div>
            <p className="dashboard-sidebar__eyebrow">TheraSense</p>
            <h2 className="dashboard-sidebar__title">SaaS Console</h2>
          </div>
        </div>

        <nav className="dashboard-sidebar__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `dashboard-sidebar__link ${isActive ? 'dashboard-sidebar__link--active' : ''}`
              }
            >
              <span>{link.label}</span>
              <span className="dashboard-sidebar__dot" />
            </NavLink>
          ))}
        </nav>

        <div className="dashboard-sidebar__footer glass">
          <p className="dashboard-sidebar__footer-title">Live status</p>
          <p className="dashboard-sidebar__footer-text">Secure, real-time teleconsultation</p>
        </div>
      </aside>

      {open ? <button type="button" className="dashboard-sidebar__backdrop" onClick={onClose} aria-label="Close sidebar" /> : null}
    </>
  )
}
