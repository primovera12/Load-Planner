'use client'

import { useRef, useState, useMemo, useCallback } from 'react'
import * as THREE from 'three'
import { Text, Line } from '@react-three/drei'
import { useSpring, animated } from '@react-spring/three'
import { ThreeEvent, useThree } from '@react-three/fiber'

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
  isSelected?: boolean
  onSelect?: (id: string) => void
  onPositionChange?: (id: string, position: [number, number, number]) => void
  deckLength?: number
  deckWidth?: number
  enableDrag?: boolean
}

/**
 * Single cargo item visualization with spring animations and drag support
 */
export function Cargo({
  item,
  deckHeight,
  showLabels = true,
  showDimensions = true,
  isOversize = false,
  isOverheight = false,
  isSelected = false,
  onSelect,
  onPositionChange,
  deckLength = 48,
  deckWidth = 8.5,
  enableDrag = true,
}: CargoProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<[number, number]>([0, 0])
  const { camera, gl } = useThree()

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

  // Selection highlight color - cyan when dragging
  const highlightColor = isDragging ? '#22d3ee' : isSelected ? '#22d3ee' : cargoColor

  // Spring animation for entry and position changes
  const { scale, posX, posY, posZ } = useSpring({
    scale: 1,
    posX: position[0],
    posY: isDragging ? yPos + 0.5 : yPos, // Lift slightly when dragging
    posZ: position[2],
    from: { scale: 0, posX: position[0], posY: yPos + 5, posZ: position[2] },
    config: { mass: 1, tension: isDragging ? 400 : 200, friction: 20 },
  })

  // Hover animation
  const { hoverScale } = useSpring({
    hoverScale: hovered || isDragging ? 1.02 : 1,
    config: { mass: 0.5, tension: 400, friction: 20 },
  })

  // Calculate constrained position within deck bounds
  const constrainPosition = useCallback(
    (x: number, z: number): [number, number] => {
      const halfDeckLength = deckLength / 2
      const halfDeckWidth = deckWidth / 2
      const halfCargoLength = item.length / 2
      const halfCargoWidth = item.width / 2

      // Constrain to deck bounds
      const minX = -halfDeckLength + halfCargoLength
      const maxX = halfDeckLength - halfCargoLength
      const minZ = -halfDeckWidth + halfCargoWidth
      const maxZ = halfDeckWidth - halfCargoWidth

      return [
        Math.max(minX, Math.min(maxX, x)),
        Math.max(minZ, Math.min(maxZ, z)),
      ]
    },
    [deckLength, deckWidth, item.length, item.width]
  )

  // Get world position from mouse event
  const getWorldPosition = useCallback(
    (event: PointerEvent): [number, number] => {
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      // Create a ray from camera through mouse position
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)

      // Intersect with horizontal plane at deck height
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -deckHeight)
      const intersection = new THREE.Vector3()
      raycaster.ray.intersectPlane(plane, intersection)

      return [intersection.x, intersection.z]
    },
    [camera, gl, deckHeight]
  )

  // Handle pointer down - start dragging
  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!enableDrag || !isSelected) return

      e.stopPropagation()
      setIsDragging(true)

      // Calculate offset from cargo center to click point
      const [worldX, worldZ] = getWorldPosition(e.nativeEvent)
      setDragOffset([worldX - position[0], worldZ - position[2]])

      // Capture pointer for drag tracking
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [enableDrag, isSelected, getWorldPosition, position]
  )

  // Handle pointer move - update position while dragging
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging || !onPositionChange) return

      const [worldX, worldZ] = getWorldPosition(e.nativeEvent)
      const newX = worldX - dragOffset[0]
      const newZ = worldZ - dragOffset[1]

      const [constrainedX, constrainedZ] = constrainPosition(newX, newZ)
      onPositionChange(item.id, [constrainedX, 0, constrainedZ])
    },
    [isDragging, onPositionChange, getWorldPosition, dragOffset, constrainPosition, item.id]
  )

  // Handle pointer up - end dragging
  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isDragging) return

      setIsDragging(false)
      ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
    },
    [isDragging]
  )

  return (
    <animated.group
      position-x={posX}
      position-y={posY}
      position-z={posZ}
      scale={scale.to((s) => [s * hoverScale.get(), s * hoverScale.get(), s * hoverScale.get()])}
    >
      {/* Main cargo box */}
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => !isDragging && setHovered(false)}
        onClick={(e) => {
          if (isDragging) return
          e.stopPropagation()
          onSelect?.(item.id)
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <boxGeometry args={[item.length, item.height, item.width]} />
        <meshStandardMaterial
          color={highlightColor}
          transparent
          opacity={hovered || isSelected ? 0.9 : 0.75}
          emissive={hovered || isSelected ? highlightColor : '#000000'}
          emissiveIntensity={hovered ? 0.3 : isSelected ? 0.2 : 0}
        />
      </mesh>

      {/* Wireframe outline - more prominent when selected */}
      <mesh>
        <boxGeometry args={[item.length, item.height, item.width]} />
        <meshBasicMaterial
          color={isSelected ? '#22d3ee' : '#ffffff'}
          wireframe
          transparent
          opacity={isSelected ? 0.8 : 0.3}
        />
      </mesh>

      {/* Selection indicator ring */}
      {isSelected && (
        <mesh position={[0, item.height / 2 + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(item.length, item.width) * 0.4, Math.max(item.length, item.width) * 0.45, 32]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}

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
    </animated.group>
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
  selectedId,
  onSelect,
  onPositionChange,
  deckLength = 48,
  deckWidth = 8.5,
  enableDrag = true,
}: {
  items: CargoItem[]
  deckHeight: number
  showLabels?: boolean
  showDimensions?: boolean
  legalMaxHeight?: number
  legalMaxWidth?: number
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  onPositionChange?: (id: string, position: [number, number, number]) => void
  deckLength?: number
  deckWidth?: number
  enableDrag?: boolean
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
            isSelected={selectedId === item.id}
            onSelect={onSelect}
            onPositionChange={onPositionChange}
            deckLength={deckLength}
            deckWidth={deckWidth}
            enableDrag={enableDrag}
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
