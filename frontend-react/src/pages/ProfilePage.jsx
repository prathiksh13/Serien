import { useEffect, useState } from 'react'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import Navbar from '../components/Navbar'
import { firebaseAuth, firestoreDb } from '../lib/firebase'

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [message, setMessage] = useState('')
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    age: '',
    emergencyEmail: '',
    role: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const uid = firebaseAuth?.currentUser?.uid
      if (!uid) {
        setLoading(false)
        return
      }

      try {
        const snapshot = await getDoc(doc(firestoreDb, 'users', uid))
        if (snapshot.exists()) {
          const data = snapshot.data()
          setProfile({
            name: data?.name || '',
            email: data?.email || firebaseAuth.currentUser?.email || '',
            phone: data?.phone || '',
            age: data?.age || '',
            emergencyEmail: data?.emergencyEmail || '',
            role: data?.role || '',
          })
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  function handleChange(event) {
    const { name, value } = event.target
    setProfile((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSave() {
    const uid = firebaseAuth?.currentUser?.uid
    if (!uid) return

    setSaving(true)
    setMessage('')

    try {
      await updateDoc(doc(firestoreDb, 'users', uid), {
        name: profile.name || '',
        phone: profile.phone || '',
        age: profile.age || '',
        emergencyEmail: profile.emergencyEmail || '',
      })
      setEditing(false)
      setMessage('Profile updated successfully.')
    } catch (error) {
      console.error('Failed to update profile:', error)
      setMessage('Could not save profile changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto mt-6 w-[95%] max-w-3xl">
        <section className="glass p-5">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-slate-100">Profile</h1>
            {!loading && (
              <button
                type="button"
                onClick={() => setEditing((prev) => !prev)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-slate-100 transition hover:bg-white/20"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
            )}
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-slate-300">Loading profile...</p>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                Name
                <input
                  name="name"
                  value={profile.name}
                  onChange={handleChange}
                  disabled={!editing}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                />
              </label>

              <label className="text-sm text-slate-300">
                Email
                <input
                  name="email"
                  value={profile.email}
                  disabled
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white opacity-70 outline-none"
                />
              </label>

              <label className="text-sm text-slate-300">
                Phone
                <input
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  disabled={!editing}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                />
              </label>

              <label className="text-sm text-slate-300">
                Age
                <input
                  name="age"
                  value={profile.age}
                  onChange={handleChange}
                  disabled={!editing}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                Role
                <input
                  name="role"
                  value={profile.role}
                  disabled
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm capitalize text-white opacity-70 outline-none"
                />
              </label>

              <label className="text-sm text-slate-300 md:col-span-2">
                Emergency Email
                <input
                  name="emergencyEmail"
                  value={profile.emergencyEmail}
                  onChange={handleChange}
                  disabled={!editing}
                  placeholder="family@example.com"
                  className="mt-1 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none disabled:opacity-70"
                />
              </label>
            </div>
          )}

          {editing && !loading && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="mt-5 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          )}

          {message ? <p className="mt-3 text-sm text-cyan-200">{message}</p> : null}
        </section>
      </main>
    </div>
  )
}
