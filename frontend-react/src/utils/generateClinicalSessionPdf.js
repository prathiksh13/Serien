import jsPDF from 'jspdf'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const CLINICAL_THEME = {
  navy: '#2F4156',
  teal: '#567C8D',
  beige: '#F5EFEB',
  text: '#263442',
  muted: '#6E7D8A',
  line: '#D6DEE3',
  panelBorder: '#DDE5EA',
  panelBg: '#FAF7F4',
}

const DEFAULT_EMOTION_META = {
  happy: { label: 'Happy', color: '#7CB48F', negative: false },
  neutral: { label: 'Neutral', color: '#9AA9B4', negative: false },
  sad: { label: 'Sad', color: '#89A8B9', negative: true },
  angry: { label: 'Angry', color: '#9A8FA8', negative: true },
  fearful: { label: 'Fearful', color: '#A9928D', negative: true },
}

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function mmToPx(mm) {
  return Math.round(mm * 3.78)
}

function sanitizePoints(points = [], selectedEmotions = []) {
  if (!Array.isArray(points) || !points.length) return []

  const keyed = new Map()
  points.forEach((point, index) => {
    const time = String(point?.time || `T${index + 1}`)
    keyed.set(time, {
      time,
      ...point,
    })
  })

  const unique = Array.from(keyed.values())
  const stride = unique.length > 90 ? Math.ceil(unique.length / 90) : 1
  const sampled = unique.filter((_, index) => index % stride === 0)

  return sampled.map((point) => {
    const next = { time: point.time }
    selectedEmotions.forEach((emotion) => {
      next[emotion] = safeNumber(point?.[emotion])
    })
    return next
  })
}

function inferRiskLevel(riskText = '') {
  const value = String(riskText || '').toLowerCase()
  if (value.includes('high')) return 'High'
  if (value.includes('medium')) return 'Medium'
  return 'Low'
}

function inferSuggestedActions(riskText = '', percentages = {}) {
  const level = inferRiskLevel(riskText)
  const sad = safeNumber(percentages.sad)
  const fearful = safeNumber(percentages.fearful)
  const angry = safeNumber(percentages.angry)

  if (level === 'High') {
    return [
      'Schedule follow-up within 3 to 5 days with structured risk check-ins.',
      'Apply daily grounding and breath regulation protocol between sessions.',
      'Review safety plan and reinforce escalation channels if symptoms intensify.',
    ]
  }

  if (level === 'Medium') {
    return [
      'Maintain weekly sessions and monitor emotional triggers using journal prompts.',
      'Introduce cognitive reframing practice after high-stress periods.',
      'Re-evaluate stress and mood trend in the next clinical review.',
    ]
  }

  if (sad >= 30 || fearful >= 25 || angry >= 25) {
    return [
      'Continue regular sessions and monitor recurring negative emotional clusters.',
      'Use short daily check-ins to identify early stress escalation patterns.',
      'Document response to coping strategies for next therapy planning.',
    ]
  }

  return [
    'Continue supportive therapy rhythm and resilience-building routines.',
    'Reinforce preventive coping habits to maintain emotional stability.',
    'Track mood transitions and discuss subtle shifts in the next session.',
  ]
}

function buildTimelineInsights(points = [], selectedEmotions = [], emotionMeta = DEFAULT_EMOTION_META) {
  if (!points.length || !selectedEmotions.length) return []

  const segments = Math.min(4, Math.max(3, Math.floor(points.length / 8)))
  const size = Math.ceil(points.length / segments)
  const result = []

  for (let i = 0; i < segments; i += 1) {
    const startIndex = i * size
    const endIndex = Math.min(points.length, (i + 1) * size)
    if (startIndex >= endIndex) continue

    const chunk = points.slice(startIndex, endIndex)
    const totals = selectedEmotions.reduce((acc, emotion) => {
      acc[emotion] = chunk.reduce((sum, point) => sum + safeNumber(point[emotion]), 0)
      return acc
    }, {})

    const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]
    const emotionKey = top?.[0] || selectedEmotions[0]
    const label = emotionMeta[emotionKey]?.label || emotionKey

    const first = chunk[0]
    const last = chunk[chunk.length - 1]
    const firstValue = safeNumber(first?.[emotionKey])
    const lastValue = safeNumber(last?.[emotionKey])

    let trend = 'stable pattern'
    if (lastValue - firstValue > 0.12) trend = `increasing ${label.toLowerCase()}`
    if (firstValue - lastValue > 0.12) trend = `decreasing ${label.toLowerCase()}`

    result.push({
      window: `${first?.time || 'Start'} - ${last?.time || 'End'}`,
      summary: `${label} (${trend})`,
    })
  }

  return result
}

async function buildLineChartImage(points = [], selectedEmotions = [], emotionMeta = DEFAULT_EMOTION_META) {
  const canvas = document.createElement('canvas')
  canvas.width = mmToPx(180)
  canvas.height = mmToPx(72)

  const labels = points.map((point) => point.time)
  const stride = labels.length > 12 ? Math.ceil(labels.length / 12) : 1

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: selectedEmotions.map((emotion) => ({
        label: emotionMeta[emotion]?.label || emotion,
        data: points.map((point) => safeNumber(point[emotion])),
        borderColor: emotionMeta[emotion]?.color || CLINICAL_THEME.teal,
        backgroundColor: `${emotionMeta[emotion]?.color || CLINICAL_THEME.teal}22`,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.35,
      })),
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: CLINICAL_THEME.text,
            boxWidth: 10,
            font: { size: 10 },
          },
        },
      },
      scales: {
        x: {
          grid: { color: '#E8EDF0' },
          ticks: {
            color: CLINICAL_THEME.muted,
            autoSkip: false,
            callback: (_value, index) => (index % stride === 0 ? labels[index] : ''),
            maxRotation: 0,
            font: { size: 9 },
          },
        },
        y: {
          min: 0,
          max: 1,
          grid: { color: '#E8EDF0' },
          ticks: {
            color: CLINICAL_THEME.muted,
            font: { size: 9 },
          },
        },
      },
    },
  })

  chart.update('none')
  const image = canvas.toDataURL('image/png')
  chart.destroy()
  return image
}

async function buildPieChartImage(percentages = {}, selectedEmotions = [], emotionMeta = DEFAULT_EMOTION_META) {
  const emotions = selectedEmotions.filter((emotion) => safeNumber(percentages[emotion]) > 0)
  const keys = emotions.length ? emotions : selectedEmotions

  const canvas = document.createElement('canvas')
  canvas.width = mmToPx(84)
  canvas.height = mmToPx(66)

  const chart = new Chart(canvas, {
    type: 'pie',
    data: {
      labels: keys.map((emotion) => emotionMeta[emotion]?.label || emotion),
      datasets: [
        {
          data: keys.map((emotion) => safeNumber(percentages[emotion])),
          backgroundColor: keys.map((emotion) => emotionMeta[emotion]?.color || CLINICAL_THEME.teal),
          borderColor: '#FFFFFF',
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: false,
      animation: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: CLINICAL_THEME.text,
            boxWidth: 10,
            font: { size: 9 },
          },
        },
      },
    },
  })

  chart.update('none')
  const image = canvas.toDataURL('image/png')
  chart.destroy()
  return image
}

function drawSectionTitle(pdf, title, x, y) {
  pdf.setDrawColor(CLINICAL_THEME.teal)
  pdf.setFillColor(CLINICAL_THEME.teal)
  pdf.circle(x, y - 1.2, 1.3, 'F')
  pdf.setTextColor(CLINICAL_THEME.navy)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text(title, x + 4, y)
}

function drawDivider(pdf, y, marginX) {
  pdf.setDrawColor(CLINICAL_THEME.line)
  pdf.setLineWidth(0.2)
  pdf.line(marginX, y, 210 - marginX, y)
}

function drawTintBox(pdf, x, y, w, h) {
  pdf.setFillColor(CLINICAL_THEME.panelBg)
  pdf.setDrawColor(CLINICAL_THEME.panelBorder)
  pdf.roundedRect(x, y, w, h, 2, 2, 'FD')
}

export async function generateClinicalSessionReportPdf({
  report,
  points,
  selectedEmotions,
  percentages,
  insights,
  therapistNotes,
  reportId,
  generatedAt,
  emotionMeta = DEFAULT_EMOTION_META,
}) {
  const selected = Array.isArray(selectedEmotions) ? selectedEmotions.filter(Boolean) : []
  if (!selected.length) {
    throw new Error('Please select at least one emotion before exporting the report.')
  }

  const cleanPoints = sanitizePoints(points, selected)
  if (!cleanPoints.length) {
    throw new Error('No session emotion data available for selected emotions.')
  }

  const topEmotions = selected
    .map((emotion) => ({ emotion, percentage: safeNumber(percentages?.[emotion]) }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 4)

  const timelineInsights = buildTimelineInsights(cleanPoints, selected, emotionMeta)
  const suggestedActions = inferSuggestedActions(insights?.risk || '', percentages)

  const lineChartImage = await buildLineChartImage(cleanPoints, selected, emotionMeta)
  const pieChartImage = await buildPieChartImage(percentages, selected, emotionMeta)

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const marginX = 14
  const contentWidth = 210 - marginX * 2
  const pageHeight = 297
  let y = 16

  const ensureSpace = (height) => {
    if (y + height <= pageHeight - 16) return
    pdf.addPage()
    y = 16
    pdf.setTextColor(CLINICAL_THEME.muted)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text('TheraSense | Session Analysis Report', marginX, y)
    y += 6
    drawDivider(pdf, y - 2.5, marginX)
  }

  ensureSpace(24)

  // Header
  drawTintBox(pdf, marginX, y - 2, contentWidth, 22)
  pdf.setTextColor(CLINICAL_THEME.navy)
  pdf.setFillColor(CLINICAL_THEME.teal)
  pdf.circle(marginX + 5, y + 4, 2.1, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(12)
  pdf.text('TheraSense', marginX + 9, y + 5)

  pdf.setFontSize(16)
  pdf.text('Session Analysis Report', 105, y + 7, { align: 'center' })

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(CLINICAL_THEME.muted)
  pdf.text(`Report ID: ${reportId || report?.id || 'N/A'}`, marginX + contentWidth - 2, y + 3, { align: 'right' })
  pdf.text(`Generated: ${generatedAt || new Date().toLocaleString()}`, marginX + contentWidth - 2, y + 8, { align: 'right' })
  y += 28

  // Session details
  ensureSpace(34)
  drawSectionTitle(pdf, 'Session Details', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  const details = [
    ['Patient Name', report?.patientName || 'Unknown'],
    ['Therapist Name', report?.therapistName || 'Unknown'],
    ['Session Date', report?.createdLabel || 'Unknown'],
    ['Duration', `${report?.raw?.emotionData?.durationMinutes || report?.raw?.durationMinutes || 'N/A'} min`],
    ['AI Model Used', report?.raw?.modelUsed || report?.raw?.emotionEngine || 'face-api.js'],
  ]

  drawTintBox(pdf, marginX, y, contentWidth, 26)
  pdf.setFontSize(9)
  details.forEach((item, index) => {
    const col = index % 2
    const row = Math.floor(index / 2)
    const dx = marginX + 4 + col * (contentWidth / 2)
    const dy = y + 5 + row * 7
    pdf.setFont('helvetica', 'bold')
    pdf.setTextColor(CLINICAL_THEME.navy)
    pdf.text(`${item[0]}:`, dx, dy)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(CLINICAL_THEME.text)
    pdf.text(String(item[1]), dx + 25, dy)
  })
  y += 32

  // Emotional summary
  ensureSpace(46)
  drawSectionTitle(pdf, 'Emotional Summary', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  drawTintBox(pdf, marginX, y, contentWidth, 38)
  topEmotions.forEach((item, index) => {
    const meta = emotionMeta[item.emotion] || {}
    const rowY = y + 7 + index * 8
    const barX = marginX + 40
    const barW = 112
    const valueW = Math.max(2, (barW * item.percentage) / 100)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(meta.negative ? '#7B5F6D' : CLINICAL_THEME.text)
    pdf.text(`${meta.label || item.emotion} - ${item.percentage}%`, marginX + 4, rowY)

    pdf.setFillColor(226, 233, 236)
    pdf.roundedRect(barX, rowY - 3.4, barW, 3.8, 1.2, 1.2, 'F')

    const rgb = (meta.color || CLINICAL_THEME.teal).replace('#', '')
    const r = parseInt(rgb.substring(0, 2), 16)
    const g = parseInt(rgb.substring(2, 4), 16)
    const b = parseInt(rgb.substring(4, 6), 16)
    pdf.setFillColor(r, g, b)
    pdf.roundedRect(barX, rowY - 3.4, valueW, 3.8, 1.2, 1.2, 'F')
  })
  y += 44

  // Emotion analysis graph
  ensureSpace(66)
  drawSectionTitle(pdf, 'Emotion Analysis Graph', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  drawTintBox(pdf, marginX, y, contentWidth, 58)
  pdf.addImage(lineChartImage, 'PNG', marginX + 3, y + 3, contentWidth - 6, 50)
  y += 64

  // Emotion distribution
  ensureSpace(62)
  drawSectionTitle(pdf, 'Emotion Distribution', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  drawTintBox(pdf, marginX, y, contentWidth, 54)
  pdf.addImage(pieChartImage, 'PNG', marginX + 4, y + 3, 88, 46)

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  topEmotions.forEach((item, index) => {
    const meta = emotionMeta[item.emotion] || {}
    const textY = y + 10 + index * 9
    pdf.setTextColor(CLINICAL_THEME.text)
    pdf.text(`${meta.label || item.emotion}: ${item.percentage}%`, marginX + 98, textY)
  })
  y += 60

  // Timeline insights
  ensureSpace(50)
  drawSectionTitle(pdf, 'Timeline Insights', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  const timelineHeight = Math.max(24, timelineInsights.length * 8 + 8)
  drawTintBox(pdf, marginX, y, contentWidth, timelineHeight)
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  pdf.setTextColor(CLINICAL_THEME.text)
  timelineInsights.forEach((item, index) => {
    const rowY = y + 7 + index * 8
    pdf.circle(marginX + 4, rowY - 1.4, 0.7, 'F')
    pdf.text(`${item.window} -> ${item.summary}`, marginX + 7, rowY)
  })
  y += timelineHeight + 6

  // AI insights
  ensureSpace(74)
  drawSectionTitle(pdf, 'AI-Generated Insights', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  drawTintBox(pdf, marginX, y, contentWidth, 66)

  const writeInsightBlock = (label, value, startY) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(CLINICAL_THEME.navy)
    pdf.text(label, marginX + 4, startY)
    pdf.setFont('helvetica', 'normal')
    pdf.setTextColor(CLINICAL_THEME.text)
    const lines = pdf.splitTextToSize(String(value || 'N/A'), contentWidth - 10)
    pdf.text(lines, marginX + 4, startY + 4)
    return lines.length * 3.9 + 6
  }

  let innerY = y + 7
  innerY += writeInsightBlock('Key Observations', insights?.behavior, innerY)
  innerY += writeInsightBlock('Behavioral Patterns', insights?.trend, innerY)
  innerY += writeInsightBlock('Risk Indicators', insights?.risk, innerY)
  innerY += writeInsightBlock('Suggested Actions', suggestedActions.map((item, index) => `${index + 1}. ${item}`).join(' '), innerY)
  y += 72

  // Therapist notes
  ensureSpace(42)
  drawSectionTitle(pdf, 'Therapist Notes', marginX, y)
  y += 4
  drawDivider(pdf, y, marginX)
  y += 3

  drawTintBox(pdf, marginX, y, contentWidth, 34)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(CLINICAL_THEME.text)
  const notes = String(therapistNotes || report?.raw?.therapistNotes || 'No therapist notes provided.')
  const notesLines = pdf.splitTextToSize(notes, contentWidth - 8)
  pdf.text(notesLines, marginX + 4, y + 7)
  y += 42

  // Footer
  ensureSpace(16)
  drawDivider(pdf, pageHeight - 18, marginX)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(CLINICAL_THEME.muted)
  pdf.text('This report is AI-assisted and should support, not replace, professional judgment.', marginX, pageHeight - 12)
  pdf.setFont('helvetica', 'bold')
  pdf.text('TheraSense', 210 - marginX, pageHeight - 12, { align: 'right' })

  pdf.save(`therasense-session-analysis-${reportId || report?.id || 'report'}.pdf`)
}
