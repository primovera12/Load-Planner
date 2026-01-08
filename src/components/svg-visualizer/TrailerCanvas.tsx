'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { TruckType } from '@/types/truck'
import { LoadItem } from '@/types/load'
import { ItemPlacement } from '@/types/wizard'
import { cn } from '@/lib/utils'

// Scale factor: pixels per foot
const SCALE = 12
const GRID_SIZE = 0.5 // 6 inches

// Color palette for items
const ITEM_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
]

function getItemColor(index: number): string {
  return ITEM_COLORS[index % ITEM_COLORS.length]
}

interface TrailerCanvasProps {
  trailer: TruckType
  items: LoadItem[]
  placements: ItemPlacement[]
  onPlacementChange: (itemId: string, position: { x: number; y: number; z: number }) => void
  onRotateItem: (itemId: string) => void
  selectedItemId?: string | null
  onSelectItem?: (itemId: string | null) => void
  showGrid?: boolean
  snapToGrid?: boolean
}

export function TrailerCanvas({
  trailer,
  items,
  placements,
  onPlacementChange,
  onRotateItem,
  selectedItemId,
  onSelectItem,
  showGrid = true,
  snapToGrid = true,
}: TrailerCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  // SVG dimensions
  const width = trailer.deckLength * SCALE + 40
  const height = trailer.deckWidth * SCALE + 40
  const padding = 20

  // Convert position to SVG coordinates (top-down view: x = length, y = width)
  const toSvgCoords = useCallback((pos: { x: number; z: number }) => ({
    x: padding + pos.x * SCALE,
    y: padding + (trailer.deckWidth - pos.z) * SCALE,
  }), [trailer.deckWidth])

  // Convert SVG coordinates to position
  const toPosition = useCallback((svgX: number, svgY: number) => {
    let x = (svgX - padding) / SCALE
    let z = trailer.deckWidth - (svgY - padding) / SCALE

    // Snap to grid if enabled
    if (snapToGrid) {
      x = Math.round(x / GRID_SIZE) * GRID_SIZE
      z = Math.round(z / GRID_SIZE) * GRID_SIZE
    }

    return { x, z }
  }, [trailer.deckWidth, snapToGrid])

  // Get item dimensions (accounting for rotation)
  const getItemDimensions = useCallback((item: LoadItem, placement: ItemPlacement) => {
    const length = placement.rotated ? item.width : item.length
    const width = placement.rotated ? item.length : item.width
    return { length, width }
  }, [])

  // Handle mouse down on item
  const handleMouseDown = useCallback((e: React.MouseEvent, itemId: string, placement: ItemPlacement) => {
    e.stopPropagation()
    if (!svgRef.current) return

    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    const itemSvgPos = toSvgCoords({ x: placement.position.x, z: placement.position.z })
    setDragOffset({
      x: svgPoint.x - itemSvgPos.x,
      y: svgPoint.y - itemSvgPos.y,
    })
    setDraggingId(itemId)
    onSelectItem?.(itemId)
  }, [toSvgCoords, onSelectItem])

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current) return

    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    const newSvgX = svgPoint.x - dragOffset.x
    const newSvgY = svgPoint.y - dragOffset.y
    const newPos = toPosition(newSvgX, newSvgY)

    // Get item and its dimensions
    const placement = placements.find(p => p.itemId === draggingId)
    const item = items.find(i => i.id === draggingId)
    if (!placement || !item) return

    const { length, width } = getItemDimensions(item, placement)

    // Clamp to trailer bounds
    const clampedX = Math.max(0, Math.min(trailer.deckLength - length, newPos.x))
    const clampedZ = Math.max(0, Math.min(trailer.deckWidth - width, newPos.z))

    onPlacementChange(draggingId, {
      x: clampedX,
      y: placement.position.y,
      z: clampedZ,
    })
  }, [draggingId, dragOffset, toPosition, placements, items, trailer, getItemDimensions, onPlacementChange])

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDraggingId(null)
  }, [])

  // Handle double-click to rotate
  const handleDoubleClick = useCallback((e: React.MouseEvent, itemId: string) => {
    e.stopPropagation()
    onRotateItem(itemId)
  }, [onRotateItem])

  // Handle click on canvas to deselect
  const handleCanvasClick = useCallback(() => {
    onSelectItem?.(null)
  }, [onSelectItem])

  // Grid lines
  const gridLines = useMemo(() => {
    if (!showGrid) return null
    const lines = []
    // Vertical lines (along length)
    for (let x = 0; x <= trailer.deckLength; x += 1) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={padding + x * SCALE}
          y1={padding}
          x2={padding + x * SCALE}
          y2={padding + trailer.deckWidth * SCALE}
          stroke="#e5e7eb"
          strokeWidth={x % 5 === 0 ? 1 : 0.5}
        />
      )
    }
    // Horizontal lines (along width)
    for (let y = 0; y <= trailer.deckWidth; y += 1) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={padding}
          y1={padding + y * SCALE}
          x2={padding + trailer.deckLength * SCALE}
          y2={padding + y * SCALE}
          stroke="#e5e7eb"
          strokeWidth={y % 5 === 0 ? 1 : 0.5}
        />
      )
    }
    return lines
  }, [showGrid, trailer.deckLength, trailer.deckWidth])

  return (
    <div className="border rounded-lg bg-white overflow-auto">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Background */}
        <rect x={0} y={0} width={width} height={height} fill="#f8fafc" />

        {/* Grid */}
        {gridLines}

        {/* Trailer deck outline */}
        <rect
          x={padding}
          y={padding}
          width={trailer.deckLength * SCALE}
          height={trailer.deckWidth * SCALE}
          fill="#f1f5f9"
          stroke="#64748b"
          strokeWidth={2}
        />

        {/* Gooseneck indicator (front of trailer) */}
        <polygon
          points={`${padding},${ padding + trailer.deckWidth * SCALE / 2 - 20} ${padding - 15},${padding + trailer.deckWidth * SCALE / 2} ${padding},${padding + trailer.deckWidth * SCALE / 2 + 20}`}
          fill="#94a3b8"
          stroke="#64748b"
        />

        {/* Direction indicator */}
        <text
          x={padding + trailer.deckLength * SCALE - 40}
          y={padding + trailer.deckWidth * SCALE + 15}
          fill="#94a3b8"
          fontSize={10}
        >
          REAR →
        </text>
        <text
          x={padding + 5}
          y={padding + trailer.deckWidth * SCALE + 15}
          fill="#94a3b8"
          fontSize={10}
        >
          ← FRONT
        </text>

        {/* Dimension labels */}
        <text
          x={padding + trailer.deckLength * SCALE / 2}
          y={padding - 5}
          fill="#64748b"
          fontSize={10}
          textAnchor="middle"
        >
          {trailer.deckLength}&apos; length
        </text>
        <text
          x={padding + trailer.deckLength * SCALE + 15}
          y={padding + trailer.deckWidth * SCALE / 2}
          fill="#64748b"
          fontSize={10}
          textAnchor="middle"
          transform={`rotate(90, ${padding + trailer.deckLength * SCALE + 15}, ${padding + trailer.deckWidth * SCALE / 2})`}
        >
          {trailer.deckWidth}&apos; width
        </text>

        {/* Cargo items */}
        {placements.map((placement, index) => {
          const item = items.find(i => i.id === placement.itemId)
          if (!item) return null

          const { length, width } = getItemDimensions(item, placement)
          const pos = toSvgCoords({ x: placement.position.x, z: placement.position.z })
          const isSelected = selectedItemId === item.id
          const isDragging = draggingId === item.id
          const color = item.color || getItemColor(index)

          // Check if overhanging
          const isOverhanging =
            placement.position.x + length > trailer.deckLength ||
            placement.position.z + width > trailer.deckWidth

          return (
            <g
              key={item.id}
              className={cn(
                'cursor-grab',
                isDragging && 'cursor-grabbing'
              )}
              onMouseDown={(e) => handleMouseDown(e, item.id, placement)}
              onDoubleClick={(e) => handleDoubleClick(e, item.id)}
            >
              {/* Item rectangle */}
              <rect
                x={pos.x}
                y={pos.y - width * SCALE}
                width={length * SCALE}
                height={width * SCALE}
                fill={color}
                fillOpacity={0.7}
                stroke={isSelected ? '#000' : isOverhanging ? '#ef4444' : color}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isOverhanging ? '4,2' : undefined}
                rx={2}
              />

              {/* Item label */}
              <text
                x={pos.x + (length * SCALE) / 2}
                y={pos.y - (width * SCALE) / 2}
                fill="white"
                fontSize={10}
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                className="select-none"
              >
                {item.description?.slice(0, 10) || `Item ${index + 1}`}
              </text>

              {/* Dimensions label */}
              <text
                x={pos.x + (length * SCALE) / 2}
                y={pos.y - (width * SCALE) / 2 + 12}
                fill="white"
                fillOpacity={0.9}
                fontSize={8}
                textAnchor="middle"
                dominantBaseline="middle"
                pointerEvents="none"
                className="select-none"
              >
                {length.toFixed(1)}&apos; × {width.toFixed(1)}&apos;
              </text>

              {/* Rotation indicator */}
              {placement.rotated && (
                <text
                  x={pos.x + 3}
                  y={pos.y - width * SCALE + 10}
                  fill="white"
                  fontSize={8}
                  pointerEvents="none"
                >
                  ↻
                </text>
              )}
            </g>
          )
        })}

        {/* Legend */}
        <text x={5} y={height - 5} fill="#94a3b8" fontSize={9}>
          Drag to move • Double-click to rotate • Grid: 6&quot;
        </text>
      </svg>
    </div>
  )
}
