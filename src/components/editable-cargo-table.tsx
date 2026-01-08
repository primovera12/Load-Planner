'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LoadItem } from '@/types/load'
import { Pencil, Check, X, Trash2, Plus, Package } from 'lucide-react'

interface EditableCargoTableProps {
  items: LoadItem[]
  onItemsChange: (items: LoadItem[]) => void
}

export function EditableCargoTable({ items, onItemsChange }: EditableCargoTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<LoadItem>>({})
  const [showAddForm, setShowAddForm] = useState(false)
  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    length: '',
    width: '',
    height: '',
    weight: '',
  })

  const startEditing = (item: LoadItem) => {
    setEditingId(item.id)
    setEditValues({
      description: item.description,
      quantity: item.quantity,
      length: item.length,
      width: item.width,
      height: item.height,
      weight: item.weight,
    })
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditValues({})
  }

  const saveEditing = () => {
    if (!editingId) return

    const updatedItems = items.map(item => {
      if (item.id === editingId) {
        return {
          ...item,
          description: editValues.description || item.description,
          quantity: Number(editValues.quantity) || item.quantity,
          length: Number(editValues.length) || item.length,
          width: Number(editValues.width) || item.width,
          height: Number(editValues.height) || item.height,
          weight: Number(editValues.weight) || item.weight,
        }
      }
      return item
    })

    onItemsChange(updatedItems)
    setEditingId(null)
    setEditValues({})
  }

  const deleteItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id))
  }

  const addNewItem = () => {
    if (!newItem.description || !newItem.length || !newItem.width || !newItem.height || !newItem.weight) {
      return
    }

    const item: LoadItem = {
      id: `item-${Date.now()}`,
      description: newItem.description,
      quantity: Number(newItem.quantity) || 1,
      length: Number(newItem.length),
      width: Number(newItem.width),
      height: Number(newItem.height),
      weight: Number(newItem.weight),
      stackable: false,
      fragile: false,
      hazmat: false,
    }

    onItemsChange([...items, item])
    setNewItem({
      description: '',
      quantity: 1,
      length: '',
      width: '',
      height: '',
      weight: '',
    })
    setShowAddForm(false)
  }

  if (items.length === 0 && !showAddForm) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No cargo items found</p>
          <Button onClick={() => setShowAddForm(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Cargo Items ({items.length})
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Add new item form */}
        {showAddForm && (
          <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
            <div className="grid grid-cols-6 gap-2 mb-3">
              <div className="col-span-2">
                <Input
                  placeholder="Description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                />
              </div>
              <Input
                type="number"
                placeholder="L (ft)"
                value={newItem.length}
                onChange={(e) => setNewItem({ ...newItem, length: e.target.value })}
              />
              <Input
                type="number"
                placeholder="W (ft)"
                value={newItem.width}
                onChange={(e) => setNewItem({ ...newItem, width: e.target.value })}
              />
              <Input
                type="number"
                placeholder="H (ft)"
                value={newItem.height}
                onChange={(e) => setNewItem({ ...newItem, height: e.target.value })}
              />
              <Input
                type="number"
                placeholder="Weight (lbs)"
                value={newItem.weight}
                onChange={(e) => setNewItem({ ...newItem, weight: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={addNewItem}>
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        )}

        {/* Items table */}
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[200px]">Description</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">L (ft)</TableHead>
                <TableHead className="text-right">W (ft)</TableHead>
                <TableHead className="text-right">H (ft)</TableHead>
                <TableHead className="text-right">Weight (lbs)</TableHead>
                <TableHead className="w-[100px] text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  {editingId === item.id ? (
                    <>
                      <TableCell>
                        <Input
                          value={editValues.description || ''}
                          onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                          className="h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editValues.quantity || ''}
                          onChange={(e) => setEditValues({ ...editValues, quantity: Number(e.target.value) })}
                          className="h-8 w-16 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editValues.length || ''}
                          onChange={(e) => setEditValues({ ...editValues, length: Number(e.target.value) })}
                          className="h-8 w-20 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editValues.width || ''}
                          onChange={(e) => setEditValues({ ...editValues, width: Number(e.target.value) })}
                          className="h-8 w-20 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editValues.height || ''}
                          onChange={(e) => setEditValues({ ...editValues, height: Number(e.target.value) })}
                          className="h-8 w-20 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editValues.weight || ''}
                          onChange={(e) => setEditValues({ ...editValues, weight: Number(e.target.value) })}
                          className="h-8 w-24 text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditing}>
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{item.length.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{item.width.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{item.height.toFixed(1)}</TableCell>
                      <TableCell className="text-right">{item.weight.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => startEditing(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-red-500"
                            onClick={() => deleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Summary */}
        <div className="mt-3 pt-3 border-t flex justify-between text-sm text-muted-foreground">
          <span>
            Total: {items.reduce((sum, i) => sum + i.quantity, 0)} items
          </span>
          <span>
            Total Weight: {items.reduce((sum, i) => sum + (i.weight * i.quantity), 0).toLocaleString()} lbs
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
