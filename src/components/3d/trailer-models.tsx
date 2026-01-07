'use client'

import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Trailer type specifications
 * All measurements in feet
 */
export interface TrailerSpec {
  type: 'flatbed' | 'step-deck' | 'rgn' | 'lowboy' | 'double-drop'
  deckHeight: number      // Height from ground to deck surface
  deckLength: number      // Usable deck length
  deckWidth: number       // Deck width
  maxCargoHeight: number  // Maximum cargo height for legal limit
  color: string           // Trailer color
}

export const TRAILER_SPECS: Record<string, TrailerSpec> = {
  flatbed: {
    type: 'flatbed',
    deckHeight: 5.0,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoHeight: 8.5,
    color: '#4a5568',
  },
  'step-deck': {
    type: 'step-deck',
    deckHeight: 3.5,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoHeight: 10.0,
    color: '#2d3748',
  },
  rgn: {
    type: 'rgn',
    deckHeight: 2.0,
    deckLength: 29,
    deckWidth: 8.5,
    maxCargoHeight: 11.5,
    color: '#1a202c',
  },
  lowboy: {
    type: 'lowboy',
    deckHeight: 1.5,
    deckLength: 24,
    deckWidth: 8.5,
    maxCargoHeight: 12.0,
    color: '#2c5282',
  },
  'double-drop': {
    type: 'double-drop',
    deckHeight: 2.0,
    deckLength: 29,
    deckWidth: 8.5,
    maxCargoHeight: 11.5,
    color: '#285e61',
  },
}

// Scale factor: 1 unit = 1 foot
const SCALE = 1

interface TrailerProps {
  spec: TrailerSpec
  showWheels?: boolean
}

/**
 * Flatbed Trailer - Standard flat deck
 */
export function FlatbedTrailer({ spec, showWheels = true }: TrailerProps) {
  const groupRef = useRef<THREE.Group>(null)

  return (
    <group ref={groupRef}>
      {/* Main deck */}
      <mesh position={[0, spec.deckHeight * SCALE, 0]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Frame rails */}
      <mesh position={[0, (spec.deckHeight - 0.5) * SCALE, (spec.deckWidth / 2 - 0.3) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.8 * SCALE, 0.3 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, (spec.deckHeight - 0.5) * SCALE, -(spec.deckWidth / 2 - 0.3) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.8 * SCALE, 0.3 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Wheels */}
      {showWheels && (
        <>
          {/* Rear axles */}
          <WheelSet position={[-(spec.deckLength / 2 - 3) * SCALE, 1.5 * SCALE, 0]} />
          <WheelSet position={[-(spec.deckLength / 2 - 7) * SCALE, 1.5 * SCALE, 0]} />
          {/* Front landing gear */}
          <LandingGear position={[(spec.deckLength / 2 - 2) * SCALE, 2 * SCALE, 0]} />
        </>
      )}
    </group>
  )
}

/**
 * Step Deck Trailer - Lower main deck with raised front
 */
export function StepDeckTrailer({ spec, showWheels = true }: TrailerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const frontDeckLength = 11 // Front raised section
  const mainDeckLength = spec.deckLength - frontDeckLength

  return (
    <group ref={groupRef}>
      {/* Front raised deck */}
      <mesh position={[(spec.deckLength / 2 - frontDeckLength / 2) * SCALE, 5 * SCALE, 0]}>
        <boxGeometry args={[frontDeckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Main lower deck */}
      <mesh position={[-(frontDeckLength / 2) * SCALE, spec.deckHeight * SCALE, 0]}>
        <boxGeometry args={[mainDeckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Step transition */}
      <mesh
        position={[(spec.deckLength / 2 - frontDeckLength - 1) * SCALE, 4.25 * SCALE, 0]}
        rotation={[0, 0, Math.PI / 6]}
      >
        <boxGeometry args={[3 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Frame rails */}
      <mesh position={[0, (spec.deckHeight - 0.5) * SCALE, (spec.deckWidth / 2 - 0.3) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.8 * SCALE, 0.3 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, (spec.deckHeight - 0.5) * SCALE, -(spec.deckWidth / 2 - 0.3) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.8 * SCALE, 0.3 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Wheels */}
      {showWheels && (
        <>
          <WheelSet position={[-(spec.deckLength / 2 - 3) * SCALE, 1.5 * SCALE, 0]} />
          <WheelSet position={[-(spec.deckLength / 2 - 7) * SCALE, 1.5 * SCALE, 0]} />
          <LandingGear position={[(spec.deckLength / 2 - 2) * SCALE, 2 * SCALE, 0]} />
        </>
      )}
    </group>
  )
}

/**
 * RGN (Removable Gooseneck) Trailer - Very low deck with detachable front
 */
export function RGNTrailer({ spec, showWheels = true }: TrailerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const gooseneckLength = 10

  return (
    <group ref={groupRef}>
      {/* Gooseneck (raised front) */}
      <mesh position={[(spec.deckLength / 2 + gooseneckLength / 2 - 2) * SCALE, 4.5 * SCALE, 0]}>
        <boxGeometry args={[gooseneckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Main well deck (very low) */}
      <mesh position={[0, spec.deckHeight * SCALE, 0]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Transition ramp */}
      <mesh
        position={[(spec.deckLength / 2 - 1) * SCALE, 3.25 * SCALE, 0]}
        rotation={[0, 0, -Math.PI / 4]}
      >
        <boxGeometry args={[4 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Side rails */}
      <mesh position={[0, (spec.deckHeight + 0.5) * SCALE, (spec.deckWidth / 2) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.5 * SCALE, 0.2 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, (spec.deckHeight + 0.5) * SCALE, -(spec.deckWidth / 2) * SCALE]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.5 * SCALE, 0.2 * SCALE]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Wheels */}
      {showWheels && (
        <>
          <WheelSet position={[-(spec.deckLength / 2 - 2) * SCALE, 1.5 * SCALE, 0]} />
          <WheelSet position={[-(spec.deckLength / 2 - 6) * SCALE, 1.5 * SCALE, 0]} />
          <WheelSet position={[-(spec.deckLength / 2 - 10) * SCALE, 1.5 * SCALE, 0]} />
        </>
      )}
    </group>
  )
}

/**
 * Lowboy Trailer - Lowest deck height for tallest cargo
 */
export function LowboyTrailer({ spec, showWheels = true }: TrailerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const gooseneckLength = 8

  return (
    <group ref={groupRef}>
      {/* Gooseneck */}
      <mesh position={[(spec.deckLength / 2 + gooseneckLength / 2) * SCALE, 4 * SCALE, 0]}>
        <boxGeometry args={[gooseneckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Main well deck (lowest) */}
      <mesh position={[0, spec.deckHeight * SCALE, 0]}>
        <boxGeometry args={[spec.deckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Front transition */}
      <mesh
        position={[(spec.deckLength / 2) * SCALE, 2.75 * SCALE, 0]}
        rotation={[0, 0, -Math.PI / 4]}
      >
        <boxGeometry args={[4 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Rear transition */}
      <mesh
        position={[-(spec.deckLength / 2 + 2) * SCALE, 2.75 * SCALE, 0]}
        rotation={[0, 0, Math.PI / 4]}
      >
        <boxGeometry args={[4 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Wheels - split axle design */}
      {showWheels && (
        <>
          <WheelSet position={[-(spec.deckLength / 2 - 2) * SCALE, 1.5 * SCALE, 4.5 * SCALE]} />
          <WheelSet position={[-(spec.deckLength / 2 - 2) * SCALE, 1.5 * SCALE, -4.5 * SCALE]} />
          <WheelSet position={[-(spec.deckLength / 2 - 6) * SCALE, 1.5 * SCALE, 4.5 * SCALE]} />
          <WheelSet position={[-(spec.deckLength / 2 - 6) * SCALE, 1.5 * SCALE, -4.5 * SCALE]} />
        </>
      )}
    </group>
  )
}

/**
 * Double Drop Trailer - Drop in middle for tall cargo
 */
export function DoubleDropTrailer({ spec, showWheels = true }: TrailerProps) {
  const groupRef = useRef<THREE.Group>(null)
  const frontDeckLength = 10
  const rearDeckLength = 8
  const wellLength = spec.deckLength - frontDeckLength - rearDeckLength

  return (
    <group ref={groupRef}>
      {/* Front raised section */}
      <mesh position={[(spec.deckLength / 2 - frontDeckLength / 2) * SCALE, 4.5 * SCALE, 0]}>
        <boxGeometry args={[frontDeckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Middle well (lowest) */}
      <mesh position={[0, spec.deckHeight * SCALE, 0]}>
        <boxGeometry args={[wellLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Rear raised section */}
      <mesh position={[-(spec.deckLength / 2 - rearDeckLength / 2) * SCALE, 4 * SCALE, 0]}>
        <boxGeometry args={[rearDeckLength * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Front transition */}
      <mesh
        position={[(spec.deckLength / 2 - frontDeckLength - 1) * SCALE, 3.25 * SCALE, 0]}
        rotation={[0, 0, Math.PI / 5]}
      >
        <boxGeometry args={[3.5 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Rear transition */}
      <mesh
        position={[-(spec.deckLength / 2 - rearDeckLength - 1) * SCALE, 3 * SCALE, 0]}
        rotation={[0, 0, -Math.PI / 5]}
      >
        <boxGeometry args={[3.5 * SCALE, 0.3 * SCALE, spec.deckWidth * SCALE]} />
        <meshStandardMaterial color={spec.color} />
      </mesh>

      {/* Wheels */}
      {showWheels && (
        <>
          <WheelSet position={[-(spec.deckLength / 2 - 2) * SCALE, 1.5 * SCALE, 0]} />
          <WheelSet position={[-(spec.deckLength / 2 - 6) * SCALE, 1.5 * SCALE, 0]} />
          <LandingGear position={[(spec.deckLength / 2 - 2) * SCALE, 2 * SCALE, 0]} />
        </>
      )}
    </group>
  )
}

/**
 * Wheel set component (dual tires)
 */
function WheelSet({ position }: { position: [number, number, number] }) {
  const wheelRadius = 1.5
  const wheelWidth = 0.8

  return (
    <group position={position}>
      {/* Left side dual wheels */}
      <mesh position={[0, 0, 3.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0, 4.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Right side dual wheels */}
      <mesh position={[0, 0, -3.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, 0, -4.3]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[wheelRadius, wheelRadius, wheelWidth, 16]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Axle */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 9, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
}

/**
 * Landing gear component
 */
function LandingGear({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Left leg */}
      <mesh position={[0, -1, 2]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Right leg */}
      <mesh position={[0, -1, -2]}>
        <boxGeometry args={[0.3, 4, 0.3]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      {/* Cross bar */}
      <mesh position={[0, -2.5, 0]}>
        <boxGeometry args={[0.3, 0.3, 4]} />
        <meshStandardMaterial color="#333" />
      </mesh>
    </group>
  )
}

/**
 * Main trailer component that selects the right model
 */
export function Trailer({ type, showWheels = true }: { type: string; showWheels?: boolean }) {
  const spec = TRAILER_SPECS[type] || TRAILER_SPECS.flatbed

  switch (spec.type) {
    case 'step-deck':
      return <StepDeckTrailer spec={spec} showWheels={showWheels} />
    case 'rgn':
      return <RGNTrailer spec={spec} showWheels={showWheels} />
    case 'lowboy':
      return <LowboyTrailer spec={spec} showWheels={showWheels} />
    case 'double-drop':
      return <DoubleDropTrailer spec={spec} showWheels={showWheels} />
    case 'flatbed':
    default:
      return <FlatbedTrailer spec={spec} showWheels={showWheels} />
  }
}
