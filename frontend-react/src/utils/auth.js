import { doc, getDoc } from 'firebase/firestore'
import { firestoreDb } from '../lib/firebase'

export async function getUserRole(uid) {
  if (!uid) return ''
  const snapshot = await getDoc(doc(firestoreDb, 'users', uid))
  if (!snapshot.exists()) return ''
  return snapshot.data()?.role || ''
}

export function getDashboardPath(role) {
  if (role === 'therapist') return '/dashboard'
  return '/dashboard'
}
