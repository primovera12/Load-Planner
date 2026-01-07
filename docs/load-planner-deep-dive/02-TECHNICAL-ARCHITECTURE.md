# LOAD PLANNER - Deep Dive Planning Document
## Part 2: Technical Architecture

---

## 1. HIGH-LEVEL SYSTEM ARCHITECTURE

### 1.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LOAD PLANNER SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PRESENTATION LAYER                            │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │  Landing  │  │ Dashboard │  │   Load    │  │   Quote   │        │   │
│  │  │   Page    │  │   Page    │  │  Analyzer │  │  Builder  │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐        │   │
│  │  │ Customer  │  │  Route    │  │  Permit   │  │ Settings  │        │   │
│  │  │  Manager  │  │  Planner  │  │  Viewer   │  │   Page    │        │   │
│  │  └───────────┘  └───────────┘  └───────────┘  └───────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                         API LAYER (Next.js)                          │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      API Routes (/app/api/)                     │ │   │
│  │  │  /analyze    /loads    /quotes    /routing    /permits    /ai  │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                        SERVICE LAYER (lib/)                          │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Email   │ │  Truck   │ │  Route   │ │  Permit  │ │  Quote   │  │   │
│  │  │  Parser  │ │ Selector │ │ Planner  │ │   Calc   │ │Generator │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │  Escort  │ │Securement│ │ Stacking │ │ Customer │ │   Unit   │  │   │
│  │  │   Calc   │ │   Calc   │ │Optimizer │ │ Manager  │ │Converter │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│  ┌─────────────────────────────────▼───────────────────────────────────┐   │
│  │                         DATA LAYER                                   │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐        │   │
│  │  │   PostgreSQL   │  │  Static Data   │  │     Cache      │        │   │
│  │  │   (Prisma)     │  │  (JSON files)  │  │   (optional)   │        │   │
│  │  └────────────────┘  └────────────────┘  └────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
┌────────────────────────────────────▼────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                  │
├──────────────────────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │  Gemini  │ │ Geoapify │ │   Low    │ │  Clerk   │ │  Vercel  │          │
│  │   API    │ │ Routing  │ │Clearance │ │   Auth   │ │  (Host)  │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
└──────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow Diagrams

#### Core Flow: Email to Quote

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EMAIL TO QUOTE FLOW                                   │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  User   │     │  Email  │     │Dimension│     │  Truck  │     │  Permit │
    │  Input  │────▶│  Parser │────▶│Analyzer │────▶│Selector │────▶│ Checker │
    └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │              │                │               │               │
         │         Gemini API       Unit Convert    Match Specs      Flag OS/OW
         │              │                │               │               │
         ▼              ▼                ▼               ▼               ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           PARSED LOAD OBJECT                             │
    │  {                                                                       │
    │    items: [{ description, length, width, height, weight }],             │
    │    origin: { city, state, lat, lon },                                   │
    │    destination: { city, state, lat, lon },                              │
    │    pickupDate,                                                          │
    │    recommendedTruck,                                                    │
    │    permitFlags: { oversize, overweight, superload }                     │
    │  }                                                                       │
    └─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  Route  │     │  State  │     │ Permit  │     │ Escort  │     │  Quote  │
    │ Planner │────▶│Detector │────▶│  Calc   │────▶│  Calc   │────▶│Generator│
    └─────────┘     └─────────┘     └─────────┘     └─────────┘     └─────────┘
         │              │                │               │               │
     Geoapify       Geo Match       Fee Lookup      Escort Rules     Sum Costs
         │              │                │               │               │
         ▼              ▼                ▼               ▼               ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                           COMPLETE QUOTE                                 │
    │  {                                                                       │
    │    load, route, stateSegments,                                          │
    │    costs: { lineHaul, fuel, permits, escorts, total },                  │
    │    warnings: [...],                                                     │
    │    recommendations: [...]                                                │
    │  }                                                                       │
    └─────────────────────────────────────────────────────────────────────────┘
```

#### Route Planning Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ROUTE PLANNING FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

   Origin + Destination
          │
          ▼
    ┌─────────────┐
    │  Geocode    │──────▶ Geoapify Geocoding API
    │  Addresses  │
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │   Get       │──────▶ Geoapify Routing API (truck mode)
    │   Route     │        - Vehicle height/width/weight params
    └─────────────┘        - Returns polyline coordinates
          │
          ▼
    ┌─────────────┐
    │  Detect     │──────▶ Point-in-polygon with state boundaries
    │  States     │        - Calculate miles per state
    └─────────────┘
          │
          ▼
    ┌─────────────┐
    │  Check      │──────▶ Low Clearance Map API
    │  Clearances │        - Returns obstacles on route
    └─────────────┘
          │
          ▼
    ┌─────────────────────────────────────────────────────────────────────────┐
    │                          ROUTE RESULT                                    │
    │  {                                                                       │
    │    totalMiles: 847,                                                      │
    │    estimatedTime: 52200, // seconds                                      │
    │    geometry: { type: 'LineString', coordinates: [...] },                │
    │    stateSegments: [                                                      │
    │      { state: 'TX', miles: 312, entry: [...], exit: [...] },            │
    │      { state: 'OK', miles: 215, entry: [...], exit: [...] },            │
    │      { state: 'KS', miles: 320, entry: [...], exit: [...] }             │
    │    ],                                                                    │
    │    clearanceIssues: [                                                    │
    │      { location: [...], bridge: 'I-35 Overpass', clearance: 14.2 }      │
    │    ]                                                                     │
    │  }                                                                       │
    └─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SERVICE SPECIFICATIONS

### 2.1 Email Parser Service

**Purpose:** Extract structured load data from unstructured email text using AI

**Location:** `src/lib/services/email-parser.ts`

**Dependencies:**
- Google Gemini API (`@google/generative-ai`)
- Unit Converter Service
- Zod (validation)

**Input:**
```typescript
interface EmailParserInput {
  emailContent: string;      // Raw email text
  includeThread?: boolean;   // Parse entire thread or just last message
}
```

**Output:**
```typescript
interface ParsedLoad {
  confidence: number;        // 0-1 AI confidence score
  items: ParsedLoadItem[];
  origin: Location | null;
  destination: Location | null;
  pickupDate: string | null;
  deliveryDate: string | null;
  customerName: string | null;
  customerEmail: string | null;
  specialNotes: string[];
  rawExtract: {              // What AI extracted before conversion
    dimensions: string[];
    weights: string[];
    locations: string[];
  };
}

interface ParsedLoadItem {
  description: string;
  quantity: number;
  length: Dimension;         // { value: number, unit: 'ft' | 'in' | 'm' }
  width: Dimension;
  height: Dimension;
  weight: Weight;            // { value: number, unit: 'lbs' | 'tons' | 'kg' }
  notes: string[];
}

interface Location {
  address?: string;
  city: string;
  state: string;
  zip?: string;
  lat?: number;
  lon?: number;
}
```

**Key Methods:**
```typescript
// Main parsing method
async function parseLoadEmail(input: EmailParserInput): Promise<ParsedLoad>

// Parse with fallback prompts if first attempt fails
async function parseWithRetry(content: string, maxRetries: number): Promise<ParsedLoad>

// Validate parsed output against schema
function validateParsedLoad(data: unknown): ParsedLoad

// Extract confidence score based on completeness
function calculateConfidence(parsed: ParsedLoad): number
```

**Error Handling:**
- `ParseError` - AI couldn't extract meaningful data
- `ValidationError` - Extracted data fails schema validation
- `RateLimitError` - Gemini API rate limited

---

### 2.2 Unit Converter Service

**Purpose:** Convert between different measurement units used in freight

**Location:** `src/lib/services/unit-converter.ts`

**Conversions Supported:**

| From | To | Formula |
|------|-----|---------|
| inches | feet | ÷ 12 |
| feet | inches | × 12 |
| meters | feet | × 3.28084 |
| feet | meters | ÷ 3.28084 |
| centimeters | inches | ÷ 2.54 |
| tons | pounds | × 2000 |
| pounds | tons | ÷ 2000 |
| kilograms | pounds | × 2.20462 |
| metric tons | pounds | × 2204.62 |

**Key Methods:**
```typescript
// Convert dimension to feet
function toFeet(value: number, fromUnit: DimensionUnit): number

// Convert weight to pounds
function toPounds(value: number, fromUnit: WeightUnit): number

// Parse dimension string like "10'6\"" or "126 inches"
function parseDimensionString(str: string): Dimension

// Parse weight string like "45,000 lbs" or "22.5 tons"
function parseWeightString(str: string): Weight

// Format dimension for display
function formatDimension(feet: number, format: 'decimal' | 'feetInches'): string

// Normalize all dimensions in a load to standard units
function normalizeLoadDimensions(load: ParsedLoad): NormalizedLoad
```

**Type Definitions:**
```typescript
type DimensionUnit = 'ft' | 'in' | 'm' | 'cm';
type WeightUnit = 'lbs' | 'tons' | 'kg' | 'mt';

interface Dimension {
  value: number;
  unit: DimensionUnit;
  normalized: number;  // Always in feet
}

interface Weight {
  value: number;
  unit: WeightUnit;
  normalized: number;  // Always in pounds
}
```

---

### 2.3 Truck Selector Service

**Purpose:** Recommend appropriate truck types based on cargo specifications

**Location:** `src/lib/services/truck-selector.ts`

**Dependencies:**
- Truck Database (`src/data/trucks.ts`)
- Legal Limits Database (`src/data/legal-limits.ts`)

**Input:**
```typescript
interface TruckSelectionInput {
  items: NormalizedLoadItem[];  // Dimensions in feet, weight in lbs
  preferences?: {
    preferredTypes?: TruckCategory[];
    avoidTypes?: TruckCategory[];
    optimizeFor?: 'cost' | 'capacity' | 'height';
  };
}
```

**Output:**
```typescript
interface TruckSelectionResult {
  recommendations: TruckRecommendation[];
  bestMatch: TruckRecommendation;
  warnings: Warning[];
  multiTruckRequired: boolean;
  multiTruckSuggestion?: MultiTruckPlan;
}

interface TruckRecommendation {
  truck: TruckType;
  score: number;           // 0-100
  fits: boolean;
  fitDetails: {
    lengthFits: boolean;
    widthFits: boolean;
    heightFits: boolean;
    weightFits: boolean;
    lengthMargin: number;  // feet remaining
    widthMargin: number;
    heightMargin: number;
    weightMargin: number;  // lbs remaining
  };
  overallDimensions: {
    totalLength: number;
    totalWidth: number;
    totalHeight: number;   // cargo + deck height
    grossWeight: number;   // cargo + truck weight
  };
  permitRequired: {
    oversize: boolean;
    overweight: boolean;
    superload: boolean;
    reasons: string[];
  };
  pros: string[];
  cons: string[];
}
```

**Truck Database Structure:**
```typescript
interface TruckType {
  id: string;
  name: string;
  category: TruckCategory;
  variations: TruckVariation[];
  deckSpecs: {
    length: number;        // feet (main deck)
    width: number;         // feet
    deckHeight: number;    // feet from ground
    wellLength?: number;   // for step decks, RGNs
    wellDepth?: number;    // drop from main deck
  };
  capacity: {
    maxWeight: number;     // lbs (legal cargo weight)
    maxConcentrated: number; // lbs per linear foot
  };
  features: string[];
  bestFor: string[];
  limitations: string[];
  typicalTareWeight: number;  // empty trailer weight
}

type TruckCategory = 
  | 'flatbed'
  | 'step_deck' 
  | 'double_drop'
  | 'rgn'
  | 'lowboy'
  | 'stretch'
  | 'landoll'
  | 'conestoga';

interface TruckVariation {
  id: string;
  name: string;           // e.g., "48ft", "53ft", "Stretch to 65ft"
  lengthRange: [number, number];  // min, max length
  modifiers: Partial<TruckType['deckSpecs']>;
}
```

**Complete Truck Database:**
```typescript
const TRUCKS: TruckType[] = [
  // FLATBEDS
  {
    id: 'flatbed-48',
    name: '48ft Flatbed',
    category: 'flatbed',
    variations: [
      { id: 'flatbed-48-standard', name: 'Standard 48ft', lengthRange: [48, 48] },
      { id: 'flatbed-53', name: '53ft Flatbed', lengthRange: [53, 53] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 5.0,
    },
    capacity: {
      maxWeight: 48000,
      maxConcentrated: 4000,
    },
    features: ['Side loading', 'Top loading', 'Tarping available'],
    bestFor: ['Steel', 'Lumber', 'Building materials', 'Machinery under 8.5ft tall'],
    limitations: ['8.5ft max cargo height for legal', 'No weather protection'],
    typicalTareWeight: 14000,
  },
  
  // STEP DECKS
  {
    id: 'step-deck-48',
    name: '48ft Step Deck',
    category: 'step_deck',
    variations: [
      { id: 'step-single-drop', name: 'Single Drop', lengthRange: [48, 48] },
      { id: 'step-stretch', name: 'Stretch Step Deck', lengthRange: [48, 65] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 3.5,       // main deck (lower section)
      wellLength: 37,        // lower deck length
      wellDepth: 1.5,        // drop from upper deck
    },
    capacity: {
      maxWeight: 48000,
      maxConcentrated: 3500,
    },
    features: ['Lower deck for taller cargo', 'Ramps available', 'Drive-on capable'],
    bestFor: ['Vehicles', 'Machinery 8.5-10ft tall', 'Equipment with ramps'],
    limitations: ['Upper deck only 11ft long', 'Cargo must clear step'],
    typicalTareWeight: 15000,
  },
  
  // RGN (Removable Gooseneck)
  {
    id: 'rgn-48',
    name: '48ft RGN',
    category: 'rgn',
    variations: [
      { id: 'rgn-standard', name: 'Standard RGN', lengthRange: [48, 48] },
      { id: 'rgn-stretch', name: 'Stretch RGN', lengthRange: [48, 65] },
      { id: 'rgn-extendable', name: 'Extendable RGN', lengthRange: [48, 80] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 2.0,       // main well deck
      wellLength: 29,        // primary well
    },
    capacity: {
      maxWeight: 42000,
      maxConcentrated: 5000,
    },
    features: ['Detachable gooseneck', 'Ground-level loading', 'Track equipment capable'],
    bestFor: ['Non-running equipment', 'Track machines', 'Very heavy loads'],
    limitations: ['Lower capacity than flatbed', 'Requires detach space'],
    typicalTareWeight: 18000,
  },
  
  // LOWBOY
  {
    id: 'lowboy-standard',
    name: 'Lowboy',
    category: 'lowboy',
    variations: [
      { id: 'lowboy-fixed', name: 'Fixed Neck', lengthRange: [24, 24] },
      { id: 'lowboy-detach', name: 'Detachable Gooseneck', lengthRange: [24, 29] },
      { id: 'lowboy-stretch', name: 'Stretch Lowboy', lengthRange: [24, 40] }
    ],
    deckSpecs: {
      length: 24,
      width: 8.5,
      deckHeight: 1.5,       // lowest available deck
      wellLength: 24,
    },
    capacity: {
      maxWeight: 40000,
      maxConcentrated: 6000,
    },
    features: ['Lowest deck height', 'Heaviest concentrated loads', 'Outriggers available'],
    bestFor: ['Tall equipment', 'Excavators', 'Cranes', 'Very tall/heavy machinery'],
    limitations: ['Short deck', 'Requires wide load permits often', 'Specialized'],
    typicalTareWeight: 20000,
  },
  
  // DOUBLE DROP
  {
    id: 'double-drop-48',
    name: '48ft Double Drop',
    category: 'double_drop',
    variations: [
      { id: 'double-drop-standard', name: 'Standard', lengthRange: [48, 48] },
      { id: 'double-drop-stretch', name: 'Stretch', lengthRange: [48, 60] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 2.0,
      wellLength: 29,
      wellDepth: 2.0,
    },
    capacity: {
      maxWeight: 45000,
      maxConcentrated: 4500,
    },
    features: ['Low center well', 'Front and rear decks', 'Versatile loading'],
    bestFor: ['Tall + long loads', 'Industrial equipment', 'Transformers'],
    limitations: ['Well length limited', 'Complex loading'],
    typicalTareWeight: 17000,
  },
  
  // LANDOLL / TRAVELING AXLE
  {
    id: 'landoll-48',
    name: '48ft Landoll/Traveling Axle',
    category: 'landoll',
    variations: [
      { id: 'landoll-standard', name: 'Standard', lengthRange: [48, 48] },
      { id: 'landoll-53', name: '53ft Landoll', lengthRange: [53, 53] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 0,         // Ground level when tilted
    },
    capacity: {
      maxWeight: 45000,
      maxConcentrated: 4000,
    },
    features: ['Ground-level tilt loading', 'Self-loading', 'No ramps needed'],
    bestFor: ['Forklifts', 'Scissor lifts', 'Small equipment', 'Rubber-tired machines'],
    limitations: ['Cannot haul tracked equipment', 'Weight distribution matters'],
    typicalTareWeight: 16000,
  },
  
  // CONESTOGA
  {
    id: 'conestoga-48',
    name: '48ft Conestoga',
    category: 'conestoga',
    variations: [
      { id: 'conestoga-standard', name: 'Standard', lengthRange: [48, 48] },
      { id: 'conestoga-53', name: '53ft Conestoga', lengthRange: [53, 53] }
    ],
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 5.0,
    },
    capacity: {
      maxWeight: 44000,
      maxConcentrated: 3500,
    },
    features: ['Retractable tarp system', 'Weather protection', 'Side/top access'],
    bestFor: ['Weather-sensitive cargo', 'Mixed loads', 'Cargo needing protection'],
    limitations: ['Slightly less capacity', 'Tarp system adds height'],
    typicalTareWeight: 16000,
  },
];
```

---

### 2.4 Route Planner Service

**Purpose:** Calculate truck-specific routes with state detection and clearance checking

**Location:** `src/lib/services/route-planner.ts`

**Dependencies:**
- Geoapify API
- Low Clearance Map API
- State Boundaries Data
- Turf.js (geo calculations)

**Input:**
```typescript
interface RoutePlannerInput {
  origin: Location;
  destination: Location;
  waypoints?: Location[];
  vehicleParams: {
    height: number;        // feet (overall loaded height)
    width: number;         // feet
    length: number;        // feet
    weight: number;        // lbs (gross)
  };
  options?: {
    avoidTolls?: boolean;
    avoidHighways?: boolean;
    hazmat?: boolean;
  };
}
```

**Output:**
```typescript
interface RouteResult {
  success: boolean;
  route: {
    totalMiles: number;
    totalKilometers: number;
    estimatedTime: number;    // seconds
    geometry: GeoJSON.LineString;
    bounds: {
      north: number;
      south: number;
      east: number;
      west: number;
    };
  };
  stateSegments: StateSegment[];
  clearanceCheck: ClearanceCheckResult;
  tollInfo?: {
    hasTolls: boolean;
    estimatedTollCost: number;
    tollPlazas: TollPlaza[];
  };
  warnings: RouteWarning[];
  alternateRoutes?: RouteResult[];  // If clearance issues, suggest alternates
}

interface StateSegment {
  state: string;              // Full name
  stateCode: string;          // Two-letter code
  miles: number;
  kilometers: number;
  entryPoint: [number, number];  // [lon, lat]
  exitPoint: [number, number];
  estimatedTime: number;      // seconds in this state
}

interface ClearanceCheckResult {
  safe: boolean;
  obstacleCount: number;
  obstacles: ClearanceObstacle[];
  minimumClearance: number | null;
  recommendations: string[];
}

interface ClearanceObstacle {
  id: string;
  type: 'bridge' | 'tunnel' | 'overpass' | 'utility';
  location: [number, number];
  clearanceHeight: number;    // feet
  loadHeight: number;         // feet (what we're hauling)
  margin: number;             // feet (negative = won't fit)
  description: string;
  roadName: string;
  mileMarker?: number;
  distanceFromStart: number;  // miles
}
```

**Key Methods:**
```typescript
// Main route planning method
async function planRoute(input: RoutePlannerInput): Promise<RouteResult>

// Geocode an address to coordinates
async function geocodeAddress(address: string): Promise<Location>

// Detect states crossed by route
function detectStates(coordinates: [number, number][]): StateSegment[]

// Check clearances along route
async function checkClearances(
  coordinates: [number, number][], 
  loadHeight: number
): Promise<ClearanceCheckResult>

// Find alternate route avoiding obstacles
async function findAlternateRoute(
  input: RoutePlannerInput,
  avoidAreas: [number, number][]
): Promise<RouteResult>
```

---

### 2.5 Permit Calculator Service

**Purpose:** Calculate permit costs and requirements for each state crossed

**Location:** `src/lib/services/permit-calculator.ts`

**Dependencies:**
- State Permits Database (`src/data/state-permits.ts`)
- Escort Rules Database (`src/data/escort-rules.ts`)

**Input:**
```typescript
interface PermitCalculatorInput {
  stateSegments: StateSegment[];
  loadDimensions: {
    width: number;           // feet
    height: number;          // feet (overall)
    length: number;          // feet (overall)
    overhangFront: number;   // feet
    overhangRear: number;    // feet
    grossWeight: number;     // lbs
  };
  permitType: 'single_trip' | 'annual' | 'blanket';
  tripDate?: Date;
  isRouteSurveyRequired?: boolean;
}
```

**Output:**
```typescript
interface PermitCalculatorResult {
  totalCost: number;
  breakdown: {
    permitFees: number;
    mileageFees: number;
    escortCosts: number;
    policeEscortCosts: number;
    otherFees: number;
  };
  byState: StatePermitCost[];
  escortRequirements: EscortRequirement[];
  travelRestrictions: TravelRestriction[];
  requiredDocuments: string[];
  warnings: string[];
  notes: string[];
}

interface StatePermitCost {
  state: string;
  stateCode: string;
  miles: number;
  
  // Fees
  oversizePermitFee: number;
  overweightPermitFee: number;
  superloadFee: number;
  mileageFee: number;
  bridgeAnalysisFee: number;
  routeSurveyFee: number;
  
  // Totals
  totalStateCost: number;
  
  // Details
  permitType: string;
  processingTime: string;
  validityPeriod: string;
  notes: string[];
  
  // Links
  permitPortalUrl?: string;
  phoneNumber?: string;
}

interface EscortRequirement {
  state: string;
  stateCode: string;
  required: boolean;
  leadCar: boolean;
  chaseCar: boolean;
  poleCar: boolean;
  policeEscort: boolean;
  reason: string;
  estimatedCost: number;
  notes: string[];
}

interface TravelRestriction {
  state: string;
  stateCode: string;
  type: 'time' | 'day' | 'holiday' | 'weather' | 'route';
  description: string;
  restriction: string;       // e.g., "No travel 30 min before/after sunrise/sunset"
  exceptions?: string;
}
```

---

### 2.6 Quote Generator Service

**Purpose:** Generate complete cost breakdowns and PDF quotes

**Location:** `src/lib/services/quote-generator.ts`

**Input:**
```typescript
interface QuoteGeneratorInput {
  load: NormalizedLoad;
  route: RouteResult;
  permits: PermitCalculatorResult;
  customer?: Customer;
  pricing: {
    baseMileageRate: number;      // $/mile
    fuelSurchargePercent: number; // e.g., 15 for 15%
    minimumCharge?: number;
    markupPercent?: number;
  };
  options?: {
    includeAlternatives?: boolean;
    validDays?: number;
    notes?: string;
  };
}
```

**Output:**
```typescript
interface GeneratedQuote {
  quoteNumber: string;
  createdAt: Date;
  validUntil: Date;
  
  // Summary
  summary: {
    origin: string;
    destination: string;
    totalMiles: number;
    loadDescription: string;
    truckType: string;
  };
  
  // Pricing breakdown
  pricing: {
    lineHaul: number;
    fuelSurcharge: number;
    permitFees: number;
    escortFees: number;
    policeEscorts: number;
    additionalFees: AdditionalFee[];
    subtotal: number;
    discount: number;
    total: number;
  };
  
  // Detailed breakdown
  details: {
    byState: StateQuoteDetail[];
    escortDetails: EscortDetail[];
    permits: PermitDetail[];
  };
  
  // Recommendations
  recommendations: string[];
  warnings: string[];
  
  // Alternatives (if requested)
  alternatives?: AlternativeQuote[];
}
```

---

## 3. EXTERNAL API INTEGRATIONS

### 3.1 Google Gemini API

**Purpose:** AI-powered email parsing and natural language features

**Endpoints Used:**
- `generateContent` - Single prompt completion
- `startChat` - Multi-turn conversation

**Configuration:**
```typescript
// src/lib/integrations/gemini.ts

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// For email parsing (fast, cost-effective)
export const flashModel: GenerativeModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-flash',
  generationConfig: {
    temperature: 0.1,        // Low for consistent parsing
    topP: 0.8,
    maxOutputTokens: 2048,
  }
});

// For complex reasoning (quote generation, NL queries)
export const proModel: GenerativeModel = genAI.getGenerativeModel({ 
  model: 'gemini-1.5-pro',
  generationConfig: {
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 4096,
  }
});
```

**Rate Limits:**
- Flash: 15 RPM free tier, 1000 RPM paid
- Pro: 2 RPM free tier, 360 RPM paid

**Error Handling:**
```typescript
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        // Rate limited - wait and retry
        await sleep(Math.pow(2, i) * 1000);
        continue;
      }
      if (error.status === 500) {
        // Server error - retry
        await sleep(1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

### 3.2 Geoapify Routing API

**Purpose:** Truck-specific routing with vehicle parameters

**Base URL:** `https://api.geoapify.com/v1`

**Endpoints:**

#### Routing
```
GET /routing
?waypoints={lat1},{lon1}|{lat2},{lon2}
&mode=truck
&type=balanced
&details=instruction_details
&apiKey={key}
```

**Vehicle Parameters:**
```typescript
interface GeoapifyVehicleParams {
  mode: 'truck' | 'truck_medium' | 'truck_heavy';
  height?: number;     // meters (max 4.5)
  width?: number;      // meters (max 3)
  length?: number;     // meters (max 25)
  weight?: number;     // tonnes
  axle_load?: number;  // tonnes per axle
}
```

#### Geocoding
```
GET /geocode/search
?text={address}
&filter=countrycode:us
&apiKey={key}
```

**Response Processing:**
```typescript
interface GeoapifyRoutingResponse {
  features: [{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number][];
    };
    properties: {
      distance: number;        // meters
      time: number;           // seconds
      legs: GeoapifyLeg[];
    };
  }];
}

function processGeoapifyRoute(response: GeoapifyRoutingResponse): RouteResult {
  const feature = response.features[0];
  return {
    totalMiles: metersToMiles(feature.properties.distance),
    totalKilometers: feature.properties.distance / 1000,
    estimatedTime: feature.properties.time,
    geometry: feature.geometry,
    // ... process further
  };
}
```

---

### 3.3 Low Clearance Map API

**Purpose:** Bridge height and clearance data for route validation

**Integration Approach:**
```typescript
// src/lib/integrations/low-clearance.ts

interface LowClearanceConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number;
}

interface ClearanceRequest {
  route: [number, number][];  // Coordinates along route
  vehicleHeight: number;      // feet
  buffer: number;             // feet (safety buffer, default 0.5)
}

interface ClearanceResponse {
  safe: boolean;
  obstacles: Obstacle[];
}

async function checkRouteClearances(
  request: ClearanceRequest
): Promise<ClearanceResponse> {
  // Implementation varies by provider
  // May need to batch requests for long routes
}
```

**Fallback Strategy:**
If Low Clearance API unavailable:
1. Use static bridge database (less accurate)
2. Flag route as "clearance unverified"
3. Recommend manual verification

---

### 3.4 Clerk Authentication

**Purpose:** User authentication and session management

**Setup:**
```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/api/loads(.*)',
  '/api/quotes(.*)',
  '/api/customers(.*)',
]);

export default clerkMiddleware((auth, req) => {
  if (isProtectedRoute(req)) auth().protect();
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

**User Metadata:**
```typescript
interface UserMetadata {
  role: 'admin' | 'user' | 'viewer';
  companyId?: string;
  settings: {
    defaultMileageRate: number;
    defaultFuelSurcharge: number;
    timezone: string;
  };
}
```

---

## 4. STATIC DATA MANAGEMENT

### 4.1 State Permits Database

**Location:** `src/data/state-permits.ts`

**Structure:**
```typescript
interface StatePermitData {
  stateCode: string;
  stateName: string;
  timezone: string;
  
  // Legal limits
  legalLimits: {
    maxWidth: number;
    maxHeight: number;
    maxLength: {
      single: number;
      combination: number;
    };
    maxWeight: {
      gross: number;
      perAxle: {
        single: number;
        tandem: number;
        tridem: number;
      };
    };
  };
  
  // Oversize permits
  oversizePermits: {
    singleTrip: {
      baseFee: number;
      dimensionSurcharges: {
        width: { threshold: number; fee: number }[];
        height: { threshold: number; fee: number }[];
        length: { threshold: number; fee: number }[];
      };
      processingTime: string;
      validity: string;
      onlineAvailable: boolean;
    };
    annual?: {
      baseFee: number;
      maxDimensions: {
        width: number;
        height: number;
        length: number;
      };
    };
  };
  
  // Overweight permits
  overweightPermits: {
    singleTrip: {
      baseFee: number;
      perMileFee?: number;
      tonMileFee?: number;
      weightBrackets?: {
        upTo: number;
        fee: number;
      }[];
    };
  };
  
  // Superload thresholds
  superloadThresholds: {
    width: number;
    height: number;
    length: number;
    weight: number;
    requiresRouteSurvey: boolean;
    requiresBridgeAnalysis: boolean;
  };
  
  // Escort requirements
  escortRules: {
    width: {
      oneEscort: number;
      twoEscorts: number;
      front: boolean;       // Escort position
      rear: boolean;
    };
    height: {
      poleCar: number;
    };
    length: {
      oneEscort: number;
      twoEscorts: number;
    };
    policeEscort?: {
      width: number;
      height: number;
      fee: number;
    };
  };
  
  // Travel restrictions
  travelRestrictions: {
    noNightTravel: boolean;
    nightDefinition?: string;  // e.g., "30 min before sunset to 30 min after sunrise"
    noWeekendTravel: boolean;
    weekendDefinition?: string;
    noHolidayTravel: boolean;
    holidays: string[];
    peakHourRestrictions?: string;
    schoolZoneRestrictions?: string;
    weatherRestrictions?: string;
  };
  
  // Contact info
  contact: {
    agency: string;
    phone: string;
    email?: string;
    website: string;
    permitPortal?: string;
  };
  
  // Notes
  notes: string[];
  lastUpdated: string;
}
```

**Sample State Data (Texas):**
```typescript
const TEXAS: StatePermitData = {
  stateCode: 'TX',
  stateName: 'Texas',
  timezone: 'America/Chicago',
  
  legalLimits: {
    maxWidth: 8.5,
    maxHeight: 14.0,
    maxLength: {
      single: 45,
      combination: 65,
    },
    maxWeight: {
      gross: 80000,
      perAxle: {
        single: 20000,
        tandem: 34000,
        tridem: 42000,
      },
    },
  },
  
  oversizePermits: {
    singleTrip: {
      baseFee: 60,
      dimensionSurcharges: {
        width: [
          { threshold: 12, fee: 30 },
          { threshold: 14, fee: 60 },
          { threshold: 16, fee: 120 },
        ],
        height: [
          { threshold: 15, fee: 30 },
          { threshold: 17, fee: 90 },
        ],
        length: [
          { threshold: 110, fee: 30 },
          { threshold: 125, fee: 60 },
        ],
      },
      processingTime: 'Immediate (online)',
      validity: '5 days',
      onlineAvailable: true,
    },
    annual: {
      baseFee: 1200,
      maxDimensions: {
        width: 14,
        height: 16,
        length: 110,
      },
    },
  },
  
  overweightPermits: {
    singleTrip: {
      baseFee: 75,
      perMileFee: 0,
      weightBrackets: [
        { upTo: 120000, fee: 75 },
        { upTo: 160000, fee: 150 },
        { upTo: 200000, fee: 225 },
      ],
    },
  },
  
  superloadThresholds: {
    width: 16,
    height: 18,
    length: 125,
    weight: 200000,
    requiresRouteSurvey: true,
    requiresBridgeAnalysis: true,
  },
  
  escortRules: {
    width: {
      oneEscort: 12,
      twoEscorts: 16,
      front: true,
      rear: true,
    },
    height: {
      poleCar: 17,
    },
    length: {
      oneEscort: 110,
      twoEscorts: 125,
    },
    policeEscort: {
      width: 18,
      height: 18,
      fee: 350,
    },
  },
  
  travelRestrictions: {
    noNightTravel: true,
    nightDefinition: '30 minutes before sunset to 30 minutes after sunrise',
    noWeekendTravel: false,
    noHolidayTravel: true,
    holidays: ['New Years Day', 'Memorial Day', 'Independence Day', 'Labor Day', 'Thanksgiving', 'Christmas'],
  },
  
  contact: {
    agency: 'Texas Department of Motor Vehicles',
    phone: '1-800-299-1700',
    email: 'MCD_Permits@txdmv.gov',
    website: 'https://www.txdmv.gov/motor-carriers/oversize-overweight-permits',
    permitPortal: 'https://www.txpros.txdmv.gov/',
  },
  
  notes: [
    'Texas allows 14ft height on designated routes without permit',
    'Manufactured housing has separate permit requirements',
    'Oil field equipment may have special permits',
  ],
  lastUpdated: '2024-12-01',
};
```

---

## 5. CACHING STRATEGY

### 5.1 What to Cache

| Data Type | Cache Duration | Storage |
|-----------|----------------|---------|
| State permit data | 24 hours | Memory/Redis |
| Truck specifications | Indefinite | Memory |
| Geocoded addresses | 7 days | Database |
| Route calculations | 1 hour | Memory |
| Clearance checks | 1 hour | Memory |
| AI parsing results | None | Don't cache |

### 5.2 Implementation

```typescript
// src/lib/cache.ts

// Simple in-memory cache for Phase 1-3
const cache = new Map<string, { data: any; expiresAt: number }>();

export function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

export function setCache<T>(key: string, data: T, ttlSeconds: number): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

// Usage
const cacheKey = `route:${origin.lat},${origin.lon}:${dest.lat},${dest.lon}`;
let route = getCached<RouteResult>(cacheKey);
if (!route) {
  route = await calculateRoute(origin, dest);
  setCache(cacheKey, route, 3600); // 1 hour
}
```

---

## 6. ERROR HANDLING STRATEGY

### 6.1 Error Types

```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class ParseError extends AppError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'PARSE_ERROR', 422, details);
    this.name = 'ParseError';
  }
}

export class ExternalAPIError extends AppError {
  constructor(service: string, message: string, details?: Record<string, any>) {
    super(`${service}: ${message}`, 'EXTERNAL_API_ERROR', 502, details);
    this.name = 'ExternalAPIError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}
```

### 6.2 API Error Responses

```typescript
// src/app/api/error-handler.ts

import { NextResponse } from 'next/server';
import { AppError } from '@/lib/errors';

export function handleAPIError(error: unknown): NextResponse {
  console.error('API Error:', error);
  
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }
  
  // Unknown error
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    },
    { status: 500 }
  );
}
```

---

*End of Part 2: Technical Architecture*
