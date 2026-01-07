import { TruckType } from '@/types'

/**
 * Complete truck/trailer database with accurate specifications
 * Based on industry standards for heavy haul freight
 *
 * CRITICAL: Deck heights are essential for calculating total load height
 * Total Height = Cargo Height + Deck Height (must be <= 13.5 ft legal limit)
 */
export const trucks: TruckType[] = [
  {
    id: 'flatbed-48',
    name: 'Flatbed 48\'',
    category: 'FLATBED',
    description: 'Standard 48-foot flatbed trailer. Most common and economical choice for freight that fits within legal dimensions.',
    deckHeight: 5.0,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoWeight: 48000,
    tareWeight: 15000,
    maxLegalCargoHeight: 8.5, // 13.5 - 5.0
    maxLegalCargoWidth: 8.5,
    features: [
      'Most economical option',
      'Widely available',
      'Easy loading from sides',
      'Standard tie-down points every 2 feet',
      'Can add tarps for weather protection',
    ],
    bestFor: [
      'Steel coils and beams',
      'Lumber and building materials',
      'Machinery under 8.5\' tall',
      'Palletized freight',
      'Construction materials',
    ],
    loadingMethod: 'crane',
  },
  {
    id: 'flatbed-53',
    name: 'Flatbed 53\'',
    category: 'FLATBED',
    description: 'Extended 53-foot flatbed for longer cargo. Slightly reduced weight capacity due to additional length.',
    deckHeight: 5.0,
    deckLength: 53,
    deckWidth: 8.5,
    maxCargoWeight: 45000,
    tareWeight: 16000,
    maxLegalCargoHeight: 8.5,
    maxLegalCargoWidth: 8.5,
    features: [
      '5 extra feet of deck space',
      'Good for longer loads',
      'Same height as 48\' flatbed',
      'Standard tie-down points',
    ],
    bestFor: [
      'Long steel beams',
      'Extended machinery',
      'Multiple items requiring extra length',
      'Pipe and tubing',
    ],
    loadingMethod: 'crane',
  },
  {
    id: 'step-deck',
    name: 'Step Deck',
    category: 'STEP_DECK',
    description: 'Two-level trailer with upper deck (11\') and lower main deck (37\'). Lower deck height allows taller cargo.',
    deckHeight: 3.5,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 37,
    maxCargoWeight: 48000,
    tareWeight: 16000,
    maxLegalCargoHeight: 10.0, // 13.5 - 3.5
    maxLegalCargoWidth: 8.5,
    features: [
      'Lower deck height (3.5\' vs 5\')',
      'Drive-on capability with ramps',
      'Upper deck for smaller items',
      'Good balance of height and capacity',
    ],
    bestFor: [
      'Forklifts and small equipment',
      'Cargo 8.5\' to 10\' tall',
      'Vehicles that can drive on',
      'Agricultural equipment',
      'Scissor lifts and aerial lifts',
    ],
    loadingMethod: 'drive-on',
  },
  {
    id: 'rgn',
    name: 'RGN (Removable Gooseneck)',
    category: 'RGN',
    description: 'Removable gooseneck trailer with very low deck. Gooseneck detaches for front-loading of heavy equipment.',
    deckHeight: 2.0,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 29,
    wellHeight: 2.0,
    maxCargoWeight: 42000,
    tareWeight: 20000,
    maxLegalCargoHeight: 11.5, // 13.5 - 2.0
    maxLegalCargoWidth: 8.5,
    features: [
      'Very low deck height (2\')',
      'Detachable gooseneck for drive-on loading',
      'Ideal for tracked equipment',
      'Can handle tall machinery',
      'Hydraulic detach system',
    ],
    bestFor: [
      'Excavators and dozers',
      'Tracked equipment',
      'Tall machinery (10\'-11.5\')',
      'Equipment that must drive on',
      'Cranes and heavy construction equipment',
    ],
    loadingMethod: 'drive-on',
  },
  {
    id: 'rgn-3axle',
    name: 'RGN 3-Axle',
    category: 'RGN',
    description: 'Heavy-duty 3-axle RGN for heavier loads. Same low deck height with increased weight capacity.',
    deckHeight: 2.0,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 29,
    wellHeight: 2.0,
    maxCargoWeight: 52000,
    tareWeight: 22000,
    maxLegalCargoHeight: 11.5,
    maxLegalCargoWidth: 8.5,
    features: [
      'Extra axle for heavier loads',
      'Same low deck as standard RGN',
      'Better weight distribution',
      'Higher capacity for heavy equipment',
    ],
    bestFor: [
      'Heavy excavators (CAT 330+)',
      'Large dozers',
      'Mining equipment',
      'Heavy tracked machinery',
    ],
    loadingMethod: 'drive-on',
  },
  {
    id: 'lowboy',
    name: 'Lowboy',
    category: 'LOWBOY',
    description: 'Lowest deck height available (1.5\'). Designed for the tallest and heaviest equipment. Requires crane loading.',
    deckHeight: 1.5,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 24,
    wellHeight: 1.5,
    maxCargoWeight: 40000,
    tareWeight: 20000,
    maxLegalCargoHeight: 12.0, // 13.5 - 1.5
    maxLegalCargoWidth: 8.5,
    features: [
      'Lowest deck height available (1.5\')',
      'Maximum cargo height clearance',
      'Very stable for tall loads',
      'Fixed gooseneck (stronger)',
    ],
    bestFor: [
      'Tallest equipment (11.5\'-12\')',
      'Large transformers',
      'Oversized industrial equipment',
      'Crane components',
      'Wind turbine parts',
    ],
    loadingMethod: 'crane',
  },
  {
    id: 'lowboy-3axle',
    name: 'Lowboy 3-Axle',
    category: 'LOWBOY',
    description: 'Heavy-duty lowboy with 3 axles for the heaviest tall loads. Maximum capacity for oversized equipment.',
    deckHeight: 1.5,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 24,
    wellHeight: 1.5,
    maxCargoWeight: 55000,
    tareWeight: 25000,
    maxLegalCargoHeight: 12.0,
    maxLegalCargoWidth: 8.5,
    features: [
      'Maximum weight capacity',
      'Lowest deck for tallest cargo',
      '3 axles for weight distribution',
      'Most versatile for oversize loads',
    ],
    bestFor: [
      'Heaviest tall equipment',
      'Large transformers',
      'Mining equipment',
      'Superload candidates',
    ],
    loadingMethod: 'crane',
  },
  {
    id: 'double-drop',
    name: 'Double Drop',
    category: 'DOUBLE_DROP',
    description: 'Three-level trailer with low center well. Combines height advantage with length for tall, long cargo.',
    deckHeight: 2.0,
    deckLength: 48,
    deckWidth: 8.5,
    wellLength: 25,
    wellHeight: 2.0,
    maxCargoWeight: 45000,
    tareWeight: 18000,
    maxLegalCargoHeight: 11.5,
    maxLegalCargoWidth: 8.5,
    features: [
      'Low center well section',
      'Front and rear decks for smaller items',
      'Good for tall + long machinery',
      'Versatile loading options',
    ],
    bestFor: [
      'Tall machinery with length',
      'Industrial generators',
      'Large compressors',
      'Processing equipment',
    ],
    loadingMethod: 'crane',
  },
  {
    id: 'landoll',
    name: 'Landoll (Tilt Bed)',
    category: 'LANDOLL',
    description: 'Self-loading tilt bed trailer. Tilts and slides for ground-level loading without ramps or cranes.',
    deckHeight: 2.5,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoWeight: 50000,
    tareWeight: 18000,
    maxLegalCargoHeight: 11.0, // 13.5 - 2.5
    maxLegalCargoWidth: 8.5,
    features: [
      'Self-loading capability',
      'Tilts to ground level',
      'No external equipment needed',
      'Fast loading/unloading',
      'Hydraulic tilt and slide',
    ],
    bestFor: [
      'Containers',
      'Equipment without crane access',
      'Remote locations',
      'Quick turnaround loads',
      'Vehicles and small equipment',
    ],
    loadingMethod: 'tilt',
  },
  {
    id: 'conestoga',
    name: 'Conestoga',
    category: 'CONESTOGA',
    description: 'Flatbed with retractable tarp system. Provides weather protection while maintaining flatbed flexibility.',
    deckHeight: 5.0,
    deckLength: 48,
    deckWidth: 8.5,
    maxCargoWeight: 44000,
    tareWeight: 17000,
    maxLegalCargoHeight: 8.5,
    maxLegalCargoWidth: 8.5,
    features: [
      'Built-in tarp system',
      'Weather protection',
      'Side loading capability',
      'Quick tarp deployment',
      'No manual tarping required',
    ],
    bestFor: [
      'Weather-sensitive cargo',
      'Paper products',
      'Food-grade freight',
      'Finished goods needing protection',
      'Electronics and machinery',
    ],
    loadingMethod: 'forklift',
  },
]

/**
 * Get truck by ID
 */
export function getTruckById(id: string): TruckType | undefined {
  return trucks.find(truck => truck.id === id)
}

/**
 * Get trucks by category
 */
export function getTrucksByCategory(category: TruckType['category']): TruckType[] {
  return trucks.filter(truck => truck.category === category)
}

/**
 * Get all unique categories
 */
export function getCategories(): TruckType['category'][] {
  return [...new Set(trucks.map(truck => truck.category))]
}
