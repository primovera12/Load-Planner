/**
 * Pre-built cargo templates for common heavy haul equipment
 * All dimensions in feet, weight in lbs
 */

export interface CargoTemplate {
  name: string
  width: number
  height: number
  length: number
  weight: number
  category: 'construction' | 'industrial' | 'agricultural' | 'vehicles' | 'containers'
  description?: string
}

export const CARGO_TEMPLATES: CargoTemplate[] = [
  // Construction Equipment
  {
    name: 'Excavator (Small)',
    width: 8,
    height: 9,
    length: 20,
    weight: 35000,
    category: 'construction',
    description: 'Small excavator, track width under 8ft',
  },
  {
    name: 'Excavator (Large)',
    width: 10,
    height: 10,
    length: 28,
    weight: 55000,
    category: 'construction',
    description: 'Large excavator, requires oversize permit',
  },
  {
    name: 'Bulldozer',
    width: 11,
    height: 9,
    length: 18,
    weight: 50000,
    category: 'construction',
    description: 'Standard bulldozer with blade',
  },
  {
    name: 'Wheel Loader',
    width: 9,
    height: 10,
    length: 24,
    weight: 42000,
    category: 'construction',
    description: 'Front-end wheel loader',
  },
  {
    name: 'Backhoe',
    width: 7.5,
    height: 8,
    length: 18,
    weight: 18000,
    category: 'construction',
    description: 'Backhoe loader',
  },
  {
    name: 'Skid Steer',
    width: 6,
    height: 6.5,
    length: 10,
    weight: 8000,
    category: 'construction',
    description: 'Compact skid steer loader',
  },
  {
    name: 'Compactor/Roller',
    width: 7,
    height: 9,
    length: 12,
    weight: 25000,
    category: 'construction',
    description: 'Vibratory road roller',
  },
  {
    name: 'Motor Grader',
    width: 8,
    height: 10,
    length: 28,
    weight: 35000,
    category: 'construction',
    description: 'Road grader',
  },

  // Industrial Equipment
  {
    name: 'Transformer',
    width: 12,
    height: 14,
    length: 18,
    weight: 80000,
    category: 'industrial',
    description: 'Large electrical transformer - SUPERLOAD',
  },
  {
    name: 'Generator',
    width: 8,
    height: 10,
    length: 25,
    weight: 38000,
    category: 'industrial',
    description: 'Industrial power generator',
  },
  {
    name: 'Crane Boom',
    width: 4,
    height: 5,
    length: 45,
    weight: 25000,
    category: 'industrial',
    description: 'Crane boom section',
  },
  {
    name: 'Crane Counterweight',
    width: 8,
    height: 4,
    length: 10,
    weight: 40000,
    category: 'industrial',
    description: 'Crane counterweight block',
  },
  {
    name: 'Industrial Tank',
    width: 10,
    height: 11,
    length: 30,
    weight: 45000,
    category: 'industrial',
    description: 'Pressure vessel or storage tank',
  },
  {
    name: 'Steel Coils',
    width: 6,
    height: 6,
    length: 8,
    weight: 45000,
    category: 'industrial',
    description: 'Steel coils bundle',
  },

  // Agricultural Equipment
  {
    name: 'Combine Harvester',
    width: 14,
    height: 12,
    length: 30,
    weight: 35000,
    category: 'agricultural',
    description: 'Full-size combine - requires oversize',
  },
  {
    name: 'Tractor (Large)',
    width: 8,
    height: 10,
    length: 16,
    weight: 22000,
    category: 'agricultural',
    description: 'Large farm tractor',
  },
  {
    name: 'Sprayer',
    width: 10,
    height: 11,
    length: 25,
    weight: 18000,
    category: 'agricultural',
    description: 'Agricultural sprayer',
  },

  // Vehicles
  {
    name: 'School Bus',
    width: 8,
    height: 9,
    length: 35,
    weight: 14000,
    category: 'vehicles',
    description: 'Standard school bus',
  },
  {
    name: 'Fire Truck',
    width: 8,
    height: 10,
    length: 32,
    weight: 30000,
    category: 'vehicles',
    description: 'Fire engine',
  },
  {
    name: 'RV/Motorhome',
    width: 8,
    height: 11,
    length: 40,
    weight: 20000,
    category: 'vehicles',
    description: 'Class A motorhome',
  },

  // Containers and Prefab
  {
    name: 'Shipping Container (20ft)',
    width: 8,
    height: 8.5,
    length: 20,
    weight: 5000,
    category: 'containers',
    description: '20-foot ISO container (empty)',
  },
  {
    name: 'Shipping Container (40ft)',
    width: 8,
    height: 8.5,
    length: 40,
    weight: 8500,
    category: 'containers',
    description: '40-foot ISO container (empty)',
  },
  {
    name: 'Modular Building',
    width: 14,
    height: 12,
    length: 60,
    weight: 55000,
    category: 'containers',
    description: 'Prefab modular building section',
  },
]

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: CargoTemplate['category']): CargoTemplate[] {
  return CARGO_TEMPLATES.filter((t) => t.category === category)
}

/**
 * Get all unique categories
 */
export function getCategories(): CargoTemplate['category'][] {
  return ['construction', 'industrial', 'agricultural', 'vehicles', 'containers']
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: CargoTemplate['category']): string {
  const labels: Record<CargoTemplate['category'], string> = {
    construction: 'Construction',
    industrial: 'Industrial',
    agricultural: 'Agricultural',
    vehicles: 'Vehicles',
    containers: 'Containers',
  }
  return labels[category]
}
