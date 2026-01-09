'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AddressAutocomplete } from './AddressAutocomplete'
import { LoadCustomer, PlaceDetails } from '@/types/route-planning'
import { User, Plus, Building2, Phone, Mail, MapPin, ChevronDown, ChevronUp } from 'lucide-react'

interface CustomerInfoSectionProps {
  customer: LoadCustomer | null
  onChange: (customer: LoadCustomer | null) => void
  collapsed?: boolean
}

interface ExistingCustomer {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export function CustomerInfoSection({
  customer,
  onChange,
  collapsed: initialCollapsed = false,
}: CustomerInfoSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed)
  const [mode, setMode] = useState<'select' | 'new'>('select')
  const [existingCustomers, setExistingCustomers] = useState<ExistingCustomer[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Fetch existing customers
  useEffect(() => {
    async function fetchCustomers() {
      try {
        setIsLoading(true)
        const response = await fetch('/api/customers')
        if (response.ok) {
          const data = await response.json()
          setExistingCustomers(data.customers || data || [])
        }
      } catch (error) {
        console.error('Failed to fetch customers:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCustomers()
  }, [])

  // Handle customer selection
  const handleSelectCustomer = useCallback(
    (customerId: string) => {
      if (customerId === 'new') {
        setMode('new')
        onChange({
          name: '',
          contactName: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
        })
        return
      }

      const selected = existingCustomers.find((c) => c.id === customerId)
      if (selected) {
        onChange({
          id: selected.id,
          name: selected.name,
          contactName: selected.contactName || '',
          email: selected.email || '',
          phone: selected.phone || '',
          address: selected.address || '',
          city: selected.city || '',
          state: selected.state || '',
          zipCode: selected.zipCode || '',
        })
        setMode('select')
      }
    },
    [existingCustomers, onChange]
  )

  // Handle form field changes
  const handleFieldChange = useCallback(
    (field: keyof LoadCustomer, value: string) => {
      onChange({
        ...customer,
        name: customer?.name || '',
        [field]: value,
      })
    },
    [customer, onChange]
  )

  // Handle address autocomplete selection
  const handleAddressSelect = useCallback(
    (place: PlaceDetails) => {
      onChange({
        ...customer,
        name: customer?.name || '',
        address: place.address,
        city: place.city,
        state: place.state,
        zipCode: place.zipCode,
        placeId: place.placeId,
      })
    },
    [customer, onChange]
  )

  // Filter customers by search term
  const filteredCustomers = existingCustomers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card className="border-blue-100">
      <CardHeader
        className="cursor-pointer py-3"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Customer Information
            {customer?.name && (
              <span className="text-sm font-normal text-gray-500">
                - {customer.name}
              </span>
            )}
          </CardTitle>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Customer Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Customer</Label>
            <Select
              value={customer?.id || (mode === 'new' ? 'new' : '')}
              onValueChange={handleSelectCustomer}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select existing customer or create new..." />
              </SelectTrigger>
              <SelectContent>
                <div className="p-2">
                  <Input
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="mb-2"
                  />
                </div>
                {filteredCustomers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3 w-3 text-gray-400" />
                      <span>{c.name}</span>
                      {c.city && c.state && (
                        <span className="text-xs text-gray-400">
                          ({c.city}, {c.state})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                <SelectItem value="new">
                  <div className="flex items-center gap-2 text-blue-600">
                    <Plus className="h-3 w-3" />
                    Create New Customer
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Details Form */}
          {(mode === 'new' || customer) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t">
              {/* Company Name */}
              <div className="space-y-1.5">
                <Label htmlFor="customer-name" className="text-sm">
                  Company Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="customer-name"
                    value={customer?.name || ''}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="Company name"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Contact Name */}
              <div className="space-y-1.5">
                <Label htmlFor="contact-name" className="text-sm">
                  Contact Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="contact-name"
                    value={customer?.contactName || ''}
                    onChange={(e) => handleFieldChange('contactName', e.target.value)}
                    placeholder="Contact person"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm">
                  Phone
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    value={customer?.phone || ''}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={customer?.email || ''}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="email@company.com"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Address with Autocomplete */}
              <div className="md:col-span-2">
                <AddressAutocomplete
                  label="Address"
                  value={
                    customer?.address
                      ? `${customer.address}${customer.city ? ', ' + customer.city : ''}${customer.state ? ', ' + customer.state : ''}${customer.zipCode ? ' ' + customer.zipCode : ''}`
                      : ''
                  }
                  onChange={(value) => handleFieldChange('address', value)}
                  onPlaceSelect={handleAddressSelect}
                  placeholder="Start typing address..."
                />
              </div>

              {/* City, State, Zip (read-only, auto-filled) */}
              <div className="grid grid-cols-3 gap-2 md:col-span-2">
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-500">City</Label>
                  <Input
                    value={customer?.city || ''}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    placeholder="City"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-500">State</Label>
                  <Input
                    value={customer?.state || ''}
                    onChange={(e) => handleFieldChange('state', e.target.value)}
                    placeholder="State"
                    className="bg-gray-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-gray-500">ZIP</Label>
                  <Input
                    value={customer?.zipCode || ''}
                    onChange={(e) => handleFieldChange('zipCode', e.target.value)}
                    placeholder="ZIP"
                    className="bg-gray-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Quick Info Display (when customer is selected) */}
          {customer?.id && !isCollapsed && (
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 pt-2 border-t">
              {customer.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {customer.phone}
                </div>
              )}
              {customer.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {customer.email}
                </div>
              )}
              {customer.city && customer.state && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {customer.city}, {customer.state}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

export default CustomerInfoSection
