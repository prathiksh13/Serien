import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase'
import { getUserRole } from '../utils/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setLoading(true)
      setUser(nextUser)

      if (!nextUser) {
        setRole('')
        setLoading(false)
        return
      }

      try {
        const resolvedRole = await getUserRole(nextUser.uid)
        setRole(resolvedRole || '')
      } catch {
        setRole('')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      uid: user?.uid || '',
      role,
      loading,
      syncRole(roleValue) {
        setRole(roleValue || '')
      },
    }),
    [loading, role, user]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const contextValue = useContext(AuthContext)
  if (!contextValue) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return contextValue
}
