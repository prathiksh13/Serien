import { useEffect, useState } from 'react'

function formatDateLabel(value) {
  if (!value) return 'Not selected'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTimeLabel(value) {
  if (!value) return 'Not selected'
  const [hours, minutes] = value.split(':')
  if (!hours || !minutes) return value

  const date = new Date()
  date.setHours(Number(hours), Number(minutes), 0, 0)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function AppointmentForm({ therapists = [], onBook }) {
  const therapistOptions = therapists.map((item) => {
    if (typeof item === 'string') return { value: item, label: item }
    return {
      value: item?.id || item?.value || '',
      label: item?.name || item?.label || item?.id || 'Unknown therapist',
      specialization: item?.specialization || '',
    }
  })

  const specializations = ['All', ...new Set(therapistOptions.map((item) => item.specialization).filter(Boolean))]
  const today = new Date().toISOString().split('T')[0]

  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [therapist, setTherapist] = useState(therapistOptions[0]?.value || '')
  const [specializationFilter, setSpecializationFilter] = useState('All')

  useEffect(() => {
    const filtered = therapistOptions.filter((item) => {
      if (specializationFilter === 'All') return true
      return item.specialization === specializationFilter
    })

    if (filtered.length === 0) {
      setTherapist('')
      return
    }

    if (!filtered.some((item) => item.value === therapist)) {
      setTherapist(filtered[0].value)
    }
  }, [specializationFilter, therapist, therapistOptions])

  const filteredTherapists = therapistOptions.filter((item) => {
    if (specializationFilter === 'All') return true
    return item.specialization === specializationFilter
  })

  const selectedTherapist = therapistOptions.find((item) => item.value === therapist)
  const canBook = Boolean(date && time && therapist)

  function handleSubmit(event) {
    event.preventDefault()
    if (!canBook) return

    onBook?.({
      date,
      time,
      therapistId: therapist,
      therapistName: selectedTherapist?.label || '',
      therapistSpecialization: selectedTherapist?.specialization || '',
    })
    setDate('')
    setTime('')
  }

  return (
    <section className="booking-form">
      <div className="booking-form__header">
        <div className="booking-form__heading">
          <p className="booking-form__eyebrow">Appointments</p>
          <h2 className="booking-form__title">Book Appointment</h2>
          <p className="booking-form__subtitle">
            Pick the therapist, choose a date and time, and review the booking summary before confirming.
          </p>
        </div>
      </div>

      <div className="booking-form__grid">
        <label className="booking-form__field">
          <span className="booking-form__label">Specialization</span>
          <select
            value={specializationFilter}
            onChange={(event) => setSpecializationFilter(event.target.value)}
            className="booking-form__control"
          >
            {specializations.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="booking-form__field">
          <span className="booking-form__label">Therapist</span>
          <select
            value={therapist}
            onChange={(event) => setTherapist(event.target.value)}
            className="booking-form__control"
          >
            {filteredTherapists.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}{item.specialization ? ` - ${item.specialization}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>

      <form className="booking-form__schedule" onSubmit={handleSubmit}>
        <label className="booking-form__field">
          <span className="booking-form__label">Session date</span>
          <div className="booking-form__control-shell">
            <input
              type="date"
              min={today}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="booking-form__control booking-form__control--date"
            />
          </div>
          <span className="booking-form__helper">Choose the day you want the appointment.</span>
        </label>

        <label className="booking-form__field">
          <span className="booking-form__label">Session time</span>
          <div className="booking-form__control-shell">
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              className="booking-form__control booking-form__control--time"
            />
          </div>
          <span className="booking-form__helper">Select a comfortable available time slot.</span>
        </label>

        <div className="booking-form__summary">
          <div className="booking-form__summary-header">
            <div>
              <p className="booking-form__label">Booking summary</p>
              <p className="booking-form__summary-copy">Review the details before confirming.</p>
            </div>
          </div>

          <div className="booking-form__summary-grid">
            <div className="booking-form__summary-item">
              <span className="booking-form__summary-key">Specialization</span>
              <strong>{specializationFilter || 'Not selected'}</strong>
            </div>
            <div className="booking-form__summary-item">
              <span className="booking-form__summary-key">Therapist</span>
              <strong>{selectedTherapist?.label || 'Not selected'}</strong>
            </div>
            <div className="booking-form__summary-item">
              <span className="booking-form__summary-key">Date</span>
              <strong>{formatDateLabel(date)}</strong>
            </div>
            <div className="booking-form__summary-item">
              <span className="booking-form__summary-key">Time</span>
              <strong>{formatTimeLabel(time)}</strong>
            </div>
          </div>

          <button type="submit" className="booking-form__submit booking-form__submit--green" disabled={!canBook}>
            Confirm Booking
          </button>
        </div>
      </form>
    </section>
  )
}
