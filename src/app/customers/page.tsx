'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MapPin,
  Loader2,
  X,
  Edit2,
  Trash2,
  FileText,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Customer {
  id: string
  name: string
  contactName: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
  _count?: {
    loads: number
    quotes: number
  }
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
  })

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/customers')
      const data = await response.json()

      if (data.success) {
        setCustomers(data.data)
      } else {
        setError(data.error || 'Failed to load customers')
      }
    } catch (err) {
      setError('Failed to load customers')
      console.error('Error fetching customers:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      contactName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
    })
    setEditingCustomer(null)
    setShowAddForm(false)
  }

  // Handle edit
  const handleEdit = (customer: Customer) => {
    setFormData({
      name: customer.name,
      contactName: customer.contactName || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      city: customer.city || '',
      state: customer.state || '',
      zipCode: customer.zipCode || '',
      notes: customer.notes || '',
    })
    setEditingCustomer(customer)
    setShowAddForm(true)
  }

  // Handle save
  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Customer name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const url = editingCustomer
        ? `/api/customers/${editingCustomer.id}`
        : '/api/customers'
      const method = editingCustomer ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (data.success) {
        await fetchCustomers()
        resetForm()
      } else {
        setError(data.error || 'Failed to save customer')
      }
    } catch (err) {
      setError('Failed to save customer')
      console.error('Error saving customer:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Handle delete
  const handleDelete = async (customer: Customer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customer.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (data.success) {
        await fetchCustomers()
      } else {
        setError(data.error || 'Failed to delete customer')
      }
    } catch (err) {
      setError('Failed to delete customer')
      console.error('Error deleting customer:', err)
    }
  }

  // Filter customers by search
  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.contactName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.city?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                <p className="text-sm text-muted-foreground">
                  Manage your customer contacts and relationships
                </p>
              </div>
            </div>
            <Button onClick={() => setShowAddForm(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </CardTitle>
                  <CardDescription>
                    {editingCustomer
                      ? 'Update customer information'
                      : 'Enter customer details to create a new record'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Company Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Acme Trucking Co."
                  />
                </div>
                <div>
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({ ...formData, contactName: e.target.value })
                    }
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@acme.com"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="123 Main St"
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Houston"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      placeholder="TX"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zipCode: e.target.value })
                      }
                      placeholder="77001"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes about this customer..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingCustomer ? (
                    'Update Customer'
                  ) : (
                    'Add Customer'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No customers found' : 'No customers yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first customer to get started'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddForm(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Customer
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card
                key={customer.id}
                className={cn(
                  'transition-colors hover:border-primary/50',
                  !customer.isActive && 'opacity-60'
                )}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{customer.name}</h3>
                        {customer.contactName && (
                          <p className="text-sm text-muted-foreground">
                            {customer.contactName}
                          </p>
                        )}
                      </div>
                    </div>
                    {!customer.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  <div className="space-y-2 text-sm">
                    {customer.email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a
                          href={`mailto:${customer.email}`}
                          className="hover:text-primary"
                        >
                          {customer.email}
                        </a>
                      </div>
                    )}
                    {customer.phone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a
                          href={`tel:${customer.phone}`}
                          className="hover:text-primary"
                        >
                          {customer.phone}
                        </a>
                      </div>
                    )}
                    {(customer.city || customer.state) && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {[customer.city, customer.state]
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Package className="h-4 w-4" />
                      <span>{customer._count?.loads || 0} loads</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{customer._count?.quotes || 0} quotes</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(customer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
