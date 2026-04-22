import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/auth'

export default function PublicRoute({ children }) {
  const { loading, role, user } = useAuth()

  if (loading) {
    return null
  }

  if (user && role) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return children
}
