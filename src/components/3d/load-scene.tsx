'use client'

import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Trailer, TRAILER_SPECS } from './trailer-models'
import { Tractor } from './tractor-model'
import { CargoGroup, CenterOfGravity, CargoItem } from './cargo'
import { LegalLimits, HeightRuler } from './legal-limits'
import { MeasurementTool, MeasurementClickPlane, type Measurement } from './measurement-tool'

export type ViewMode = '3d' | 'front' | 'side' | 'top'

interface LoadSceneProps {
  trailerType: string
  cargo: CargoItem[]
  viewMode: ViewMode
  showLegalLimits?: boolean
  showDimensions?: boolean
  showLabels?: boolean
  showCenterOfGravity?: boolean
  showTractor?: boolean
  selectedCargoId?: string | null
  onCargoSelect?: (id: string | null) => void
  onCargoPositionChange?: (id: string, position: [number, number, number]) => void
  enableDrag?: boolean
  // Measurement tool props
  measureMode?: boolean
  measurements?: Measurement[]
  pendingMeasurePoint?: [number, number, number] | null
  onMeasureClick?: (point: [number, number, number]) => void
}

/**
 * Camera controller for different view modes
 */
function CameraController({ viewMode, trailerLength }: { viewMode: ViewMode; trailerLength: number }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const distance = trailerLength * 0.8

    switch (viewMode) {
      case 'front':
        camera.position.set(trailerLength / 2 + 20, 10, 0)
        camera.lookAt(0, 8, 0)
        break
      case 'side':
        camera.position.set(0, 10, distance)
        camera.lookAt(0, 8, 0)
        break
      case 'top':
        camera.position.set(0, distance, 0)
        camera.lookAt(0, 0, 0)
        break
      case '3d':
      default:
        camera.position.set(distance * 0.6, distance * 0.4, distance * 0.6)
        camera.lookAt(0, 5, 0)
        break
    }

    if (controlsRef.current) {
      controlsRef.current.update()
    }
  }, [viewMode, trailerLength, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={viewMode === '3d'}
      minDistance={10}
      maxDistance={150}
      target={[0, 5, 0]}
    />
  )
}

/**
 * Main 3D scene content
 */
function SceneContent({
  trailerType,
  cargo,
  viewMode,
  showLegalLimits = true,
  showDimensions = true,
  showLabels = true,
  showCenterOfGravity = true,
  showTractor = true,
  selectedCargoId,
  onCargoSelect,
  onCargoPositionChange,
  enableDrag = true,
  measureMode = false,
  measurements = [],
  pendingMeasurePoint = null,
  onMeasureClick,
}: LoadSceneProps) {
  const spec = TRAILER_SPECS[trailerType] || TRAILER_SPECS.flatbed

  // Calculate center of gravity
  const cogPosition = calculateCenterOfGravity(cargo, spec.deckHeight)

  // Calculate total cargo height
  const maxCargoHeight = Math.max(...cargo.map((c) => c.height), 0)

  return (
    <>
      {/* Lighting - improved for shadows */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={200}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-bias={-0.0001}
      />
      <directionalLight position={[-30, 30, -25]} intensity={0.4} />
      <hemisphereLight args={['#87ceeb', '#362907', 0.3]} />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Ground shadow plane */}
      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.4}
        scale={150}
        blur={2}
        far={100}
      />

      {/* Camera controller */}
      <CameraController viewMode={viewMode} trailerLength={spec.deckLength} />

      {/* Tractor/Cab */}
      {showTractor && <Tractor trailerType={trailerType} />}

      {/* Trailer */}
      <Trailer type={trailerType} />

      {/* Cargo items */}
      <CargoGroup
        items={cargo}
        deckHeight={spec.deckHeight}
        showLabels={showLabels}
        showDimensions={showDimensions}
        selectedId={selectedCargoId}
        onSelect={onCargoSelect}
        onPositionChange={onCargoPositionChange}
        deckLength={spec.deckLength}
        deckWidth={spec.deckWidth}
        enableDrag={enableDrag && !measureMode}
      />

      {/* Center of gravity */}
      {showCenterOfGravity && cargo.length > 0 && (
        <CenterOfGravity position={cogPosition} />
      )}

      {/* Legal limits overlay */}
      {showLegalLimits && (
        <LegalLimits
          showHeight={true}
          showWidth={true}
          maxHeight={13.5}
          maxWidth={8.5}
          trailerLength={spec.deckLength}
          deckHeight={spec.deckHeight}
          cargoHeight={maxCargoHeight}
        />
      )}

      {/* Height ruler */}
      <HeightRuler maxHeight={16} position={[-spec.deckLength / 2 - 8, 0, 0]} />

      {/* Measurement tool */}
      <MeasurementTool
        enabled={measureMode}
        measurements={measurements}
        pendingPoint={pendingMeasurePoint}
        onAddMeasurement={() => {}}
        onSetPendingPoint={() => {}}
      />

      {/* Measurement click plane - at deck height for easy clicking */}
      {onMeasureClick && (
        <MeasurementClickPlane
          enabled={measureMode}
          height={spec.deckHeight}
          onMeasureClick={onMeasureClick}
        />
      )}
    </>
  )
}

/**
 * Calculate center of gravity for cargo items
 */
function calculateCenterOfGravity(
  items: CargoItem[],
  deckHeight: number
): [number, number, number] {
  if (items.length === 0) {
    return [0, deckHeight, 0]
  }

  let totalWeight = 0
  let weightedX = 0
  let weightedY = 0
  let weightedZ = 0

  for (const item of items) {
    const pos = item.position || [0, 0, 0]
    const centerY = deckHeight + item.height / 2 + pos[1]

    totalWeight += item.weight
    weightedX += item.weight * pos[0]
    weightedY += item.weight * centerY
    weightedZ += item.weight * pos[2]
  }

  return [
    weightedX / totalWeight,
    weightedY / totalWeight,
    weightedZ / totalWeight,
  ]
}

/**
 * Loading fallback
 */
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#334155" wireframe />
    </mesh>
  )
}

/**
 * Main Load Scene component with Canvas
 */
export function LoadScene(props: LoadSceneProps) {
  return (
    <div className="w-full h-full bg-slate-900 rounded-lg overflow-hidden">
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true }}
        dpr={[1, 2]}
      >
        <PerspectiveCamera makeDefault position={[40, 30, 40]} fov={45} />
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
    </div>
  )
}

/**
 * Export scene as image
 */
export function useSceneExport() {
  const exportScene = () => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      const link = document.createElement('a')
      link.download = 'load-visualization.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  return { exportScene }
}
