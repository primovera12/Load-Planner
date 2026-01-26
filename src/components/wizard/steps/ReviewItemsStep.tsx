'use client'

import { useState } from 'react'
import { ClipboardList, Plus, Trash2, Edit2, Check, X, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WizardNavigation } from '../WizardNavigation'
import { useWizard } from '../WizardProvider'
import { LoadItem } from '@/types/load'
import { cn } from '@/lib/utils'

// Generate a unique ID
function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Empty item template
function createEmptyItem(): LoadItem {
  return {
    id: generateId(),
    sku: '',
    description: '',
    quantity: 1,
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
    stackable: true,
    bottomOnly: false,
    divisible: false,
    divisibleBy: 'quantity',
    minSplitQuantity: 1,
    minSplitWeight: 1000,
  }
}

// Editable cell component
function EditableCell({
  value,
  onChange,
  type = 'text',
  min,
  step,
  className,
}: {
  value: string | number
  onChange: (value: string | number) => void
  type?: 'text' | 'number'
  min?: number
  step?: number
  className?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(String(value))

  const handleSave = () => {
    const newValue = type === 'number' ? parseFloat(editValue) || 0 : editValue
    onChange(newValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditValue(String(value))
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
            if (e.key === 'Escape') handleCancel()
          }}
          min={min}
          step={step}
          className="h-8 w-20"
          autoFocus
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleSave}>
          <Check className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCancel}>
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'text-left hover:bg-muted/50 px-2 py-1 rounded cursor-pointer min-w-[60px]',
        className
      )}
    >
      {type === 'number' ? Number(value).toLocaleString() : value || '-'}
    </button>
  )
}

export function ReviewItemsStep() {
  const { state, dispatch, nextStep } = useWizard()
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleUpdateItem = (id: string, field: keyof LoadItem, value: unknown) => {
    dispatch({ type: 'UPDATE_ITEM', payload: { id, updates: { [field]: value } } })
  }

  const handleAddItem = () => {
    dispatch({ type: 'ADD_ITEM', payload: createEmptyItem() })
  }

  const handleRemoveItem = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: id })
  }

  const handleNext = () => {
    // Validate that we have at least one item with dimensions
    const validItems = state.items.filter(
      (item) => item.length > 0 && item.width > 0 && item.height > 0 && item.weight > 0
    )
    if (validItems.length === 0) {
      alert('Please add at least one item with valid dimensions and weight.')
      return false
    }
    return true
  }

  // Calculate totals
  const totalWeight = state.items.reduce((sum, item) => sum + item.weight * item.quantity, 0)
  const totalPieces = state.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <ClipboardList className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Review Cargo Items</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Verify the extracted cargo items and make any corrections. Click any value to edit.
        </p>
      </div>

      {/* Location fields */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Shipment Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">Origin</Label>
              <Input
                id="origin"
                placeholder="e.g., Houston, TX"
                value={state.origin}
                onChange={(e) => dispatch({ type: 'SET_ORIGIN', payload: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              <Input
                id="destination"
                placeholder="e.g., Dallas, TX"
                value={state.destination}
                onChange={(e) => dispatch({ type: 'SET_DESTINATION', payload: e.target.value })}
              />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Load Description (optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Construction equipment for Site A"
                value={state.loadDescription}
                onChange={(e) =>
                  dispatch({ type: 'SET_LOAD_DESCRIPTION', payload: e.target.value })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Cargo Items ({state.items.length})
            </CardTitle>
            <Button size="sm" onClick={handleAddItem}>
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">L (ft)</TableHead>
                  <TableHead className="text-right">W (ft)</TableHead>
                  <TableHead className="text-right">H (ft)</TableHead>
                  <TableHead className="text-right">Weight (lbs)</TableHead>
                  <TableHead className="text-center">Stackable</TableHead>
                  <TableHead className="text-center" title="Allow splitting across trucks">Divisible</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      No items added yet. Click &quot;Add Item&quot; to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <EditableCell
                          value={item.description}
                          onChange={(v) => handleUpdateItem(item.id, 'description', v)}
                          className="font-medium"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.quantity}
                          onChange={(v) => handleUpdateItem(item.id, 'quantity', v)}
                          type="number"
                          min={1}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.length}
                          onChange={(v) => handleUpdateItem(item.id, 'length', v)}
                          type="number"
                          min={0}
                          step={0.5}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.width}
                          onChange={(v) => handleUpdateItem(item.id, 'width', v)}
                          type="number"
                          min={0}
                          step={0.5}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.height}
                          onChange={(v) => handleUpdateItem(item.id, 'height', v)}
                          type="number"
                          min={0}
                          step={0.5}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <EditableCell
                          value={item.weight}
                          onChange={(v) => handleUpdateItem(item.id, 'weight', v)}
                          type="number"
                          min={0}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.stackable}
                          onCheckedChange={(checked) =>
                            handleUpdateItem(item.id, 'stackable', checked)
                          }
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={item.divisible}
                          onCheckedChange={(checked) =>
                            handleUpdateItem(item.id, 'divisible', checked)
                          }
                          title="Allow this item to be split across multiple trucks if needed"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Totals row */}
          {state.items.length > 0 && (
            <div className="border-t px-4 py-3 bg-muted/30 flex justify-between text-sm">
              <span className="font-medium">
                Total: {totalPieces} piece{totalPieces !== 1 ? 's' : ''}
              </span>
              <span className="font-medium">
                Total Weight: {totalWeight.toLocaleString()} lbs
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <WizardNavigation
        onNextClick={handleNext}
        nextDisabled={state.items.length === 0}
        nextLabel="Select Trailer"
      />
    </div>
  )
}
