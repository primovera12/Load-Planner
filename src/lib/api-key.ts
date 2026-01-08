import { randomBytes, createHash } from 'crypto'

// API key format: lp_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
const API_KEY_PREFIX = 'lp_live_'

/**
 * Generate a new API key
 * Returns both the full key (to show once) and the hashed version (to store)
 */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Generate 32 random bytes = 64 hex chars
  const randomPart = randomBytes(32).toString('hex')
  const key = `${API_KEY_PREFIX}${randomPart}`

  // Hash the key for storage
  const hash = hashApiKey(key)

  // Store first 8 chars of the random part for display
  const prefix = `${API_KEY_PREFIX}${randomPart.substring(0, 8)}...`

  return { key, hash, prefix }
}

/**
 * Hash an API key for storage/comparison
 */
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith(API_KEY_PREFIX) && key.length === API_KEY_PREFIX.length + 64
}

/**
 * Available API scopes
 */
export const API_SCOPES = {
  // Loads
  'loads:read': 'Read load data',
  'loads:write': 'Create and update loads',
  'loads:delete': 'Delete loads',

  // Quotes
  'quotes:read': 'Read quote data',
  'quotes:write': 'Create and update quotes',
  'quotes:delete': 'Delete quotes',

  // Customers
  'customers:read': 'Read customer data',
  'customers:write': 'Create and update customers',
  'customers:delete': 'Delete customers',

  // Analysis
  'analyze:use': 'Use AI email analysis',

  // Routes
  'routes:read': 'Read route and permit data',
  'routes:calculate': 'Calculate routes and permits',

  // Webhooks
  'webhooks:manage': 'Manage webhook configurations',
} as const

export type ApiScope = keyof typeof API_SCOPES

/**
 * Check if a scope is valid
 */
export function isValidScope(scope: string): scope is ApiScope {
  return scope in API_SCOPES
}

/**
 * Check if scopes array contains required scope
 */
export function hasScope(scopes: string[], required: ApiScope): boolean {
  return scopes.includes(required)
}

/**
 * Scope presets for quick setup
 */
export const SCOPE_PRESETS = {
  readOnly: {
    name: 'Read Only',
    description: 'View all data, no modifications',
    scopes: ['loads:read', 'quotes:read', 'customers:read', 'routes:read'] as ApiScope[],
  },
  standard: {
    name: 'Standard',
    description: 'Read and write loads, quotes, customers',
    scopes: [
      'loads:read', 'loads:write',
      'quotes:read', 'quotes:write',
      'customers:read', 'customers:write',
      'routes:read', 'routes:calculate',
      'analyze:use',
    ] as ApiScope[],
  },
  full: {
    name: 'Full Access',
    description: 'All permissions including delete',
    scopes: Object.keys(API_SCOPES) as ApiScope[],
  },
}
