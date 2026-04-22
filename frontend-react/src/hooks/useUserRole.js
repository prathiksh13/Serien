import { useAuth } from '../context/AuthContext'

export default function useUserRole() {
  const { loading, role, uid } = useAuth()
  return { loading, role, uid }
}
