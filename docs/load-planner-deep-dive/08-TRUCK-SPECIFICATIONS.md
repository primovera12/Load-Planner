# LOAD PLANNER - Deep Dive Planning Document
## Part 8: Complete Truck Specifications Database

---

## 1. OVERVIEW

This document contains detailed specifications for all trailer types used in heavy haul and oversize freight transport. All measurements are in feet (dimensions) and pounds (weight).

**Critical Note:** Deck height is the most important specification for load planning. It determines how tall cargo can be while staying under the 13.5' legal height limit.

---

## 2. TRAILER CATEGORIES

| Category | Best For | Deck Height | Cargo Height Limit |
|----------|----------|-------------|-------------------|
| Flatbed | Standard freight, steel, lumber | 5.0' | 8.5' |
| Step Deck | Tall cargo 8.5-10' | 3.5' | 10.0' |
| RGN | Very tall, non-running equipment | 2.0' | 11.5' |
| Lowboy | Tallest equipment, excavators | 1.5' | 12.0' |
| Double Drop | Long + tall combinations | 2.0' | 11.5' |
| Landoll | Self-loading, tilt bed | 2.5' | 11.0' |
| Conestoga | Weather protection needed | 5.0' | 8.5' |

---

## 3. COMPLETE TRUCK DATABASE

### 3.1 Flatbed Trailers

#### Standard 48' Flatbed
```json
{
  "id": "flatbed-48",
  "name": "48' Standard Flatbed",
  "category": "flatbed",
  "description": "Most common trailer for general freight",
  "deckSpecs": {
    "length": 48,
    "width": 8.5,
    "deckHeight": 5.0,
    "usableLength": 48,
    "rampCapable": false
  },
  "capacity": {
    "maxCargoWeight": 48000,
    "maxCargoHeight": 8.5,
    "tareWeight": 15000,
    "axleConfiguration": "tandem"
  },
  "legalOverallHeight": 13.5,
  "features": [
    "Side stakes",
    "Tie-down points every 2 feet",
    "Aluminum or steel deck",
    "Tarp hooks"
  ],
  "bestFor": [
    "Steel beams and coils",
    "Lumber and building materials",
    "Machinery under 8.5' tall",
    "General flatbed freight",
    "Pipe and tube"
  ],
  "limitations": [
    "Cannot fit cargo taller than 8.5'",
    "No weather protection",
    "Requires forklift or crane for loading"
  ],
  "loadingMethods": ["crane", "forklift", "side_load"],
  "commonUses": "Most versatile trailer, handles 70% of flatbed freight"
}
```

#### 53' Flatbed
```json
{
  "id": "flatbed-53",
  "name": "53' Flatbed",
  "category": "flatbed",
  "description": "Extended flatbed for longer loads",
  "deckSpecs": {
    "length": 53,
    "width": 8.5,
    "deckHeight": 5.0,
    "usableLength": 53,
    "rampCapable": false
  },
  "capacity": {
    "maxCargoWeight": 45000,
    "maxCargoHeight": 8.5,
    "tareWeight": 16000,
    "axleConfiguration": "tandem"
  },
  "legalOverallHeight": 13.5,
  "features": [
    "Extra 5' of deck space",
    "Same tie-down spacing",
    "May have spread axles"
  ],
  "bestFor": [
    "Long steel",
    "Extended lumber",
    "Long pipe runs"
  ],
  "limitations": [
    "Slightly reduced weight capacity",
    "Same height restrictions as 48'"
  ]
}
```

#### Stretch Flatbed
```json
{
  "id": "flatbed-stretch",
  "name": "Stretch Flatbed",
  "category": "flatbed",
  "description": "Extendable flatbed for very long loads",
  "deckSpecs": {
    "length": 48,
    "lengthExtended": 80,
    "width": 8.5,
    "deckHeight": 5.0,
    "extensionIncrement": 5,
    "rampCapable": false
  },
  "capacity": {
    "maxCargoWeight": 43000,
    "maxCargoWeightExtended": 38000,
    "maxCargoHeight": 8.5,
    "tareWeight": 18000,
    "axleConfiguration": "tandem_spread"
  },
  "features": [
    "Adjustable length",
    "Sliding rear axles",
    "Permits required when extended"
  ],
  "bestFor": [
    "Wind turbine blades",
    "Long beams",
    "Utility poles",
    "Bridge components"
  ],
  "permits": {
    "requiredWhenOver": 53,
    "maxLengthMostStates": 75
  }
}
```

---

### 3.2 Step Deck Trailers

#### Standard Step Deck
```json
{
  "id": "step-deck-48",
  "name": "48' Step Deck",
  "category": "step_deck",
  "description": "Two-level deck for taller cargo",
  "deckSpecs": {
    "totalLength": 48,
    "upperDeck": {
      "length": 11,
      "height": 5.0
    },
    "lowerDeck": {
      "length": 37,
      "height": 3.5
    },
    "width": 8.5,
    "rampCapable": true,
    "rampLength": 5
  },
  "capacity": {
    "maxCargoWeight": 48000,
    "maxCargoHeightUpper": 8.5,
    "maxCargoHeightLower": 10.0,
    "tareWeight": 14000,
    "axleConfiguration": "tandem"
  },
  "legalOverallHeight": 13.5,
  "features": [
    "Drive-on capable with ramps",
    "Lower deck for tall equipment",
    "Upper deck for shorter items",
    "Flip ramps standard"
  ],
  "bestFor": [
    "Forklifts and scissor lifts",
    "Rolling stock",
    "Equipment 8.5-10' tall",
    "Vehicles",
    "Agricultural equipment"
  ],
  "limitations": [
    "Upper deck only 11' long",
    "Step creates 1.5' unusable space",
    "Cannot fit cargo over 10' tall"
  ],
  "loadingMethods": ["drive_on", "crane", "forklift"]
}
```

#### Step Deck with Ramps
```json
{
  "id": "step-deck-ramps",
  "name": "Step Deck with Flip Ramps",
  "category": "step_deck",
  "description": "Step deck with integrated loading ramps",
  "deckSpecs": {
    "totalLength": 48,
    "upperDeck": {
      "length": 11,
      "height": 5.0
    },
    "lowerDeck": {
      "length": 37,
      "height": 3.5
    },
    "width": 8.5,
    "rampCapable": true,
    "rampLength": 5,
    "rampCapacity": 15000
  },
  "capacity": {
    "maxCargoWeight": 46000,
    "maxCargoHeightLower": 10.0,
    "tareWeight": 15500
  },
  "features": [
    "Hydraulic or manual flip ramps",
    "No external ramps needed",
    "Quick loading/unloading"
  ],
  "bestFor": [
    "Self-propelled equipment",
    "Vehicles",
    "Frequent load/unload"
  ]
}
```

#### Stretch Step Deck
```json
{
  "id": "step-deck-stretch",
  "name": "Stretch Step Deck",
  "category": "step_deck",
  "description": "Extendable step deck for long, tall cargo",
  "deckSpecs": {
    "totalLength": 48,
    "totalLengthExtended": 65,
    "lowerDeck": {
      "length": 37,
      "lengthExtended": 54,
      "height": 3.5
    },
    "width": 8.5,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 44000,
    "maxCargoWeightExtended": 40000,
    "maxCargoHeightLower": 10.0,
    "tareWeight": 17000
  },
  "bestFor": [
    "Long construction equipment",
    "Extended reach equipment",
    "Combines and farm equipment"
  ]
}
```

---

### 3.3 RGN (Removable Gooseneck) Trailers

#### Standard RGN
```json
{
  "id": "rgn-48",
  "name": "48' RGN",
  "category": "rgn",
  "description": "Removable gooseneck for non-running equipment",
  "deckSpecs": {
    "wellLength": 29,
    "totalLength": 48,
    "width": 8.5,
    "wellHeight": 2.0,
    "deckHeight": 2.0,
    "groundClearance": 4,
    "rampCapable": true,
    "rampAngle": 9
  },
  "capacity": {
    "maxCargoWeight": 42000,
    "maxCargoHeight": 11.5,
    "tareWeight": 20000,
    "axleConfiguration": "tandem"
  },
  "legalOverallHeight": 13.5,
  "features": [
    "Detachable gooseneck for drive-on loading",
    "Lowest deck height for non-lowboy",
    "Hydraulic detach standard",
    "Multiple tie-down options"
  ],
  "bestFor": [
    "Tracked equipment (excavators, dozers)",
    "Non-running machinery",
    "Tall equipment 10-11' high",
    "Heavy single pieces"
  ],
  "limitations": [
    "Lower weight capacity than flatbed",
    "Requires space for gooseneck removal",
    "Slower to load than step deck"
  ],
  "loadingMethods": ["drive_on", "winch", "crane"],
  "gooseneckSpecs": {
    "detachTime": "5-10 minutes",
    "requiredClearance": "20 feet in front"
  }
}
```

#### 3-Axle RGN
```json
{
  "id": "rgn-3axle",
  "name": "3-Axle RGN",
  "category": "rgn",
  "description": "Higher capacity RGN with third axle",
  "deckSpecs": {
    "wellLength": 29,
    "totalLength": 48,
    "width": 8.5,
    "wellHeight": 2.0,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 52000,
    "maxCargoHeight": 11.5,
    "tareWeight": 23000,
    "axleConfiguration": "tridem"
  },
  "features": [
    "Extra axle for weight distribution",
    "Higher legal capacity",
    "Spread or grouped axles"
  ],
  "bestFor": [
    "Heavy tracked equipment",
    "Large excavators",
    "Mining equipment"
  ],
  "permits": {
    "typicallyRequired": "overweight",
    "reason": "GVW often exceeds 80,000"
  }
}
```

#### Stretch RGN
```json
{
  "id": "rgn-stretch",
  "name": "Stretch RGN",
  "category": "rgn",
  "description": "Extendable RGN for long equipment",
  "deckSpecs": {
    "wellLength": 29,
    "wellLengthExtended": 53,
    "totalLength": 48,
    "totalLengthExtended": 72,
    "width": 8.5,
    "wellHeight": 2.0,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 40000,
    "maxCargoWeightExtended": 35000,
    "maxCargoHeight": 11.5,
    "tareWeight": 24000
  },
  "bestFor": [
    "Long reach excavators",
    "Cranes",
    "Piling equipment",
    "Drill rigs"
  ]
}
```

#### Extendable Width RGN
```json
{
  "id": "rgn-wide",
  "name": "Extendable Width RGN",
  "category": "rgn",
  "description": "RGN with width extensions for wide loads",
  "deckSpecs": {
    "wellLength": 29,
    "width": 8.5,
    "widthExtended": 12,
    "wellHeight": 2.0,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 42000,
    "maxCargoHeight": 11.5,
    "maxCargoWidthExtended": 12,
    "tareWeight": 22000
  },
  "features": [
    "Bolt-on or slide-out extensions",
    "Accommodates wide tracked equipment",
    "Permit required when extended"
  ],
  "bestFor": [
    "Wide dozers",
    "Scrapers",
    "Mining trucks"
  ],
  "permits": {
    "alwaysRequired": true,
    "reason": "Width exceeds 8.5' legal limit"
  }
}
```

---

### 3.4 Lowboy Trailers

#### Standard Lowboy
```json
{
  "id": "lowboy-standard",
  "name": "Standard Lowboy",
  "category": "lowboy",
  "description": "Lowest deck height for tallest equipment",
  "deckSpecs": {
    "wellLength": 24,
    "totalLength": 48,
    "width": 8.5,
    "wellHeight": 1.5,
    "deckHeight": 1.5,
    "neckHeight": 3.5,
    "groundClearance": 6,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 40000,
    "maxCargoHeight": 12.0,
    "tareWeight": 22000,
    "axleConfiguration": "tandem"
  },
  "legalOverallHeight": 13.5,
  "features": [
    "Lowest deck in the industry",
    "Detachable gooseneck",
    "Heavy-duty construction",
    "Outriggers for stability"
  ],
  "bestFor": [
    "Tallest equipment (excavators, cranes)",
    "Mining equipment",
    "Industrial machinery",
    "Transformers"
  ],
  "limitations": [
    "Shortest well length",
    "Lower weight capacity",
    "Requires experienced operators",
    "Ground clearance issues on rough terrain"
  ],
  "loadingMethods": ["drive_on", "crane"],
  "specialConsiderations": [
    "Check ground clearance on route",
    "May need belly height for very low areas"
  ]
}
```

#### Fixed Neck Lowboy
```json
{
  "id": "lowboy-fixed",
  "name": "Fixed Neck Lowboy",
  "category": "lowboy",
  "description": "Non-detachable gooseneck lowboy",
  "deckSpecs": {
    "wellLength": 24,
    "totalLength": 48,
    "width": 8.5,
    "wellHeight": 1.5,
    "rampCapable": true,
    "requiresExternalRamps": true
  },
  "capacity": {
    "maxCargoWeight": 50000,
    "maxCargoHeight": 12.0,
    "tareWeight": 19000
  },
  "features": [
    "Stronger than detachable",
    "Higher weight capacity",
    "Requires crane or ramps"
  ],
  "bestFor": [
    "Crane-loaded equipment",
    "Very heavy single pieces",
    "Consistent route operations"
  ],
  "loadingMethods": ["crane", "external_ramps"]
}
```

#### 3-Axle Lowboy
```json
{
  "id": "lowboy-3axle",
  "name": "3-Axle Lowboy",
  "category": "lowboy",
  "description": "Heavy haul lowboy with third axle",
  "deckSpecs": {
    "wellLength": 24,
    "totalLength": 52,
    "width": 8.5,
    "wellHeight": 1.5,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 55000,
    "maxCargoHeight": 12.0,
    "tareWeight": 25000,
    "axleConfiguration": "tridem"
  },
  "bestFor": [
    "Heaviest equipment",
    "Large mining trucks",
    "Turbine components"
  ],
  "permits": {
    "typicallyRequired": "overweight",
    "reason": "GVW routinely exceeds 80,000"
  }
}
```

---

### 3.5 Double Drop Trailers

#### Standard Double Drop
```json
{
  "id": "double-drop-48",
  "name": "48' Double Drop",
  "category": "double_drop",
  "description": "Low center section for tall, long loads",
  "deckSpecs": {
    "totalLength": 48,
    "frontDeck": {
      "length": 10,
      "height": 4.0
    },
    "wellSection": {
      "length": 29,
      "height": 2.0
    },
    "rearDeck": {
      "length": 9,
      "height": 4.0
    },
    "width": 8.5,
    "rampCapable": false
  },
  "capacity": {
    "maxCargoWeight": 45000,
    "maxCargoHeightWell": 11.5,
    "maxCargoHeightDecks": 9.5,
    "tareWeight": 18000,
    "axleConfiguration": "tandem"
  },
  "features": [
    "Long low section",
    "No detachable gooseneck",
    "Good for crane loading"
  ],
  "bestFor": [
    "Tall + long equipment",
    "Industrial machinery",
    "Transformers and generators",
    "Manufacturing equipment"
  ],
  "limitations": [
    "No drive-on capability",
    "Must crane load",
    "Well clearance on bumps"
  ],
  "loadingMethods": ["crane", "forklift"]
}
```

---

### 3.6 Landoll / Traveling Axle Trailers

#### Landoll Trailer
```json
{
  "id": "landoll",
  "name": "Landoll / Traveling Axle",
  "category": "landoll",
  "description": "Tilt bed trailer for self-loading",
  "deckSpecs": {
    "length": 48,
    "width": 8.5,
    "deckHeight": 2.5,
    "tiltAngle": 11,
    "groundClearance": 4,
    "rampCapable": true
  },
  "capacity": {
    "maxCargoWeight": 50000,
    "maxCargoHeight": 11.0,
    "tareWeight": 17000,
    "axleConfiguration": "tandem"
  },
  "features": [
    "Hydraulic tilt for ground-level loading",
    "No gooseneck removal needed",
    "Fast load/unload times",
    "Traveling (sliding) axles"
  ],
  "bestFor": [
    "Containers",
    "Self-propelled equipment",
    "Quick turnaround loads",
    "Dumpsters and roll-offs"
  ],
  "limitations": [
    "Tilt mechanism adds weight",
    "Requires flat, stable ground",
    "Higher deck than RGN"
  ],
  "loadingMethods": ["drive_on", "winch", "tilt"]
}
```

---

### 3.7 Conestoga Trailers

#### Conestoga (Rolling Tarp System)
```json
{
  "id": "conestoga",
  "name": "Conestoga",
  "category": "conestoga",
  "description": "Flatbed with rolling tarp system",
  "deckSpecs": {
    "length": 48,
    "width": 8.5,
    "deckHeight": 5.0,
    "interiorHeight": 8.5,
    "interiorWidth": 8.4,
    "rampCapable": false
  },
  "capacity": {
    "maxCargoWeight": 44000,
    "maxCargoHeight": 8.5,
    "tareWeight": 17000,
    "axleConfiguration": "tandem"
  },
  "features": [
    "Full weather protection",
    "Rolling tarp system",
    "Side or top loading",
    "No tarp labor needed"
  ],
  "bestFor": [
    "Weather-sensitive cargo",
    "Coils and steel",
    "Electronics",
    "Bagged materials",
    "Food-grade cargo"
  ],
  "limitations": [
    "Reduced cargo weight",
    "Same height restrictions as flatbed",
    "Higher cost per mile"
  ],
  "loadingMethods": ["crane", "forklift", "side_load"]
}
```

---

## 4. DECK HEIGHT COMPARISON CHART

```
Legal Height Limit: 13.5 ft
═══════════════════════════════════════════════════

                           ▲ 13.5' overall
                           │
Flatbed (5.0' deck)       │████████│ 8.5' cargo max
                           │
Step Deck (3.5' deck)     │██████████│ 10.0' cargo max
                           │
Landoll (2.5' deck)       │███████████│ 11.0' cargo max
                           │
RGN (2.0' deck)           │████████████│ 11.5' cargo max
                           │
Double Drop (2.0' well)   │████████████│ 11.5' cargo max
                           │
Lowboy (1.5' deck)        │█████████████│ 12.0' cargo max
                           │
                           ▼ 0'

Key: █ = Cargo space available
```

---

## 5. WEIGHT CAPACITY SUMMARY

| Trailer | Max Cargo | Tare Weight | Typical GVW |
|---------|-----------|-------------|-------------|
| Flatbed 48' | 48,000 | 15,000 | 63,000 |
| Flatbed 53' | 45,000 | 16,000 | 61,000 |
| Step Deck | 48,000 | 14,000 | 62,000 |
| RGN 2-axle | 42,000 | 20,000 | 62,000 |
| RGN 3-axle | 52,000 | 23,000 | 75,000 |
| Lowboy | 40,000 | 22,000 | 62,000 |
| Lowboy 3-axle | 55,000 | 25,000 | 80,000 |
| Double Drop | 45,000 | 18,000 | 63,000 |
| Landoll | 50,000 | 17,000 | 67,000 |
| Conestoga | 44,000 | 17,000 | 61,000 |

**Note:** Tractor adds ~17,000-20,000 lbs to GVW

---

## 6. QUICK SELECTION GUIDE

### By Cargo Height

| Cargo Height | Recommended Trailer | Reason |
|--------------|--------------------|---------| 
| Up to 8.5' | Flatbed | Lowest cost, most available |
| 8.5' - 10' | Step Deck | Lower deck, drive-on capable |
| 10' - 11' | RGN or Landoll | 2-2.5' deck height |
| 11' - 12' | Lowboy | Lowest deck at 1.5' |
| Over 12' | Lowboy + Permit | Exceeds legal height |

### By Cargo Weight

| Cargo Weight | Recommended Trailer | Notes |
|--------------|--------------------|---------| 
| Up to 45,000 | Any standard | Within legal limits |
| 45,000 - 50,000 | Landoll, 3-axle RGN | Higher capacity |
| 50,000 - 55,000 | 3-axle Lowboy/RGN | Permit likely needed |
| Over 55,000 | Multi-axle specialized | Superload permit required |

### By Loading Method

| Loading Capability | Trailer Options |
|-------------------|-----------------|
| Must drive on | Step Deck, RGN, Lowboy, Landoll |
| Crane available | Any trailer type |
| Self-loading needed | Landoll (tilt deck) |
| Forklift only | Flatbed, Double Drop |

---

## 7. TYPESCRIPT INTERFACE

```typescript
export interface TruckType {
  id: string;
  name: string;
  category: TruckCategory;
  description: string;
  
  deckSpecs: {
    length: number;
    lengthExtended?: number;
    width: number;
    widthExtended?: number;
    deckHeight: number;
    wellHeight?: number;
    wellLength?: number;
    groundClearance?: number;
    rampCapable: boolean;
    rampLength?: number;
    rampCapacity?: number;
  };
  
  capacity: {
    maxCargoWeight: number;
    maxCargoWeightExtended?: number;
    maxCargoHeight: number;
    tareWeight: number;
    axleConfiguration: AxleConfiguration;
  };
  
  legalOverallHeight: number;
  
  features: string[];
  bestFor: string[];
  limitations: string[];
  loadingMethods: LoadingMethod[];
  
  permits?: {
    typicallyRequired?: PermitType;
    alwaysRequired?: boolean;
    reason?: string;
  };
}

export type TruckCategory = 
  | 'flatbed' 
  | 'step_deck' 
  | 'rgn' 
  | 'lowboy' 
  | 'double_drop' 
  | 'landoll' 
  | 'conestoga';

export type AxleConfiguration = 
  | 'single' 
  | 'tandem' 
  | 'tridem' 
  | 'tandem_spread';

export type LoadingMethod = 
  | 'drive_on' 
  | 'crane' 
  | 'forklift' 
  | 'winch' 
  | 'tilt' 
  | 'side_load' 
  | 'external_ramps';

export type PermitType = 
  | 'oversize' 
  | 'overweight' 
  | 'superload';
```

---

## 8. COMMON MISCONCEPTIONS

### Height Calculation
❌ **Wrong:** "The cargo is 10' tall, so it fits on a flatbed"  
✅ **Right:** 10' cargo + 5' flatbed deck = 15' total (over legal limit!)

### Weight Limits
❌ **Wrong:** "Legal limit is 80,000 lbs cargo"  
✅ **Right:** 80,000 lbs is GROSS weight (truck + trailer + cargo)

### RGN vs Lowboy
❌ **Wrong:** "RGN and Lowboy are the same"  
✅ **Right:** Lowboy is 0.5' lower (1.5' vs 2.0'), fitting taller cargo

### Step Deck Capacity
❌ **Wrong:** "Step deck carries less because of the step"  
✅ **Right:** Step deck has SAME weight capacity as flatbed (48,000 lbs)

---

*End of Part 8: Complete Truck Specifications Database*
