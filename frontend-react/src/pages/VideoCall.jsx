import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Patient from './Patient'
import Therapist from './Therapist'
import useUserRole from '../hooks/useUserRole'

export default function VideoCall() {
  const { roomId } = useParams()
  const { loading, role } = useUserRole()

  useEffect(() => {
    if (!roomId) return
    sessionStorage.setItem('activeSessionId', roomId)
  }, [roomId])

  if (loading) {
    return null
  }

  if (role === 'therapist') {
    return <Therapist />
  }

  return <Patient />
}
