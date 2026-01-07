'use client'

import { useRef, useState, useMemo } from 'react'
import * as THREE from 'three'
import { Text, Line } from '@react-three/drei'

export interface CargoItem {
  id: string
  name: string
  width: number   // feet
  height: number  // feet
  length: number  // feet
  weight: number  // lbs
  color?: string
  position?: [number, number, number]  // [x, y, z] offset on deck
}

interface CargoProps {
  item: CargoItem
  deckHeight: number
  showLabels?: boolean
  showDimensions?: boolean
  isOversize?: boolean
  isOverheight?: boolean
}

/**
 * Single cargo item visualization
 */
export function Cargo({
  item,
  deckHeight,
  showLabels = true,
  showDimensions = true,
  isOversize = false,
  isOverheight = false,
}: CargoProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  // Default position on deck
  const position: [number, number, number] = item.position || [0, 0, 0]
  const yPos = deckHeight + item.height / 2 + position[1]

  // Determine color based on status
  let cargoColor = item.color || '#3b82f6'
  if (isOverheight) {
    cargoColor = '#ef4444' // Red for overheight
  } else if (isOversize) {
    cargoColor = '#f59e0b' // Orange for oversize
  }

  return (
    <group position={[position[0], yPos, position[2]]}>
      {/* Main cargo box */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[item.length, item.height, item.width]} />
        <meshStandardMaterial
          color={cargoColor}
          transparent
          opacity={hovered ? 0.9 : 0.75}
          emissive={hovered ? cargoColor : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>

      {/* Wireframe outline */}
      <mesh>
        <boxGeometry args={[item.length, item.height, item.width]} />
        <meshBasicMaterial
          color="#ffffff"
          wireframe
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Labels */}
      {showLabels && (
        <>
          {/* Name label on top */}
          <Text
            position={[0, item.height / 2 + 0.5, 0]}
            fontSize={1}
            color="#ffffff"
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {item.name}
          </Text>

          {/* Weight label */}
          <Text
            position={[0, item.height / 2 + 1.5, 0]}
            fontSize={0.6}
            color="#94a3b8"
            anchorX="center"
            anchorY="bottom"
          >
            {item.weight.toLocaleString()} lbs
          </Text>
        </>
      )}

      {/* Dimension labels */}
      {showDimensions && (
        <>
          {/* Length (X axis) */}
          <DimensionLine
            start={[-item.length / 2, -item.height / 2 - 0.5, item.width / 2 + 1]}
            end={[item.length / 2, -item.height / 2 - 0.5, item.width / 2 + 1]}
            label={`${item.length}'`}
          />

          {/* Width (Z axis) */}
          <DimensionLine
            start={[item.length / 2 + 1, -item.height / 2 - 0.5, -item.width / 2]}
            end={[item.length / 2 + 1, -item.height / 2 - 0.5, item.width / 2]}
            label={`${item.width}'`}
          />

          {/* Height (Y axis) */}
          <DimensionLine
            start={[item.length / 2 + 1, -item.height / 2, item.width / 2 + 1]}
            end={[item.length / 2 + 1, item.height / 2, item.width / 2 + 1]}
            label={`${item.height}'`}
            vertical
          />
        </>
      )}
    </group>
  )
}

/**
 * Dimension line with label
 */
function DimensionLine({
  start,
  end,
  label,
  vertical = false,
}: {
  start: [number, number, number]
  end: [number, number, number]
  label: string
  vertical?: boolean
}) {
  const midpoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    (start[1] + end[1]) / 2,
    (start[2] + end[2]) / 2,
  ]

  const points = useMemo(() => [start, end], [start, end])

  return (
    <group>
      {/* Line */}
      <Line points={points} color="#94a3b8" lineWidth={1} />

      {/* End caps */}
      <mesh position={start}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshBasicMaterial color="#94a3b8" />
      </mesh>

      {/* Label */}
      <Text
        position={[
          midpoint[0] + (vertical ? 0.8 : 0),
          midpoint[1] + (vertical ? 0 : 0.5),
          midpoint[2],
        ]}
        fontSize={0.5}
        color="#94a3b8"
        anchorX="center"
        anchorY="middle"
      >
        {label}
      </Text>
    </group>
  )
}

/**
 * Multiple cargo items container
 */
export function CargoGroup({
  items,
  deckHeight,
  showLabels = true,
  showDimensions = true,
  legalMaxHeight = 13.5,
  legalMaxWidth = 8.5,
}: {
  items: CargoItem[]
  deckHeight: number
  showLabels?: boolean
  showDimensions?: boolean
  legalMaxHeight?: number
  legalMaxWidth?: number
}) {
  return (
    <group>
      {items.map((item) => {
        const totalHeight = deckHeight + item.height
        const isOverheight = totalHeight > legalMaxHeight
        const isOversize = item.width > legalMaxWidth

        return (
          <Cargo
            key={item.id}
            item={item}
            deckHeight={deckHeight}
            showLabels={showLabels}
            showDimensions={showDimensions}
            isOverheight={isOverheight}
            isOversize={isOversize}
          />
        )
      })}
    </group>
  )
}

/**
 * Center of gravity indicator
 */
export function CenterOfGravity({
  position,
  show = true,
}: {
  position: [number, number, number]
  show?: boolean
}) {
  if (!show) return null

  return (
    <group position={position}>
      {/* Crosshair */}
      <mesh>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>

      {/* Vertical line to ground */}
      <Line
        points={[[0, 0, 0], [0, -position[1], 0]]}
        color="#22c55e"
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      {/* Label */}
      <Text
        position={[0, 1, 0]}
        fontSize={0.5}
        color="#22c55e"
        anchorX="center"
        anchorY="bottom"
      >
        CG
      </Text>
    </group>
  )
}
