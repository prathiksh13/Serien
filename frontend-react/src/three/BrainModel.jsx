import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

export function BrainFallbackMesh() {
  const ref = useRef()

  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.getElapsedTime()
    ref.current.rotation.y = t * 0.2
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.08
    ref.current.position.y = Math.sin(t * 0.8) * 0.18
  })

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1.05, 4]} />
      <meshStandardMaterial
        color="#67d0ff"
        emissive="#1d8cff"
        emissiveIntensity={0.85}
        roughness={0.32}
        metalness={0.22}
      />
    </mesh>
  )
}

function BrainModelLoaded({ modelUrl }) {
  const groupRef = useRef()
  const gltf = useGLTF(modelUrl)

  const brainScene = useMemo(() => {
    const clone = gltf.scene.clone(true)
    clone.traverse((node) => {
      if (!node.isMesh) return
      node.material = node.material.clone()
      node.material.emissive = new THREE.Color('#1f8eff')
      node.material.emissiveIntensity = 0.55
      node.material.roughness = Math.min(0.58, node.material.roughness ?? 0.58)
      node.material.metalness = Math.max(0.15, node.material.metalness ?? 0.15)
    })
    return clone
  }, [gltf.scene])

  useFrame((state) => {
    if (!groupRef.current) return
    const t = state.clock.getElapsedTime()
    groupRef.current.rotation.y = t * 0.24
    groupRef.current.rotation.x = Math.sin(t * 0.35) * 0.06
    groupRef.current.position.y = Math.sin(t * 0.9) * 0.2
  })

  return <primitive ref={groupRef} object={brainScene} scale={1.18} position={[0, 0.1, 0]} />
}

export function safePreloadBrainModel(modelUrl = '/models/brain.glb') {
  try {
    useGLTF.preload(modelUrl)
  } catch (error) {
    console.error('Brain model preload failed:', error)
  }
}

export default function BrainModel({ modelUrl = '/models/brain.glb', enabled = true }) {
  if (!enabled) {
    return <BrainFallbackMesh />
  }

  return <BrainModelLoaded modelUrl={modelUrl} />
}
