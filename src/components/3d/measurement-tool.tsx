'use client'

import { useState, useCallback } from 'react'
import * as THREE from 'three'
import { Line, Text, Html } from '@react-three/drei'
import { ThreeEvent } from '@react-three/fiber'

export interface Measurement {
  id: string
  start: [number, number, number]
  end: [number, number, number]
  distance: number
}

interface MeasurementToolProps {
  enabled: boolean
  measurements: Measurement[]
  onAddMeasurement: (measurement: Measurement) => void
  pendingPoint: [number, number, number] | null
  onSetPendingPoint: (point: [number, number, number] | null) => void
}

/**
 * Calculate distance between two 3D points in feet
 */
export function calculateDistance(
  start: [number, number, number],
  end: [number, number, number]
): number {
  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const dz = end[2] - start[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Format distance as feet and inches
 */
export function formatDistance(feet: number): string {
  const wholeFeet = Math.floor(feet)
  const inches = Math.round((feet - wholeFeet) * 12)

  if (inches === 12) {
    return `${wholeFeet + 1}' 0"`
  }
  if (inches === 0) {
    return `${wholeFeet}' 0"`
  }
  return `${wholeFeet}' ${inches}"`
}

/**
 * Single measurement line visualization
 */
function MeasurementLine({
  measurement,
}: {
  measurement: Measurement
}) {
  const midpoint: [number, number, number] = [
    (measurement.start[0] + measurement.end[0]) / 2,
    (measurement.start[1] + measurement.end[1]) / 2 + 1,
    (measurement.start[2] + measurement.end[2]) / 2,
  ]

  return (
    <group>
      {/* Main measurement line */}
      <Line
        points={[measurement.start, measurement.end]}
        color="#f59e0b"
        lineWidth={2}
      />

      {/* Start point marker */}
      <mesh position={measurement.start}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>

      {/* End point marker */}
      <mesh position={measurement.end}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>

      {/* Distance label */}
      <Text
        position={midpoint}
        fontSize={0.8}
        color="#f59e0b"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {formatDistance(measurement.distance)}
      </Text>
    </group>
  )
}

/**
 * Pending point marker (first click)
 */
function PendingPointMarker({
  point,
}: {
  point: [number, number, number]
}) {
  return (
    <group position={point}>
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color="#22d3ee"
          emissive="#22d3ee"
          emissiveIntensity={0.8}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Pulsing ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 32]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <Html center distanceFactor={15}>
        <div className="bg-cyan-500/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Click to set end point
        </div>
      </Html>
    </group>
  )
}

/**
 * Measurement tool component - renders all measurements
 */
export function MeasurementTool({
  enabled,
  measurements,
  pendingPoint,
}: MeasurementToolProps) {
  if (!enabled && measurements.length === 0) return null

  return (
    <group>
      {/* Render all measurements */}
      {measurements.map((m) => (
        <MeasurementLine key={m.id} measurement={m} />
      ))}

      {/* Render pending point if in measurement mode */}
      {enabled && pendingPoint && <PendingPointMarker point={pendingPoint} />}
    </group>
  )
}

/**
 * Invisible click plane for capturing measurement clicks
 */
export function MeasurementClickPlane({
  enabled,
  height,
  onMeasureClick,
}: {
  enabled: boolean
  height: number
  onMeasureClick: (point: [number, number, number]) => void
}) {
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!enabled) return

      event.stopPropagation()
      const point = event.point
      onMeasureClick([point.x, point.y, point.z])
    },
    [enabled, onMeasureClick]
  )

  if (!enabled) return null

  return (
    <mesh
      position={[0, height, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  )
}

/**
 * Hook for managing measurements
 */
export function useMeasurements() {
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [pendingPoint, setPendingPoint] = useState<[number, number, number] | null>(null)
  const [measureMode, setMeasureMode] = useState(false)

  const handleMeasureClick = useCallback(
    (point: [number, number, number]) => {
      if (!measureMode) return

      if (!pendingPoint) {
        // First click - set start point
        setPendingPoint(point)
      } else {
        // Second click - complete measurement
        const distance = calculateDistance(pendingPoint, point)
        const newMeasurement: Measurement = {
          id: `measure-${Date.now()}`,
          start: pendingPoint,
          end: point,
          distance,
        }
        setMeasurements((prev) => [...prev, newMeasurement])
        setPendingPoint(null)
      }
    },
    [measureMode, pendingPoint]
  )

  const clearMeasurements = useCallback(() => {
    setMeasurements([])
    setPendingPoint(null)
  }, [])

  const toggleMeasureMode = useCallback(() => {
    setMeasureMode((prev) => !prev)
    if (measureMode) {
      setPendingPoint(null) // Clear pending when disabling
    }
  }, [measureMode])

  const cancelPending = useCallback(() => {
    setPendingPoint(null)
  }, [])

  return {
    measurements,
    pendingPoint,
    measureMode,
    handleMeasureClick,
    clearMeasurements,
    toggleMeasureMode,
    cancelPending,
    setMeasureMode,
  }
}
