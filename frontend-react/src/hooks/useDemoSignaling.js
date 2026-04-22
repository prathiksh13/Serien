import { useEffect, useState } from 'react'
import { socket } from '../lib/socket'

export function useDemoSignaling(role) {
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')

  useEffect(() => {
    function handleConnect() {
      setConnectionStatus('Connected to signaling server')
      socket.emit('join-role', role)
    }

    function handleDisconnect() {
      setConnectionStatus('Disconnected')
    }

    function handlePeerStatus(status) {
      if (role === 'patient') {
        setConnectionStatus(status.therapistConnected ? 'Therapist online' : 'Waiting for therapist')
      }

      if (role === 'therapist') {
        setConnectionStatus(status.patientConnected ? 'Patient online' : 'Waiting for patient')
      }
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('peer-status', handlePeerStatus)

    if (socket.connected) {
      handleConnect()
    }

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('peer-status', handlePeerStatus)
    }
  }, [role])

  return {
    socket,
    connectionStatus,
  }
}
