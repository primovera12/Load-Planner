'use client'

import { useRef } from 'react'
import * as THREE from 'three'
import { TRAILER_SPECS } from './trailer-models'

interface TractorProps {
  trailerType?: string
  color?: string
}

/**
 * Simplified truck tractor/cab model
 * Positions itself at the front of the trailer based on trailer type
 */
export function Tractor({ trailerType = 'flatbed', color = '#1e40af' }: TractorProps) {
  const groupRef = useRef<THREE.Group>(null)
  const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed

  // Position tractor at front of trailer
  // Different trailers have different connection points
  const tractorOffset = getTractorOffset(trailerType, spec.deckLength)

  return (
    <group ref={groupRef} position={[tractorOffset.x, 0, 0]}>
      {/* Main cab body */}
      <CabBody color={color} />

      {/* Hood/engine section */}
      <Hood color={color} />

      {/* Exhaust stacks */}
      <ExhaustStacks />

      {/* Fuel tanks */}
      <FuelTanks />

      {/* Wheels */}
      <TractorWheels />

      {/* Fifth wheel (connection point) */}
      <FifthWheel position={[-2.5, 3.8, 0]} />
    </group>
  )
}

/**
 * Calculate tractor position based on trailer type
 */
function getTractorOffset(trailerType: string, deckLength: number): { x: number; y: number } {
  const halfLength = deckLength / 2

  switch (trailerType) {
    case 'flatbed':
      return { x: halfLength + 8, y: 0 }
    case 'step-deck':
      return { x: halfLength + 8, y: 0 }
    case 'rgn':
      // RGN has detachable gooseneck
      return { x: halfLength + 10, y: 0 }
    case 'lowboy':
      return { x: halfLength + 9, y: 0 }
    case 'double-drop':
      return { x: halfLength + 9, y: 0 }
    default:
      return { x: halfLength + 8, y: 0 }
  }
}

/**
 * Main cab body - sleeper cab style
 */
function CabBody({ color }: { color: string }) {
  return (
    <group position={[0, 5.5, 0]}>
      {/* Main cab */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[6, 5, 7.5]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Roof fairing/deflector */}
      <mesh castShadow position={[0, 3, 0]}>
        <boxGeometry args={[5.5, 1.5, 7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Windshield */}
      <mesh position={[3.1, 0.5, 0]}>
        <boxGeometry args={[0.2, 3, 6]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Side windows */}
      <mesh position={[0, 0.5, 3.85]}>
        <boxGeometry args={[4, 2.5, 0.2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>
      <mesh position={[0, 0.5, -3.85]}>
        <boxGeometry args={[4, 2.5, 0.2]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Door handles */}
      <mesh position={[1, -0.5, 3.9]} castShadow>
        <boxGeometry args={[0.8, 0.15, 0.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[1, -0.5, -3.9]} castShadow>
        <boxGeometry args={[0.8, 0.15, 0.1]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

/**
 * Hood/engine compartment
 */
function Hood({ color }: { color: string }) {
  return (
    <group position={[5.5, 3.5, 0]}>
      {/* Main hood */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[5, 3.5, 7]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Grille */}
      <mesh position={[2.6, -0.3, 0]}>
        <boxGeometry args={[0.2, 2.5, 6]} />
        <meshStandardMaterial color="#1f2937" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Headlights */}
      <mesh position={[2.6, 0.2, 2.5]} castShadow>
        <boxGeometry args={[0.15, 0.8, 1.2]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[2.6, 0.2, -2.5]} castShadow>
        <boxGeometry args={[0.15, 0.8, 1.2]} />
        <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.3} />
      </mesh>

      {/* Bumper */}
      <mesh position={[2.8, -1.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.8, 7.5]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  )
}

/**
 * Chrome exhaust stacks
 */
function ExhaustStacks() {
  const stackMaterial = (
    <meshStandardMaterial color="#d1d5db" metalness={0.9} roughness={0.1} />
  )

  return (
    <group>
      {/* Left stack */}
      <mesh position={[-1, 8, 4]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 5, 16]} />
        {stackMaterial}
      </mesh>
      {/* Stack cap */}
      <mesh position={[-1, 10.6, 4]}>
        <cylinderGeometry args={[0.35, 0.25, 0.3, 16]} />
        {stackMaterial}
      </mesh>

      {/* Right stack */}
      <mesh position={[-1, 8, -4]} castShadow>
        <cylinderGeometry args={[0.25, 0.3, 5, 16]} />
        {stackMaterial}
      </mesh>
      {/* Stack cap */}
      <mesh position={[-1, 10.6, -4]}>
        <cylinderGeometry args={[0.35, 0.25, 0.3, 16]} />
        {stackMaterial}
      </mesh>
    </group>
  )
}

/**
 * Side fuel tanks
 */
function FuelTanks() {
  return (
    <group position={[0, 2, 0]}>
      {/* Left tank */}
      <mesh position={[1, 0, 4.5]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 4, 16]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Tank straps */}
      <mesh position={[0, 0, 4.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.25, 0.08, 8, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2, 0, 4.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.25, 0.08, 8, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Right tank */}
      <mesh position={[1, 0, -4.5]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.2, 4, 16]} />
        <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Tank straps */}
      <mesh position={[0, 0, -4.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.25, 0.08, 8, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[2, 0, -4.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.25, 0.08, 8, 24]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}

/**
 * Tractor wheels - steer axle and tandem drive axles
 */
function TractorWheels() {
  return (
    <group>
      {/* Steer axle (front) - single wheels */}
      <Wheel position={[6, 1.7, 4]} />
      <Wheel position={[6, 1.7, -4]} />

      {/* Drive axle 1 (tandem) - dual wheels */}
      <Wheel position={[-1.5, 1.7, 3.5]} />
      <Wheel position={[-1.5, 1.7, 4.5]} />
      <Wheel position={[-1.5, 1.7, -3.5]} />
      <Wheel position={[-1.5, 1.7, -4.5]} />

      {/* Drive axle 2 (tandem) - dual wheels */}
      <Wheel position={[-5, 1.7, 3.5]} />
      <Wheel position={[-5, 1.7, 4.5]} />
      <Wheel position={[-5, 1.7, -3.5]} />
      <Wheel position={[-5, 1.7, -4.5]} />
    </group>
  )
}

/**
 * Individual wheel with tire and rim
 */
function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[Math.PI / 2, 0, 0]}>
      {/* Tire */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.7, 1.7, 0.9, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.9} />
      </mesh>

      {/* Rim */}
      <mesh>
        <cylinderGeometry args={[0.9, 0.9, 1, 24]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Hub cap */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.15, 16]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  )
}

/**
 * Fifth wheel coupling
 */
function FifthWheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base plate */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[1.5, 1.5, 0.3, 24]} />
        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Coupling mechanism */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1, 0.4, 2]} />
        <meshStandardMaterial color="#4b5563" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}
