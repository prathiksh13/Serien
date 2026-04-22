import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Sparkles } from '@react-three/drei'
import BrainModel, { BrainFallbackMesh, safePreloadBrainModel } from './BrainModel'

const MAX_PARTICLES = 220
const MAX_LINE_SEGMENTS = 900

function NeuralNetwork({ particleCount = 160, mobile = false }) {
  const pointsRef = useRef()
  const linesRef = useRef()
  const frameTick = useRef(0)

  const { positions, velocities, linePositions } = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3)
    const vel = new Float32Array(MAX_PARTICLES * 3)
    const linePos = new Float32Array(MAX_LINE_SEGMENTS * 2 * 3)

    for (let i = 0; i < MAX_PARTICLES; i += 1) {
      const i3 = i * 3
      pos[i3] = (Math.random() - 0.5) * 18
      pos[i3 + 1] = (Math.random() - 0.5) * 10
      pos[i3 + 2] = (Math.random() - 0.5) * 12

      vel[i3] = (Math.random() - 0.5) * 0.008
      vel[i3 + 1] = (Math.random() - 0.5) * 0.008
      vel[i3 + 2] = (Math.random() - 0.5) * 0.008
    }

    return { positions: pos, velocities: vel, linePositions: linePos }
  }, [])

  useFrame((state) => {
    const pointGeometry = pointsRef.current?.geometry
    const lineGeometry = linesRef.current?.geometry
    if (!pointGeometry || !lineGeometry) return

    const time = state.clock.getElapsedTime()
    const activeParticles = mobile ? Math.min(110, particleCount) : particleCount

    for (let i = 0; i < activeParticles; i += 1) {
      const i3 = i * 3

      positions[i3] += velocities[i3]
      positions[i3 + 1] += velocities[i3 + 1]
      positions[i3 + 2] += velocities[i3 + 2]

      positions[i3 + 1] += Math.sin(time * 0.35 + i * 0.15) * 0.0009

      if (Math.abs(positions[i3]) > 9) velocities[i3] *= -1
      if (Math.abs(positions[i3 + 1]) > 5.5) velocities[i3 + 1] *= -1
      if (Math.abs(positions[i3 + 2]) > 6) velocities[i3 + 2] *= -1
    }

    pointGeometry.setDrawRange(0, activeParticles)
    pointGeometry.attributes.position.needsUpdate = true

    frameTick.current += 1
    if (frameTick.current % 2 !== 0) return

    let lineCursor = 0
    const threshold = mobile ? 1.3 : 1.45
    const thresholdSq = threshold * threshold
    const maxConnections = mobile ? 420 : MAX_LINE_SEGMENTS

    for (let i = 0; i < activeParticles && lineCursor < maxConnections; i += 1) {
      const i3 = i * 3
      const ix = positions[i3]
      const iy = positions[i3 + 1]
      const iz = positions[i3 + 2]

      for (let j = i + 1; j < activeParticles && lineCursor < maxConnections; j += 1) {
        const j3 = j * 3
        const dx = ix - positions[j3]
        const dy = iy - positions[j3 + 1]
        const dz = iz - positions[j3 + 2]
        const distanceSq = dx * dx + dy * dy + dz * dz

        if (distanceSq < thresholdSq) {
          const l = lineCursor * 6
          linePositions[l] = ix
          linePositions[l + 1] = iy
          linePositions[l + 2] = iz
          linePositions[l + 3] = positions[j3]
          linePositions[l + 4] = positions[j3 + 1]
          linePositions[l + 5] = positions[j3 + 2]
          lineCursor += 1
        }
      }
    }

    lineGeometry.attributes.position.needsUpdate = true
    lineGeometry.setDrawRange(0, lineCursor * 2)
  })

  return (
    <group>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={positions}
            count={MAX_PARTICLES}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#58c6ff"
          size={mobile ? 0.05 : 0.06}
          transparent
          opacity={0.78}
          depthWrite={false}
          sizeAttenuation
        />
      </points>

      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={linePositions}
            count={MAX_LINE_SEGMENTS * 2}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#2c9dff" transparent opacity={0.21} depthWrite={false} />
      </lineSegments>
    </group>
  )
}

class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Brain model render failed:', error)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || null
    }
    return this.props.children
  }
}

export default function BrainScene() {
  const [mobile, setMobile] = useState(false)
  const [hasModel, setHasModel] = useState(false)

  useEffect(() => {
    function evaluateViewport() {
      setMobile(window.innerWidth < 768)
    }

    evaluateViewport()
    window.addEventListener('resize', evaluateViewport)
    return () => window.removeEventListener('resize', evaluateViewport)
  }, [])

  useEffect(() => {
    let active = true

    fetch('/models/brain.glb', { method: 'HEAD', cache: 'no-store' })
      .then((res) => {
        if (!active) return
        const contentType = (res.headers.get('content-type') || '').toLowerCase()
        // Vite can return index.html on missing assets in some flows; block GLTF load in that case.
        const looksLikeHtml = contentType.includes('text/html')
        const modelAvailable = res.ok && !looksLikeHtml
        setHasModel(modelAvailable)

        if (modelAvailable) {
          safePreloadBrainModel('/models/brain.glb')
        }
      })
      .catch(() => {
        if (!active) return
        setHasModel(false)
      })

    return () => {
      active = false
    }
  }, [])

  const particleCount = mobile ? 110 : 220

  return (
    <div
      className="brain-scene"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <Canvas
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
        }}
        dpr={[1, 1.6]}
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <color attach="background" args={['#040b1a']} />
        <fog attach="fog" args={['#030a18', 9, 19]} />
        <ambientLight intensity={0.45} />
        <pointLight position={[0, 2.2, 3]} intensity={1.45} color="#6dc8ff" />
        <pointLight position={[-6, -4, -3]} intensity={0.45} color="#4f7bff" />

        <NeuralNetwork particleCount={particleCount} mobile={mobile} />

        <Float speed={1.05} rotationIntensity={0.2} floatIntensity={0.24}>
          <ModelErrorBoundary fallback={<BrainFallbackMesh />}>
            <Suspense fallback={null}>
              <BrainModel enabled={hasModel} modelUrl="/models/brain.glb" />
            </Suspense>
          </ModelErrorBoundary>
        </Float>

        <Sparkles count={mobile ? 34 : 58} speed={0.22} size={1.55} scale={[11, 7, 8]} color="#58bfff" />
        <Environment preset="night" />
      </Canvas>
    </div>
  )
}
