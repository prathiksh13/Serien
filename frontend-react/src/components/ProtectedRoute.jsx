import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getDashboardPath } from '../utils/auth'

export default function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation()
  const { loading, role, user } = useAuth()

  if (loading) {
    return null
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (allowedRoles?.length && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={getDashboardPath(role)} replace />
  }

  return children
}
