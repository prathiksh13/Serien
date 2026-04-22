import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Card from '../components/ui/Card'
import SearchBar from '../components/ui/SearchBar'
import SectionHeader from '../components/ui/SectionHeader'

const RESOURCE_LIST = [
  {
    id: 'box-breathing',
    title: 'Box Breathing',
    description: 'Simple breathing exercise to reduce anxiety quickly.',
    category: 'Breathing',
    difficulty: 'Beginner',
    duration: '5 min',
  },
  {
    id: 'grounding',
    title: '5-4-3-2-1 Grounding',
    description: 'Use your senses to calm racing thoughts.',
    category: 'Grounding',
    difficulty: 'Beginner',
    duration: '6 min',
  },
]

const FAQ_LIST = [
  {
    id: 'faq-1',
    title: 'How often should I journal?',
    description: 'Try short entries 3-4 times per week to track mood trends.',
    category: 'FAQ',
    difficulty: 'General',
    duration: '2 min',
  },
]

export default function Resources() {
  const location = useLocation()
  const [tab, setTab] = useState('resources')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [openItemId, setOpenItemId] = useState('box-breathing')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tabParam = params.get('tab')
    const categoryParam = params.get('category')

    if (tabParam === 'faq' || tabParam === 'resources') {
      setTab(tabParam)
    }

    if (categoryParam) {
      setCategory(categoryParam.toLowerCase())
    }
  }, [location.search])

  const baseList = tab === 'resources' ? RESOURCE_LIST : FAQ_LIST

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return baseList.filter((item) => {
      const matchesSearch = !needle || item.title.toLowerCase().includes(needle) || item.description.toLowerCase().includes(needle)
      const matchesCategory = category === 'all' || item.category.toLowerCase() === category
      return matchesSearch && matchesCategory
    })
  }, [baseList, category, search])

  return (
    <section className="ts-page">
      <SectionHeader
        title="Resources & Support"
        subtitle="Learn coping strategies, explore articles, and find answers to common questions"
      />

      <div className="ts-tabbar">
        <button type="button" className={`ts-tab ${tab === 'resources' ? 'ts-tab--active' : ''}`} onClick={() => setTab('resources')}>
          Resources
        </button>
        <button type="button" className={`ts-tab ${tab === 'faq' ? 'ts-tab--active' : ''}`} onClick={() => setTab('faq')}>
          FAQ
        </button>
      </div>

      <div className="ts-toolbar">
        <SearchBar placeholder="Search resources..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="ts-select">
          <option value="all">All Categories</option>
          <option value="breathing">Breathing</option>
          <option value="grounding">Grounding</option>
          <option value="faq">FAQ</option>
        </select>
      </div>

      <div className="ts-stack">
        {visibleItems.map((item) => {
          const expanded = openItemId === item.id
          return (
            <Card key={item.id} className="ts-resource-card">
              <button
                type="button"
                className="ts-resource-card__header"
                onClick={() => setOpenItemId(expanded ? '' : item.id)}
              >
                <div>
                  <h3 className="ts-section-title">{item.title}</h3>
                  <p className="ts-text-secondary">{item.description}</p>
                </div>
                <span className="ts-text-secondary" aria-hidden="true">{expanded ? 'v' : '>'}</span>
              </button>
              <div className="ts-resource-card__meta">
                <span className="ts-resource-tag">{item.category}</span>
                <span className="ts-text-secondary">{item.difficulty}</span>
                <span className="ts-text-secondary">{item.duration}</span>
              </div>
              {expanded ? (
                <p className="ts-text-secondary ts-resource-card__body">
                  Practice this resource in a quiet place and track your emotional response in your journal.
                </p>
              ) : null}
            </Card>
          )
        })}
      </div>

      <Card className="ts-crisis-banner">
        <div className="ts-crisis-banner__header">
          <span className="ts-crisis-badge">SOS</span>
          <div>
            <h3 className="ts-section-title">In Crisis? Get Help Now</h3>
            <p className="ts-text-secondary">
              If you are in immediate danger or having thoughts of self-harm, please reach out to emergency services immediately.
            </p>
          </div>
        </div>
        <div className="ts-crisis-actions">
          <a className="ts-btn ts-btn--danger" href="tel:988">Call 988 (Lifeline)</a>
          <a className="ts-btn ts-btn--danger" href="sms:741741">Text 741741 (Crisis Line)</a>
          <a className="ts-btn ts-btn--danger" href="tel:911">Call 911 (Emergency)</a>
        </div>
      </Card>
    </section>
  )
}
