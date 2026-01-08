'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  Package,
  DollarSign,
  FileText,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Check,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
}

interface LineItem {
  id: string
  description: string
  category: string
  quantity: number
  unitPrice: number
  total: number
  notes: string
}

const CATEGORIES = [
  { value: 'line_haul', label: 'Line Haul' },
  { value: 'permit', label: 'Permits' },
  { value: 'escort', label: 'Escorts' },
  { value: 'fuel', label: 'Fuel Surcharge' },
  { value: 'toll', label: 'Tolls' },
  { value: 'other', label: 'Other' },
]

const STEPS = [
  { id: 1, name: 'Customer', icon: Users },
  { id: 2, name: 'Cargo', icon: Package },
  { id: 3, name: 'Pricing', icon: DollarSign },
  { id: 4, name: 'Review', icon: FileText },
]

export default function NewQuotePage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)

  // Form state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [customerSearch, setCustomerSearch] = useState('')

  // Cargo details
  const [cargoDetails, setCargoDetails] = useState({
    origin: '',
    destination: '',
    description: '',
    length: '',
    width: '',
    height: '',
    weight: '',
    trailerType: 'flatbed',
  })

  // Line items
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      description: 'Line Haul - Base Rate',
      category: 'line_haul',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      notes: '',
    },
  ])

  // Quote settings
  const [validDays, setValidDays] = useState('30')
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState('Payment due within 30 days of delivery. Fuel surcharge may apply based on current diesel prices.')

  useEffect(() => {
    fetchCustomers()
    loadFromSession()
  }, [])

  async function fetchCustomers() {
    try {
      const response = await fetch('/api/customers')
      if (response.ok) {
        const data = await response.json()
        setCustomers(data)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  function loadFromSession() {
    // Load cargo data from analyze/routes session if available
    const storedCargo = sessionStorage.getItem('cargoForQuote')
    if (storedCargo) {
      try {
        const cargo = JSON.parse(storedCargo)
        setCargoDetails({
          origin: cargo.origin || '',
          destination: cargo.destination || '',
          description: cargo.description || '',
          length: String(cargo.length || ''),
          width: String(cargo.width || ''),
          height: String(cargo.height || ''),
          weight: String(cargo.weight || ''),
          trailerType: cargo.trailerType || 'flatbed',
        })

        // Pre-populate line items from route costs
        const items: LineItem[] = []
        if (cargo.lineHaulRate) {
          items.push({
            id: '1',
            description: `Line Haul - ${cargo.origin} to ${cargo.destination}`,
            category: 'line_haul',
            quantity: 1,
            unitPrice: cargo.lineHaulRate,
            total: cargo.lineHaulRate,
            notes: cargo.distance ? `${Math.round(cargo.distance)} miles` : '',
          })
        }
        if (cargo.permitCost > 0) {
          items.push({
            id: '2',
            description: 'Oversize/Overweight Permits',
            category: 'permit',
            quantity: 1,
            unitPrice: cargo.permitCost,
            total: cargo.permitCost,
            notes: cargo.states?.join(', ') || '',
          })
        }
        if (cargo.escortCost > 0) {
          items.push({
            id: '3',
            description: 'Escort Services',
            category: 'escort',
            quantity: 1,
            unitPrice: cargo.escortCost,
            total: cargo.escortCost,
            notes: '',
          })
        }
        if (cargo.fuelCost > 0) {
          items.push({
            id: '4',
            description: 'Fuel Surcharge',
            category: 'fuel',
            quantity: 1,
            unitPrice: cargo.fuelCost,
            total: cargo.fuelCost,
            notes: '',
          })
        }
        if (cargo.tollCost > 0) {
          items.push({
            id: '5',
            description: 'Toll Charges',
            category: 'toll',
            quantity: 1,
            unitPrice: cargo.tollCost,
            total: cargo.tollCost,
            notes: '',
          })
        }
        if (items.length > 0) {
          setLineItems(items)
        }

        sessionStorage.removeItem('cargoForQuote')
      } catch (e) {
        console.error('Error parsing session cargo:', e)
      }
    }
  }

  function addLineItem() {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: '',
        category: 'other',
        quantity: 1,
        unitPrice: 0,
        total: 0,
        notes: '',
      },
    ])
  }

  function updateLineItem(id: string, field: keyof LineItem, value: any) {
    setLineItems(items =>
      items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice
        }
        return updated
      })
    )
  }

  function removeLineItem(id: string) {
    if (lineItems.length === 1) return
    setLineItems(items => items.filter(item => item.id !== id))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
  const total = subtotal // Can add tax later

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId)
  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase())
  )

  async function handleSubmit() {
    setSaving(true)
    try {
      const validUntil = new Date()
      validUntil.setDate(validUntil.getDate() + parseInt(validDays))

      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          validUntil: validUntil.toISOString(),
          notes,
          terms,
          lineItems: lineItems.map(({ id, ...item }) => item),
        }),
      })

      if (response.ok) {
        const quote = await response.json()
        router.push(`/quotes/${quote.id}`)
      } else {
        alert('Failed to create quote')
      }
    } catch (error) {
      console.error('Error creating quote:', error)
      alert('Error creating quote')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Quote</h1>
          <p className="text-muted-foreground">Create a professional freight quote</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, index) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isComplete = step > s.id

            return (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => isComplete && setStep(s.id)}
                  disabled={!isComplete}
                  className={cn(
                    'flex flex-col items-center gap-2',
                    isComplete && 'cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : isComplete
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-muted text-muted-foreground border-muted'
                    )}
                  >
                    {isComplete ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive ? 'text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {s.name}
                  </span>
                </button>
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'w-24 h-0.5 mx-2',
                      step > s.id ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step 1: Customer */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Customer</CardTitle>
            <CardDescription>Choose an existing customer or skip to create without one</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Search customers..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
            />

            {loadingCustomers ? (
              <div className="py-8 text-center text-muted-foreground">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No customers found.{' '}
                <Link href="/customers" className="text-primary hover:underline">
                  Add a customer
                </Link>
              </div>
            ) : (
              <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomerId(
                      selectedCustomerId === customer.id ? '' : customer.id
                    )}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border text-left transition-colors',
                      selectedCustomerId === customer.id
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted'
                    )}
                  >
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {customer.email || 'No email'}
                        {customer.phone && ` - ${customer.phone}`}
                      </p>
                    </div>
                    {selectedCustomerId === customer.id && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Cargo Details */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Cargo Details</CardTitle>
            <CardDescription>Enter the load information (optional - for reference)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Origin</Label>
                <Input
                  placeholder="City, State"
                  value={cargoDetails.origin}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, origin: e.target.value })}
                />
              </div>
              <div>
                <Label>Destination</Label>
                <Input
                  placeholder="City, State"
                  value={cargoDetails.destination}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, destination: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Input
                placeholder="e.g., CAT 320 Excavator"
                value={cargoDetails.description}
                onChange={(e) => setCargoDetails({ ...cargoDetails, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Length (ft)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cargoDetails.length}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, length: e.target.value })}
                />
              </div>
              <div>
                <Label>Width (ft)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cargoDetails.width}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, width: e.target.value })}
                />
              </div>
              <div>
                <Label>Height (ft)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cargoDetails.height}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, height: e.target.value })}
                />
              </div>
              <div>
                <Label>Weight (lbs)</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={cargoDetails.weight}
                  onChange={(e) => setCargoDetails({ ...cargoDetails, weight: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Trailer Type</Label>
              <select
                className="w-full mt-1 p-2 border rounded-md"
                value={cargoDetails.trailerType}
                onChange={(e) => setCargoDetails({ ...cargoDetails, trailerType: e.target.value })}
              >
                <option value="flatbed">Flatbed</option>
                <option value="step-deck">Step Deck</option>
                <option value="rgn">RGN (Removable Gooseneck)</option>
                <option value="lowboy">Lowboy</option>
                <option value="double-drop">Double Drop</option>
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Line Items */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Pricing</CardTitle>
            <CardDescription>Add line items for your quote</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lineItems.map((item, index) => (
              <div key={item.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Item {index + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(item.id)}
                    disabled={lineItems.length === 1}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <Label>Description</Label>
                    <Input
                      placeholder="Service description"
                      value={item.description}
                      onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <select
                      className="w-full mt-1 p-2 border rounded-md"
                      value={item.category}
                      onChange={(e) => updateLineItem(item.id, 'category', e.target.value)}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label>Total</Label>
                    <div className="mt-1 p-2 bg-muted rounded-md font-medium">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Notes (optional)</Label>
                  <Input
                    placeholder="Additional details"
                    value={item.notes}
                    onChange={(e) => updateLineItem(item.id, 'notes', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addLineItem} className="w-full gap-2">
              <Plus className="h-4 w-4" />
              Add Line Item
            </Button>

            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between text-lg font-semibold">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-2xl font-bold mt-2">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Quote</CardTitle>
              <CardDescription>Review your quote before creating</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Customer</Label>
                <p className="mt-1">
                  {selectedCustomer ? (
                    <>
                      <span className="font-medium">{selectedCustomer.name}</span>
                      {selectedCustomer.email && (
                        <span className="text-muted-foreground"> - {selectedCustomer.email}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">No customer selected</span>
                  )}
                </p>
              </div>

              {(cargoDetails.origin || cargoDetails.destination) && (
                <div>
                  <Label>Route</Label>
                  <p className="mt-1">
                    {cargoDetails.origin || 'TBD'} → {cargoDetails.destination || 'TBD'}
                  </p>
                </div>
              )}

              {cargoDetails.description && (
                <div>
                  <Label>Cargo</Label>
                  <p className="mt-1">{cargoDetails.description}</p>
                </div>
              )}

              <div className="border-t pt-4">
                <Label className="mb-2 block">Line Items</Label>
                <div className="space-y-2">
                  {lineItems.filter(i => i.description).map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.description}</span>
                      <span className="font-medium">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-xl font-bold mt-4 pt-4 border-t">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quote Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Valid For (days)</Label>
                <Input
                  type="number"
                  min="1"
                  value={validDays}
                  onChange={(e) => setValidDays(e.target.value)}
                  className="w-32"
                />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes for the customer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div>
                <Label>Terms & Conditions</Label>
                <Textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep(step - 1)}
          disabled={step === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)} className="gap-2">
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                Create Quote
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
