import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'

export default function ProfileMenu() {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(event) {
      if (buttonRef.current && !buttonRef.current.contains(event.target) && menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [open])

  function handleViewProfile() {
    setOpen(false)
    navigate('/profile')
  }

  function handleLogout() {
    signOut(firebaseAuth)
      .catch(() => {})
      .finally(() => {
        setOpen(false)
        navigate('/login')
      })
  }

  function handleSettings() {
    setOpen(false)
    navigate('/settings')
  }

  const buttonRect = buttonRef.current?.getBoundingClientRect()

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(!open)}
        className="profile-menu__button"
        aria-label="Profile menu"
      >
        <span aria-hidden="true">P</span>
      </button>

      {open && buttonRect && createPortal(
        <div
          ref={menuRef}
          className="profile-menu__menu dark-surface"
          style={{
            position: 'fixed',
            top: `${buttonRect.bottom + 8}px`,
            right: `${window.innerWidth - buttonRect.right}px`,
            zIndex: 10000,
          }}
        >
          <button
            type="button"
            onClick={handleViewProfile}
            className="profile-menu__item"
          >
            View Profile
          </button>

          <button
            type="button"
            onClick={handleSettings}
            className="profile-menu__item"
          >
            Settings
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="profile-menu__item"
            style={{ color: '#9b3d32' }}
          >
            Logout
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
