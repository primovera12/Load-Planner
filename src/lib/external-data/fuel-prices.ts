/**
 * Fuel Prices Integration
 *
 * Uses EIA (Energy Information Administration) API for diesel prices
 * or fallback to regional averages if API unavailable
 */

import { FuelPrice } from '@/types/route-planning'

// EIA PADD regions (Petroleum Administration for Defense Districts)
const PADD_REGIONS: Record<string, string[]> = {
  PADD1A: ['CT', 'ME', 'MA', 'NH', 'RI', 'VT'], // New England
  PADD1B: ['DE', 'DC', 'MD', 'NJ', 'NY', 'PA'], // Central Atlantic
  PADD1C: ['FL', 'GA', 'NC', 'SC', 'VA', 'WV'], // Lower Atlantic
  PADD2: [
    'IL', 'IN', 'IA', 'KS', 'KY', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'OK',
    'SD', 'TN', 'WI',
  ], // Midwest
  PADD3: ['AL', 'AR', 'LA', 'MS', 'NM', 'TX'], // Gulf Coast
  PADD4: ['CO', 'ID', 'MT', 'UT', 'WY'], // Rocky Mountain
  PADD5: ['AK', 'AZ', 'CA', 'HI', 'NV', 'OR', 'WA'], // West Coast
}

// Fallback diesel prices by PADD region (updated periodically)
// These are approximate prices as of late 2024
const FALLBACK_PRICES: Record<string, number> = {
  PADD1A: 4.29,
  PADD1B: 4.19,
  PADD1C: 3.89,
  PADD2: 3.79,
  PADD3: 3.59,
  PADD4: 4.09,
  PADD5: 4.89,
  US: 3.99, // National average
}

/**
 * Get the PADD region for a state
 */
function getRegionForState(stateCode: string): string {
  for (const [region, states] of Object.entries(PADD_REGIONS)) {
    if (states.includes(stateCode)) {
      return region
    }
  }
  return 'US'
}

/**
 * Fetch fuel prices from EIA API
 * Note: EIA API requires an API key for production use
 * https://www.eia.gov/opendata/
 */
export async function fetchFuelPricesFromEIA(): Promise<Map<string, number>> {
  // EIA API endpoint for weekly diesel prices
  const eiaApiKey = process.env.EIA_API_KEY
  const prices = new Map<string, number>()

  if (!eiaApiKey) {
    console.log('EIA API key not configured, using fallback prices')
    return prices
  }

  try {
    // EIA series IDs for diesel prices by PADD region
    const seriesIds = [
      'PET.EMD_EPD2D_PTE_R10_DPG.W', // PADD 1
      'PET.EMD_EPD2D_PTE_R20_DPG.W', // PADD 2
      'PET.EMD_EPD2D_PTE_R30_DPG.W', // PADD 3
      'PET.EMD_EPD2D_PTE_R40_DPG.W', // PADD 4
      'PET.EMD_EPD2D_PTE_R50_DPG.W', // PADD 5
    ]

    const response = await fetch(
      `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${eiaApiKey}&frequency=weekly&data[0]=value&facets[product][]=EPD2D&sort[0][column]=period&sort[0][direction]=desc&length=1`,
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )

    if (response.ok) {
      const data = await response.json()
      // Process EIA response and populate prices map
      if (data.response?.data) {
        for (const item of data.response.data) {
          if (item.duoarea && item.value) {
            prices.set(item.duoarea, parseFloat(item.value))
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch EIA prices:', error)
  }

  return prices
}

/**
 * Get diesel price for a specific state
 */
export async function getDieselPriceForState(stateCode: string): Promise<FuelPrice> {
  const region = getRegionForState(stateCode)

  // Try to get fresh prices from EIA
  const eiaPrices = await fetchFuelPricesFromEIA()
  let price = eiaPrices.get(region) || FALLBACK_PRICES[region] || FALLBACK_PRICES.US

  return {
    state: stateCode,
    region,
    dieselPrice: price,
    source: eiaPrices.size > 0 ? 'EIA' : 'manual',
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Get diesel prices for multiple states
 */
export async function getDieselPricesForStates(
  stateCodes: string[]
): Promise<FuelPrice[]> {
  const uniqueStates = [...new Set(stateCodes)]
  const prices: FuelPrice[] = []

  // Get EIA prices once for all states
  const eiaPrices = await fetchFuelPricesFromEIA()

  for (const state of uniqueStates) {
    const region = getRegionForState(state)
    const price = eiaPrices.get(region) || FALLBACK_PRICES[region] || FALLBACK_PRICES.US

    prices.push({
      state,
      region,
      dieselPrice: price,
      source: eiaPrices.size > 0 ? 'EIA' : 'manual',
      lastUpdated: new Date().toISOString(),
    })
  }

  return prices
}

/**
 * Calculate fuel cost for a route
 */
export function calculateFuelCost(
  distanceMiles: number,
  pricesPerState: { state: string; miles: number }[],
  fuelPrices: FuelPrice[],
  mpg: number = 6 // Average truck MPG
): { totalGallons: number; averagePrice: number; totalCost: number } {
  let totalCost = 0
  let totalGallons = 0

  const priceMap = new Map(fuelPrices.map((fp) => [fp.state, fp.dieselPrice]))

  for (const segment of pricesPerState) {
    const price = priceMap.get(segment.state) || FALLBACK_PRICES.US
    const gallons = segment.miles / mpg
    totalCost += gallons * price
    totalGallons += gallons
  }

  // If no per-state breakdown, use total distance with average price
  if (pricesPerState.length === 0 && distanceMiles > 0) {
    const avgPrice =
      fuelPrices.length > 0
        ? fuelPrices.reduce((sum, fp) => sum + fp.dieselPrice, 0) / fuelPrices.length
        : FALLBACK_PRICES.US
    totalGallons = distanceMiles / mpg
    totalCost = totalGallons * avgPrice
  }

  return {
    totalGallons: Math.round(totalGallons * 10) / 10,
    averagePrice:
      totalGallons > 0
        ? Math.round((totalCost / totalGallons) * 100) / 100
        : FALLBACK_PRICES.US,
    totalCost: Math.round(totalCost * 100) / 100,
  }
}

export default getDieselPricesForStates
