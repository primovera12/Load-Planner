'use client'

import { Text, Line } from '@react-three/drei'
import * as THREE from 'three'

interface LegalLimitsProps {
  showHeight?: boolean
  showWidth?: boolean
  maxHeight?: number       // Default 13.5'
  maxWidth?: number        // Default 8.5'
  trailerLength?: number   // For sizing the overlay
  deckHeight?: number      // Current deck height
  cargoHeight?: number     // Current cargo height
}

/**
 * Legal limit overlay lines and labels
 * Shows 13.5' height limit and 8.5' width limit
 */
export function LegalLimits({
  showHeight = true,
  showWidth = true,
  maxHeight = 13.5,
  maxWidth = 8.5,
  trailerLength = 48,
  deckHeight = 5,
  cargoHeight = 0,
}: LegalLimitsProps) {
  const totalHeight = deckHeight + cargoHeight
  const isOverHeight = totalHeight > maxHeight

  return (
    <group>
      {/* Height limit plane */}
      {showHeight && (
        <group position={[0, maxHeight, 0]}>
          {/* Semi-transparent plane at height limit */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[trailerLength + 10, maxWidth + 6]} />
            <meshBasicMaterial
              color={isOverHeight ? '#ef4444' : '#22c55e'}
              transparent
              opacity={0.1}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Boundary lines */}
          <HeightLimitLines
            length={trailerLength + 10}
            width={maxWidth + 6}
            color={isOverHeight ? '#ef4444' : '#22c55e'}
          />

          {/* Label */}
          <Text
            position={[(trailerLength / 2) + 7, 0.5, 0]}
            fontSize={0.8}
            color={isOverHeight ? '#ef4444' : '#22c55e'}
            anchorX="left"
            anchorY="middle"
          >
            {maxHeight}' MAX HEIGHT
          </Text>
        </group>
      )}

      {/* Width limit lines */}
      {showWidth && (
        <>
          {/* Left width limit */}
          <WidthLimitLine
            x={maxWidth / 2}
            height={maxHeight + 2}
            length={trailerLength + 10}
          />
          {/* Right width limit */}
          <WidthLimitLine
            x={-maxWidth / 2}
            height={maxHeight + 2}
            length={trailerLength + 10}
          />

          {/* Width label */}
          <Text
            position={[0, maxHeight + 1, maxWidth / 2 + 1.5]}
            fontSize={0.6}
            color="#f59e0b"
            anchorX="center"
            anchorY="middle"
          >
            {maxWidth}' MAX WIDTH
          </Text>
        </>
      )}

      {/* Ground reference */}
      <GroundPlane length={trailerLength + 20} width={maxWidth + 20} />
    </group>
  )
}

/**
 * Height limit boundary lines
 */
function HeightLimitLines({
  length,
  width,
  color,
}: {
  length: number
  width: number
  color: string
}) {
  const halfLength = length / 2
  const halfWidth = width / 2

  return (
    <group>
      {/* Front line */}
      <Line
        points={[[halfLength, 0, halfWidth], [halfLength, 0, -halfWidth]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.8}
      />

      {/* Back line */}
      <Line
        points={[[-halfLength, 0, halfWidth], [-halfLength, 0, -halfWidth]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.8}
      />

      {/* Left line */}
      <Line
        points={[[halfLength, 0, halfWidth], [-halfLength, 0, halfWidth]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.8}
      />

      {/* Right line */}
      <Line
        points={[[halfLength, 0, -halfWidth], [-halfLength, 0, -halfWidth]]}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.8}
      />
    </group>
  )
}

/**
 * Vertical width limit line
 */
function WidthLimitLine({
  x,
  height,
  length,
}: {
  x: number
  height: number
  length: number
}) {
  return (
    <group>
      {/* Vertical plane */}
      <mesh position={[0, height / 2, x]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.1, height]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>

      {/* Vertical lines */}
      <Line
        points={[[length / 2, 0, x], [length / 2, height, x]]}
        color="#f59e0b"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      <Line
        points={[[-length / 2, 0, x], [-length / 2, height, x]]}
        color="#f59e0b"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
    </group>
  )
}

/**
 * Ground reference plane
 */
function GroundPlane({ length, width }: { length: number; width: number }) {
  return (
    <group position={[0, -0.01, 0]}>
      {/* Grid */}
      <gridHelper args={[Math.max(length, width), 20, '#334155', '#1e293b']} />

      {/* Solid ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[length, width]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.8} />
      </mesh>
    </group>
  )
}

/**
 * Height measurement ruler
 */
export function HeightRuler({
  maxHeight = 16,
  position = [-30, 0, 0],
}: {
  maxHeight?: number
  position?: [number, number, number]
}) {
  const marks: number[] = []
  for (let i = 0; i <= maxHeight; i += 2) {
    marks.push(i)
  }

  return (
    <group position={position}>
      {/* Main ruler line */}
      <Line
        points={[[0, 0, 0], [0, maxHeight, 0]]}
        color="#64748b"
        lineWidth={1}
      />

      {/* Height marks */}
      {marks.map((height) => (
        <group key={height} position={[0, height, 0]}>
          {/* Tick mark */}
          <Line
            points={[[-0.5, 0, 0], [0.5, 0, 0]]}
            color="#64748b"
            lineWidth={1}
          />

          {/* Label */}
          <Text
            position={[-1.5, 0, 0]}
            fontSize={0.5}
            color="#94a3b8"
            anchorX="right"
            anchorY="middle"
          >
            {height}'
          </Text>
        </group>
      ))}

      {/* Special mark at 13.5' (legal limit) */}
      <group position={[0, 13.5, 0]}>
        <Line
          points={[[-1, 0, 0], [1, 0, 0]]}
          color="#22c55e"
          lineWidth={2}
        />
        <Text
          position={[-2, 0, 0]}
          fontSize={0.4}
          color="#22c55e"
          anchorX="right"
          anchorY="middle"
        >
          LEGAL
        </Text>
      </group>
    </group>
  )
}
