'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Key,
  Webhook,
  BookOpen,
  Plus,
  Copy,
  Check,
  Trash2,
  Loader2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Code,
  Zap,
  Clock,
} from 'lucide-react'
import { API_SCOPES, SCOPE_PRESETS } from '@/lib/api-key'
import { WEBHOOK_EVENTS } from '@/lib/webhooks'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  rateLimit: number
  requestCount: number
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  key?: string // Only present when just created
}

interface WebhookData {
  id: string
  name: string
  url: string
  secret: string
  events: string[]
  isActive: boolean
  successCount: number
  failureCount: number
  lastTriggeredAt: string | null
  createdAt: string
}

export default function DevelopersPage() {
  const [activeTab, setActiveTab] = useState('api-keys')

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Code className="h-8 w-8" />
          Developer Hub
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys, webhooks, and access documentation
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="api-keys" className="gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys">
          <ApiKeysTab />
        </TabsContent>

        <TabsContent value="webhooks">
          <WebhooksTab />
        </TabsContent>

        <TabsContent value="docs">
          <DocsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ApiKeysTab() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchApiKeys()
  }, [])

  async function fetchApiKeys() {
    setLoading(true)
    try {
      const response = await fetch('/api/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data)
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createApiKey() {
    if (!newKeyName.trim() || selectedScopes.length === 0) return

    setCreating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName,
          scopes: selectedScopes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewKey(data.key)
        setApiKeys([{ ...data, key: undefined }, ...apiKeys])
        setNewKeyName('')
        setSelectedScopes([])
        setSelectedPreset(null)
      }
    } catch (error) {
      console.error('Failed to create API key:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteApiKey(id: string) {
    try {
      const response = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setApiKeys(apiKeys.filter((k) => k.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
    }
  }

  async function toggleApiKey(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/api-keys?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (response.ok) {
        setApiKeys(apiKeys.map((k) => (k.id === id ? { ...k, isActive } : k)))
      }
    } catch (error) {
      console.error('Failed to toggle API key:', error)
    }
  }

  function applyPreset(presetKey: string) {
    const preset = SCOPE_PRESETS[presetKey as keyof typeof SCOPE_PRESETS]
    if (preset) {
      setSelectedScopes(preset.scopes)
      setSelectedPreset(presetKey)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* New Key Alert */}
      {newKey && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Key className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">API Key Created</h3>
                <p className="text-sm text-green-700 mb-3">
                  Copy this key now. It won't be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white rounded border text-sm font-mono break-all">
                    {newKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newKey)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewKey(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create API Key</CardTitle>
            <CardDescription>
              Generate a new API key to access the Load Planner API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key Name</Label>
              <Input
                id="keyName"
                placeholder="e.g., Production, Development, My App"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <Label>Quick Presets</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SCOPE_PRESETS).map(([key, preset]) => (
                  <Button
                    key={key}
                    variant={selectedPreset === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => applyPreset(key)}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scopes */}
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(API_SCOPES).map(([scope, description]) => (
                  <label
                    key={scope}
                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedScopes.includes(scope)}
                      onChange={(e) => {
                        setSelectedPreset(null)
                        if (e.target.checked) {
                          setSelectedScopes([...selectedScopes, scope])
                        } else {
                          setSelectedScopes(selectedScopes.filter((s) => s !== scope))
                        }
                      }}
                    />
                    <span className="text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewKeyName('')
                  setSelectedScopes([])
                  setSelectedPreset(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createApiKey}
                disabled={creating || !newKeyName.trim() || selectedScopes.length === 0}
                className="gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Key
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create API Key
        </Button>
      )}

      {/* Existing Keys */}
      <div className="space-y-4">
        {apiKeys.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No API Keys</h3>
              <p className="text-muted-foreground">
                Create an API key to start using the Load Planner API
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map((key) => (
            <Card key={key.id} className={!key.isActive ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Key className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{key.name}</h3>
                        {!key.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <code className="text-sm text-muted-foreground font-mono">
                        {key.keyPrefix}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleApiKey(key.id, !key.isActive)}
                      title={key.isActive ? 'Disable' : 'Enable'}
                    >
                      {key.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Zap className="h-4 w-4" />
                    {key.requestCount}/{key.rateLimit} requests/hour
                  </span>
                  {key.lastUsedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Last used: {new Date(key.lastUsedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {key.scopes.map((scope) => (
                    <span
                      key={scope}
                      className="text-xs px-2 py-0.5 bg-muted rounded"
                    >
                      {scope}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newWebhookName, setNewWebhookName] = useState('')
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchWebhooks()
  }, [])

  async function fetchWebhooks() {
    setLoading(true)
    try {
      const response = await fetch('/api/webhooks')
      if (response.ok) {
        const data = await response.json()
        setWebhooks(data)
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
    } finally {
      setLoading(false)
    }
  }

  async function createWebhook() {
    if (!newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0) return

    setCreating(true)
    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newWebhookName,
          url: newWebhookUrl,
          events: selectedEvents,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setNewSecret(data.secret)
        setWebhooks([data, ...webhooks])
        setNewWebhookName('')
        setNewWebhookUrl('')
        setSelectedEvents([])
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Failed to create webhook:', error)
    } finally {
      setCreating(false)
    }
  }

  async function deleteWebhook(id: string) {
    try {
      const response = await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' })
      if (response.ok) {
        setWebhooks(webhooks.filter((w) => w.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error)
    }
  }

  async function toggleWebhook(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/webhooks?id=${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      })
      if (response.ok) {
        setWebhooks(webhooks.map((w) => (w.id === id ? { ...w, isActive } : w)))
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* New Secret Alert */}
      {newSecret && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Webhook className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Webhook Created</h3>
                <p className="text-sm text-green-700 mb-3">
                  Copy this signing secret now. It won't be shown in full again.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white rounded border text-sm font-mono break-all">
                    {newSecret}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(newSecret)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setNewSecret(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showCreateForm ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Webhook</CardTitle>
            <CardDescription>
              Receive real-time notifications when events occur
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhookName">Webhook Name</Label>
              <Input
                id="webhookName"
                placeholder="e.g., Quote Notifications, CRM Sync"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="webhookUrl">Endpoint URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder="https://your-server.com/webhook"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be HTTPS (except localhost for testing)
              </p>
            </div>

            {/* Events */}
            <div className="space-y-2">
              <Label>Events to Listen For</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {Object.entries(WEBHOOK_EVENTS).map(([event, description]) => (
                  <label
                    key={event}
                    className="flex items-start gap-2 p-2 rounded border cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(event)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedEvents([...selectedEvents, event])
                        } else {
                          setSelectedEvents(selectedEvents.filter((ev) => ev !== event))
                        }
                      }}
                      className="mt-1"
                    />
                    <div>
                      <span className="text-sm font-medium">{event}</span>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false)
                  setNewWebhookName('')
                  setNewWebhookUrl('')
                  setSelectedEvents([])
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={createWebhook}
                disabled={creating || !newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0}
                className="gap-2"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create Webhook
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button onClick={() => setShowCreateForm(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Webhook
        </Button>
      )}

      {/* Existing Webhooks */}
      <div className="space-y-4">
        {webhooks.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Webhook className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No Webhooks</h3>
              <p className="text-muted-foreground">
                Create a webhook to receive real-time event notifications
              </p>
            </CardContent>
          </Card>
        ) : (
          webhooks.map((webhook) => (
            <Card key={webhook.id} className={!webhook.isActive ? 'opacity-60' : ''}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      <Webhook className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{webhook.name}</h3>
                        {!webhook.isActive && (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground break-all">{webhook.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleWebhook(webhook.id, !webhook.isActive)}
                      title={webhook.isActive ? 'Disable' : 'Enable'}
                    >
                      {webhook.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1 text-green-600">
                    <Check className="h-4 w-4" />
                    {webhook.successCount} delivered
                  </span>
                  {webhook.failureCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {webhook.failureCount} failed
                    </span>
                  )}
                  {webhook.lastTriggeredAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {webhook.events.map((event) => (
                    <span
                      key={event}
                      className="text-xs px-2 py-0.5 bg-muted rounded"
                    >
                      {event}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

function DocsTab() {
  const [copied, setCopied] = useState<string | null>(null)

  function copyCode(code: string, id: string) {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const examples = {
    auth: `curl -X GET "https://load.lkwjd.com/api/v1/loads" \\
  -H "Authorization: Bearer lp_live_your_api_key_here"`,
    createLoad: `curl -X POST "https://load.lkwjd.com/api/v1/loads" \\
  -H "Authorization: Bearer lp_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "origin": "Houston, TX",
    "destination": "Denver, CO",
    "length": 25,
    "width": 10,
    "height": 12,
    "weight": 45000,
    "description": "Excavator",
    "trailerType": "rgn"
  }'`,
    createQuote: `curl -X POST "https://load.lkwjd.com/api/v1/quotes" \\
  -H "Authorization: Bearer lp_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "loadId": "clxx...",
    "customerId": "clxx...",
    "validUntil": "2025-02-01",
    "lineItems": [
      { "description": "Line Haul", "category": "line_haul", "unitPrice": 2500 },
      { "description": "Permits", "category": "permit", "unitPrice": 450 }
    ]
  }'`,
    analyze: `curl -X POST "https://load.lkwjd.com/api/v1/analyze" \\
  -H "Authorization: Bearer lp_live_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "text": "Need to move a CAT 320 excavator from Houston to Denver. Dimensions are 25ft long, 10ft wide, 12ft tall. Weight is about 45,000 lbs."
  }'`,
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            API Documentation
          </CardTitle>
          <CardDescription>
            Everything you need to integrate with Load Planner
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base URL */}
          <div>
            <h3 className="font-semibold mb-2">Base URL</h3>
            <code className="block p-3 bg-muted rounded text-sm">
              https://load.lkwjd.com/api/v1
            </code>
          </div>

          {/* Authentication */}
          <div>
            <h3 className="font-semibold mb-2">Authentication</h3>
            <p className="text-sm text-muted-foreground mb-3">
              All API requests require a Bearer token in the Authorization header.
            </p>
            <div className="relative">
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
                {examples.auth}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyCode(examples.auth, 'auth')}
              >
                {copied === 'auth' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Rate Limits */}
          <div>
            <h3 className="font-semibold mb-2">Rate Limits</h3>
            <p className="text-sm text-muted-foreground">
              Default: 1,000 requests per hour per API key. Rate limit headers are included in responses:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mt-2">
              <li>X-RateLimit-Limit: Maximum requests per hour</li>
              <li>X-RateLimit-Remaining: Requests remaining</li>
              <li>X-RateLimit-Reset: Unix timestamp when limit resets</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Loads */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">LOADS</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Method</th>
                    <th className="text-left py-2">Endpoint</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/loads</code></td>
                    <td className="py-2">List all loads</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/loads/:id</code></td>
                    <td className="py-2">Get a specific load</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-blue-600">POST</code></td>
                    <td className="py-2"><code>/loads</code></td>
                    <td className="py-2">Create a new load</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-yellow-600">PATCH</code></td>
                    <td className="py-2"><code>/loads/:id</code></td>
                    <td className="py-2">Update a load</td>
                  </tr>
                  <tr>
                    <td className="py-2"><code className="text-red-600">DELETE</code></td>
                    <td className="py-2"><code>/loads/:id</code></td>
                    <td className="py-2">Delete a load</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Quotes */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">QUOTES</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Method</th>
                    <th className="text-left py-2">Endpoint</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/quotes</code></td>
                    <td className="py-2">List all quotes</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/quotes/:id</code></td>
                    <td className="py-2">Get a specific quote</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-blue-600">POST</code></td>
                    <td className="py-2"><code>/quotes</code></td>
                    <td className="py-2">Create a new quote</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-yellow-600">PATCH</code></td>
                    <td className="py-2"><code>/quotes/:id</code></td>
                    <td className="py-2">Update a quote</td>
                  </tr>
                  <tr>
                    <td className="py-2"><code className="text-red-600">DELETE</code></td>
                    <td className="py-2"><code>/quotes/:id</code></td>
                    <td className="py-2">Delete a quote</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Customers */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">CUSTOMERS</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Method</th>
                    <th className="text-left py-2">Endpoint</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/customers</code></td>
                    <td className="py-2">List all customers</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-green-600">GET</code></td>
                    <td className="py-2"><code>/customers/:id</code></td>
                    <td className="py-2">Get a specific customer</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-blue-600">POST</code></td>
                    <td className="py-2"><code>/customers</code></td>
                    <td className="py-2">Create a new customer</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2"><code className="text-yellow-600">PATCH</code></td>
                    <td className="py-2"><code>/customers/:id</code></td>
                    <td className="py-2">Update a customer</td>
                  </tr>
                  <tr>
                    <td className="py-2"><code className="text-red-600">DELETE</code></td>
                    <td className="py-2"><code>/customers/:id</code></td>
                    <td className="py-2">Delete a customer</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Analyze */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">ANALYZE</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Method</th>
                    <th className="text-left py-2">Endpoint</th>
                    <th className="text-left py-2">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-2"><code className="text-blue-600">POST</code></td>
                    <td className="py-2"><code>/analyze</code></td>
                    <td className="py-2">Parse email text and get truck recommendations</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-2">Create a Load</h3>
            <div className="relative">
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {examples.createLoad}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyCode(examples.createLoad, 'createLoad')}
              >
                {copied === 'createLoad' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Create a Quote</h3>
            <div className="relative">
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {examples.createQuote}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyCode(examples.createQuote, 'createQuote')}
              >
                {copied === 'createQuote' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Analyze Email Text</h3>
            <div className="relative">
              <pre className="p-3 bg-muted rounded text-sm overflow-x-auto whitespace-pre-wrap">
                {examples.analyze}
              </pre>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => copyCode(examples.analyze, 'analyze')}
              >
                {copied === 'analyze' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Payloads
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Webhook requests include the following headers for verification:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground">
            <li><code>X-Webhook-Signature</code>: HMAC-SHA256 signature of the payload</li>
            <li><code>X-Webhook-Timestamp</code>: ISO timestamp of when webhook was sent</li>
          </ul>

          <div>
            <h4 className="font-medium mb-2">Payload Structure</h4>
            <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`{
  "event": "quote.created",
  "timestamp": "2025-01-07T12:00:00.000Z",
  "data": {
    "id": "clxx...",
    "quoteNumber": "QT-00001",
    "status": "DRAFT",
    "total": 2950,
    ...
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">Verify Signature (Node.js)</h4>
            <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
