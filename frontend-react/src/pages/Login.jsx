import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { firebaseAuth, firestoreDb, googleProvider } from '../lib/firebase'
import { getDashboardPath, getUserRole } from '../utils/auth'

const roleOptions = [
  { value: 'patient', label: 'Patient' },
  { value: 'therapist', label: 'Therapist' },
]

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.7A4 4 0 0 1 19 11c0 5.5-7 10-7 10Z" />
    </svg>
  )
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
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

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.4" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v4.2h5.9c-.3 1.8-2.1 5.3-5.9 5.3-3.6 0-6.5-3-6.5-6.8S8.4 6 12 6c2 0 3.4.9 4.2 1.6l2.9-2.8C17.2 3 14.8 2 12 2a10 10 0 0 0 0 20c5.8 0 9.7-4.1 9.7-9.8 0-.7-.1-1.3-.2-2H12Z" />
    </svg>
  )
}

function getFirebaseAuthMessage(error) {
  const code = error?.code || ''

  if (code === 'auth/unauthorized-domain') {
    return `Google sign-in is blocked for this domain. Add ${window.location.hostname} to Firebase Authentication authorized domains.`
  }

  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in was closed before it finished.'
  }

  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Invalid email or password.'
  }

  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Try logging in instead.'
  }

  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters.'
  }

  if (code === 'auth/invalid-email') {
    return 'Enter a valid email address.'
  }

  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled in Firebase Authentication.'
  }

  return error?.message || 'Unable to sign in right now. Please try again.'
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [role, setRole] = useState('patient')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [googleRole, setGoogleRole] = useState('patient')
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!firebaseAuth) return undefined

    const unsubscribe = onAuthStateChanged(firebaseAuth, (user) => {
      if (!user) return

      getUserRole(user.uid)
        .then((storedRole) => {
          if (storedRole) {
            navigate(getDashboardPath(storedRole), { replace: true })
          }
        })
        .catch(() => {})
    })

    return () => unsubscribe()
  }, [navigate])

  async function handleSignIn(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    try {
      const credential = await signInWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password)
      const userRef = doc(firestoreDb, 'users', credential.user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        setError('Role not found for this account. Please sign up first.')
        setLoading(false)
        return
      }

      const storedRole = userSnap.data()?.role
      if (!storedRole) {
        setError('Role not found for this account. Please sign up first.')
        setLoading(false)
        return
      }

      await updateDoc(userRef, { lastLogin: serverTimestamp() })
      navigate(getDashboardPath(storedRole), { replace: true, state: { from: location } })
    } catch (signInError) {
      setError(getFirebaseAuthMessage(signInError))
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(event) {
    event.preventDefault()

    setLoading(true)
    setError('')
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim().toLowerCase(), password)
      if (name.trim()) {
        await updateProfile(credential.user, { displayName: name.trim() })
      }

      await setDoc(doc(firestoreDb, 'users', credential.user.uid), {
        name: name.trim(),
        email: credential.user.email || email.trim().toLowerCase(),
        phone: phone.trim(),
        age: Number(age),
        role,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
      })

      navigate(getDashboardPath(role), { replace: true, state: { from: location } })
    } catch (signUpError) {
      setError(getFirebaseAuthMessage(signUpError))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    setError('')
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider)
      const userRef = doc(firestoreDb, 'users', result.user.uid)
      const userSnap = await getDoc(userRef)
      const existingRole = userSnap.exists() ? userSnap.data()?.role : ''

      if (existingRole) {
        await updateDoc(userRef, { lastLogin: serverTimestamp() })
        navigate(getDashboardPath(existingRole), { replace: true, state: { from: location } })
      } else {
        setPendingGoogleUser(result.user)
      }
    } catch (googleError) {
      setError(getFirebaseAuthMessage(googleError))
    } finally {
      setLoading(false)
    }
  }

  function handleCompleteGoogleRole() {
    if (!pendingGoogleUser) return

    setDoc(doc(firestoreDb, 'users', pendingGoogleUser.uid), {
      name: pendingGoogleUser.displayName || '',
      email: pendingGoogleUser.email || '',
      phone: '',
      age: null,
      role: googleRole,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    })
      .then(() => {
        setPendingGoogleUser(null)
        navigate(getDashboardPath(googleRole), { replace: true, state: { from: location } })
      })
      .catch(() => {
        setError('Unable to save role. Please try again.')
      })
  }

  function switchMode(nextMode) {
    setMode(nextMode)
    setError('')
  }

  return (
	<section className="ts-auth-shell">
	  <div className="ts-auth-brand">
	    <h1>TheraSense</h1>
	    <p>Mental Health Support Platform</p>
	  </div>

      <div className="ts-auth-card">
        <div className="ts-auth-tabs">
          <button type="button" onClick={() => switchMode('signin')} className={mode === 'signin' ? 'is-active' : ''}>Login</button>
          <button type="button" onClick={() => switchMode('signup')} className={mode === 'signup' ? 'is-active' : ''}>Sign Up</button>
        </div>

        <div className="ts-auth-tabs ts-auth-tabs--role">
          {roleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setRole(option.value)
                setGoogleRole(option.value)
              }}
              className={role === option.value ? 'is-active' : ''}
            >
              {option.label}
            </button>
          ))}
        </div>

        <form className="ts-auth-form" onSubmit={mode === 'signin' ? handleSignIn : handleSignUp}>
          {mode === 'signup' ? (
            <>
              <label htmlFor="name" className="ts-field-label">FULL NAME</label>
              <input id="name" value={name} onChange={(event) => setName(event.target.value)} className="ts-input" />

              <label htmlFor="phone" className="ts-field-label">PHONE</label>
              <input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="ts-input" />

              <label htmlFor="age" className="ts-field-label">AGE</label>
              <input id="age" value={age} onChange={(event) => setAge(event.target.value)} className="ts-input" type="number" min="1" />
            </>
          ) : null}

          <label htmlFor="email" className="ts-field-label">EMAIL ADDRESS</label>
          <div className="ts-input-wrap">
            <span className="ts-input-wrap__icon"><EnvelopeIcon /></span>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="ts-input"
              autoComplete="email"
            />
          </div>

          <label htmlFor="password" className="ts-field-label">PASSWORD</label>
          <div className="ts-input-wrap">
            <span className="ts-input-wrap__icon"><LockIcon /></span>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="........"
              className="ts-input"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {error ? <p className="ts-error-text">{error}</p> : null}

          <button type="submit" disabled={loading} className="ts-btn ts-btn--green ts-auth-submit">
            {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In ->' : 'Create Account'}
          </button>
        </form>

        <div className="ts-auth-divider">
          <span />
          <p>or continue with</p>
          <span />
        </div>

        <button type="button" onClick={handleGoogleSignIn} disabled={loading} className="ts-btn ts-btn--outline ts-auth-google">
          <GoogleIcon />
          Google
        </button>

        {pendingGoogleUser ? (
          <div className="ts-auth-google-role">
            <p>Select role for your new Google account</p>
            <button type="button" className="ts-btn ts-btn--green" onClick={handleCompleteGoogleRole}>Continue</button>
          </div>
        ) : null}
      </div>

      <p className="ts-auth-footer"><ShieldIcon />HIPAA Compliant & Secure</p>
    </section>
  )
}
