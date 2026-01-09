'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { AddressAutocomplete } from './AddressAutocomplete'
import { RouteStop, StopType, PlaceDetails } from '@/types/route-planning'
import { LoadItem } from '@/types/load'
import {
  GripVertical,
  MapPin,
  Package,
  User,
  Phone,
  Calendar,
  ChevronDown,
  ChevronUp,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface StopCardProps {
  stop: RouteStop
  index: number
  items: LoadItem[]
  onChange: (stop: RouteStop) => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  isDragging?: boolean
}

export function StopCard({
  stop,
  index,
  items,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  isDragging = false,
}: StopCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // Handle field changes
  const handleFieldChange = useCallback(
    (field: keyof RouteStop, value: unknown) => {
      onChange({
        ...stop,
        [field]: value,
      })
    },
    [stop, onChange]
  )

  // Handle address selection from autocomplete
  const handleAddressSelect = useCallback(
    (place: PlaceDetails) => {
      onChange({
        ...stop,
        address: place.address,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode,
        placeId: place.placeId,
        latitude: place.latitude,
        longitude: place.longitude,
        formattedAddress: place.formattedAddress,
      })
    },
    [stop, onChange]
  )

  // Handle item selection toggle
  const handleItemToggle = useCallback(
    (itemId: string, checked: boolean) => {
      const currentItems = stop.itemIds || []
      const newItems = checked
        ? [...currentItems, itemId]
        : currentItems.filter((id) => id !== itemId)
      handleFieldChange('itemIds', newItems)
    },
    [stop.itemIds, handleFieldChange]
  )

  // Get selected items for display
  const selectedItems = items.filter((item) => stop.itemIds?.includes(item.id))
  const selectedItemsCount = selectedItems.length

  // Format address for display
  const displayAddress = stop.formattedAddress || stop.address || ''

  return (
    <Card
      className={`border-l-4 ${
        stop.type === 'PICKUP' ? 'border-l-green-500' : 'border-l-blue-500'
      } ${isDragging ? 'opacity-50 scale-105' : ''}`}
    >
      <CardHeader className="py-2 px-3">
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div className="cursor-grab text-gray-400 hover:text-gray-600">
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Stop number badge */}
          <Badge
            variant={stop.type === 'PICKUP' ? 'default' : 'secondary'}
            className={`${
              stop.type === 'PICKUP'
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
          >
            {index + 1}. {stop.type === 'PICKUP' ? 'Pickup' : 'Delivery'}
          </Badge>

          {/* Location summary */}
          <div className="flex-1 min-w-0">
            {stop.city && stop.state ? (
              <span className="text-sm text-gray-600 truncate">
                {stop.city}, {stop.state}
              </span>
            ) : (
              <span className="text-sm text-gray-400 italic">No address</span>
            )}
          </div>

          {/* Items count */}
          {selectedItemsCount > 0 && (
            <Badge variant="outline" className="text-xs">
              <Package className="h-3 w-3 mr-1" />
              {selectedItemsCount} item{selectedItemsCount !== 1 ? 's' : ''}
            </Badge>
          )}

          {/* Move buttons */}
          <div className="flex gap-1">
            {canMoveUp && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onMoveUp}
              >
                <ArrowUp className="h-3 w-3" />
              </Button>
            )}
            {canMoveDown && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onMoveDown}
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Expand/Collapse */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>

          {/* Delete button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={onDelete}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3 space-y-3">
            {/* Stop Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Stop Type</Label>
                <Select
                  value={stop.type}
                  onValueChange={(value: StopType) =>
                    handleFieldChange('type', value)
                  }
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PICKUP">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        Pickup
                      </div>
                    </SelectItem>
                    <SelectItem value="DELIVERY">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                        Delivery
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Date */}
              <div className="space-y-1">
                <Label className="text-xs">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Date
                </Label>
                <Input
                  type="date"
                  value={stop.scheduledDate || ''}
                  onChange={(e) =>
                    handleFieldChange('scheduledDate', e.target.value)
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1">
              <Label className="text-xs">
                <MapPin className="h-3 w-3 inline mr-1" />
                Address
              </Label>
              <AddressAutocomplete
                value={displayAddress}
                onChange={(value) => handleFieldChange('address', value)}
                onPlaceSelect={handleAddressSelect}
                placeholder="Enter address..."
                className="[&_input]:h-8 [&_input]:text-sm"
              />
            </div>

            {/* Time Window */}
            <div className="space-y-1">
              <Label className="text-xs">Time Window</Label>
              <Input
                value={stop.scheduledTime || ''}
                onChange={(e) =>
                  handleFieldChange('scheduledTime', e.target.value)
                }
                placeholder="e.g., 8:00 AM - 12:00 PM"
                className="h-8 text-sm"
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">
                  <User className="h-3 w-3 inline mr-1" />
                  Contact Name
                </Label>
                <Input
                  value={stop.contactName || ''}
                  onChange={(e) =>
                    handleFieldChange('contactName', e.target.value)
                  }
                  placeholder="Contact person"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  <Phone className="h-3 w-3 inline mr-1" />
                  Phone
                </Label>
                <Input
                  value={stop.contactPhone || ''}
                  onChange={(e) =>
                    handleFieldChange('contactPhone', e.target.value)
                  }
                  placeholder="(555) 123-4567"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Items Assignment */}
            {items.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  Items at this stop
                </Label>
                <div className="border rounded-md p-2 max-h-32 overflow-y-auto space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Checkbox
                        id={`stop-${stop.id}-item-${item.id}`}
                        checked={stop.itemIds?.includes(item.id) || false}
                        onCheckedChange={(checked) =>
                          handleItemToggle(item.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`stop-${stop.id}-item-${item.id}`}
                        className="flex-1 cursor-pointer truncate"
                      >
                        {item.description || item.sku || item.id}
                        {item.quantity > 1 && (
                          <span className="text-gray-400 ml-1">
                            x{item.quantity}
                          </span>
                        )}
                      </label>
                      <span className="text-xs text-gray-400">
                        {item.weight}lbs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input
                value={stop.notes || ''}
                onChange={(e) => handleFieldChange('notes', e.target.value)}
                placeholder="Special instructions..."
                className="h-8 text-sm"
              />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

export default StopCard
