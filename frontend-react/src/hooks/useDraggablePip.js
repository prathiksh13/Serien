import { useCallback, useEffect, useRef, useState } from 'react'

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

export default function useDraggablePip(containerRef, pipRef) {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ active: false, offsetX: 0, offsetY: 0 })
  const rafRef = useRef(null)

  const applyPosition = useCallback((rawX, rawY) => {
    const container = containerRef.current
    const pip = pipRef.current
    if (!container || !pip) return

    const maxX = Math.max(0, container.clientWidth - pip.offsetWidth)
    const maxY = Math.max(0, container.clientHeight - pip.offsetHeight)
    setPosition({
      x: clamp(rawX, 0, maxX),
      y: clamp(rawY, 0, maxY),
    })
  }, [containerRef, pipRef])

  useEffect(() => {
    const container = containerRef.current
    const pip = pipRef.current
    if (!container || !pip) return

    const initialX = Math.max(0, container.clientWidth - pip.offsetWidth - 16)
    const initialY = Math.max(0, container.clientHeight - pip.offsetHeight - 16)
    setPosition({ x: initialX, y: initialY })
  }, [containerRef, pipRef])

  useEffect(() => {
    function onMove(event) {
      if (!dragRef.current.active) return

      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const nextX = event.clientX - rect.left - dragRef.current.offsetX
      const nextY = event.clientY - rect.top - dragRef.current.offsetY

      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        applyPosition(nextX, nextY)
      })
    }

    function onUp() {
      dragRef.current.active = false
    }

    function onResize() {
      applyPosition(position.x, position.y)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [applyPosition, containerRef, position.x, position.y])

  function onPointerDown(event) {
    const pip = pipRef.current
    if (!pip) return

    dragRef.current.active = true
    const rect = pip.getBoundingClientRect()
    dragRef.current.offsetX = event.clientX - rect.left
    dragRef.current.offsetY = event.clientY - rect.top
  }

  return {
    position,
    onPointerDown,
  }
}
