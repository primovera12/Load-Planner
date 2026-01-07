# LOAD PLANNER - Updated Master Plan v2.0
## Incorporating Cargo-Planner Best Practices + Our Unique Advantages

---

## EXECUTIVE SUMMARY

This updated plan combines:
- **Our Core Differentiators**: AI email parsing, permit calculations, route planning, escort requirements, quote generation
- **Cargo-Planner Best Practices**: 3D visualization, Excel import, shareable links, multi-item optimization, equipment library

**Result**: The most comprehensive heavy haul planning tool on the market.

---

## REVISED FEATURE MATRIX

| Feature | Cargo-Planner | Load Planner v2 | Our Advantage |
|---------|---------------|-----------------|---------------|
| 3D Visualization | ✅ | ✅ | Trailer-focused (not containers) |
| Excel Import | ✅ | ✅ | + AI parsing option |
| Multi-item Optimization | ✅ | ✅ | + Height/permit awareness |
| Shareable Links | ✅ | ✅ | + Include permit details |
| Equipment Library | ✅ | ✅ | Heavy haul trailers |
| AI Email Parsing | ❌ | ✅ | **UNIQUE** |
| Permit Calculations | ❌ | ✅ | **UNIQUE** |
| Route Planning | ❌ | ✅ | **UNIQUE** |
| Escort Requirements | ❌ | ✅ | **UNIQUE** |
| Quote Generation | ❌ | ✅ | **UNIQUE** |
| State Regulations DB | ❌ | ✅ | **UNIQUE** |

---

## REVISED PHASE STRUCTURE

```
PHASE 1 (Week 1-2): Core Foundation
├── AI Email Parser
├── Truck Selector  
├── Basic UI
└── API Endpoint

PHASE 2 (Week 3-4): Routing & Permits
├── Route Planning (Geoapify)
├── State Detection
├── Permit Calculator
├── Escort Calculator
└── Route Map UI

PHASE 3 (Week 5-6): 3D & Visualization ← NEW
├── 3D Trailer Renderer
├── Cargo Placement View
├── Interactive Controls
├── Height/Weight Indicators
└── Screenshot Export

PHASE 4 (Week 7-8): Multi-Item & Import ← NEW
├── Excel/CSV Import
├── Multi-Item Load Optimizer
├── Stacking Algorithm
├── Center of Gravity
└── Loading Instructions

PHASE 5 (Week 9-10): Business Operations
├── Database (PostgreSQL)
├── Customer Management
├── Quote Generator
├── PDF Generation (Branded)
└── Authentication (Clerk)

PHASE 6 (Week 11-12): Sharing & Collaboration ← NEW
├── Shareable Links
├── Permission Controls
├── Public Load Plans
├── QR Codes
└── Embed Widget

PHASE 7 (Week 13+): Enterprise & API
├── REST API
├── Webhooks
├── SDK/Embed
├── White Label
└── Team Management
```

---

## PHASE 1: CORE FOUNDATION (Week 1-2)
*No changes from original - this is our unique foundation*

### 1.1 Deliverables
- AI email parser (Gemini)
- Truck selection algorithm
- Simple analyzer UI
- `/api/analyze` endpoint

### 1.2 Success Criteria
- Parse 90%+ of email formats
- Correct truck recommendations
- Response time < 3 seconds

---

## PHASE 2: ROUTING & PERMITS (Week 3-4)
*No changes from original - this is our unique advantage*

### 2.1 Deliverables
- Geoapify route integration
- State boundary detection
- Permit cost calculator (50 states)
- Escort requirements calculator
- Interactive route map

### 2.2 Success Criteria
- Accurate state-by-state costs
- Route visualization with states
- Escort triggers correctly identified

---

## PHASE 3: 3D VISUALIZATION (Week 5-6) ← NEW PHASE

### 3.1 Overview
Add interactive 3D visualization of cargo on trailers, inspired by Cargo-Planner but tailored for heavy haul.

### 3.2 Technical Stack
```
@react-three/fiber    - React renderer for Three.js
@react-three/drei     - Useful helpers (OrbitControls, etc.)
three                 - Core 3D library
```

### 3.3 Components to Build

#### 3.3.1 TrailerModel Component
```typescript
// src/components/3d/TrailerModel.tsx

interface TrailerModelProps {
  type: 'flatbed' | 'step_deck' | 'rgn' | 'lowboy' | 'double_drop';
  dimensions: {
    length: number;
    width: number;
    deckHeight: number;
    wellLength?: number;
    wellHeight?: number;
  };
  showDimensions?: boolean;
  color?: string;
}

// Renders accurate 3D model of each trailer type:
// - Flatbed: Simple flat platform
// - Step Deck: Two-level deck with step
// - RGN: Low well with detachable gooseneck
// - Lowboy: Very low center section
// - Double Drop: Front deck, low well, rear deck
```

#### 3.3.2 CargoModel Component
```typescript
// src/components/3d/CargoModel.tsx

interface CargoModelProps {
  items: {
    id: string;
    description: string;
    length: number;
    width: number;
    height: number;
    weight: number;
    position: { x: number; y: number; z: number };
    color?: string;
  }[];
  showLabels?: boolean;
  showWeights?: boolean;
}

// Renders cargo items as 3D boxes with:
// - Labels on faces
// - Color coding by status
// - Weight indicators
```

#### 3.3.3 LegalLimitsOverlay Component
```typescript
// src/components/3d/LegalLimitsOverlay.tsx

interface LegalLimitsOverlayProps {
  maxHeight: number;      // 13.5 ft
  maxWidth: number;       // 8.5 ft
  currentHeight: number;
  currentWidth: number;
}

// Shows:
// - Red plane at 13.5' height limit
// - Yellow warning zone (13' - 13.5')
// - Green zone (under 13')
// - Width boundary lines
```

#### 3.3.4 LoadVisualization (Main Component)
```typescript
// src/components/3d/LoadVisualization.tsx

interface LoadVisualizationProps {
  trailer: TruckType;
  cargo: CargoItem[];
  placements?: PlacedItem[];
  viewMode: 'perspective' | 'front' | 'side' | 'top';
  showLegalLimits: boolean;
  showCenterOfGravity: boolean;
  onScreenshot?: () => void;
}

export function LoadVisualization({ ... }) {
  return (
    <Canvas camera={{ position: [30, 20, 30], fov: 50 }}>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      
      {/* Ground Grid */}
      <Grid args={[100, 100]} />
      
      {/* Trailer */}
      <TrailerModel type={trailer.category} dimensions={trailer.deckSpecs} />
      
      {/* Cargo Items */}
      <CargoModel items={cargo} showLabels />
      
      {/* Legal Limits */}
      {showLegalLimits && (
        <LegalLimitsOverlay maxHeight={13.5} maxWidth={8.5} />
      )}
      
      {/* Center of Gravity Indicator */}
      {showCenterOfGravity && (
        <CenterOfGravityMarker position={cog} />
      )}
      
      {/* Controls */}
      <OrbitControls enablePan enableZoom enableRotate />
    </Canvas>
  );
}
```

### 3.4 UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  LOAD VISUALIZATION                                     [⚙️]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │                    ┌─────────────────┐                    │ │
│  │          ─────────►│   EXCAVATOR    │◄─────────          │ │
│  │                    │   32'x10'x10.5' │                    │ │
│  │                    │   52,000 lbs    │                    │ │
│  │                    └─────────────────┘                    │ │
│  │     ══════════════════════════════════════════════        │ │
│  │     ║              RGN TRAILER                  ║        │ │
│  │     ║              48' x 8.5'                   ║        │ │
│  │     ══════════════════════════════════════════════        │ │
│  │                                                           │ │
│  │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ 13.5' ─  │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  VIEW: [3D] [Front] [Side] [Top]     [📷 Screenshot] [↗ Share] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ✅ Height: 12.5 ft (1.0 ft margin)                      │   │
│  │ ⚠️ Width: 10 ft (PERMIT REQUIRED)                       │   │
│  │ ✅ Weight: 72,000 lbs (8,000 lbs margin)                │   │
│  │ ✅ Center of Gravity: Centered                          │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Files to Create

```
src/
├── components/
│   └── 3d/
│       ├── LoadVisualization.tsx      # Main container
│       ├── TrailerModel.tsx           # Trailer 3D models
│       ├── CargoModel.tsx             # Cargo box rendering
│       ├── LegalLimitsOverlay.tsx     # Height/width limits
│       ├── CenterOfGravityMarker.tsx  # CoG indicator
│       ├── Grid.tsx                   # Ground grid
│       └── ViewControls.tsx           # Camera presets
├── lib/
│   └── 3d/
│       ├── trailer-geometries.ts      # Trailer mesh definitions
│       ├── materials.ts               # Colors and textures
│       └── camera-presets.ts          # View angles
```

### 3.6 Success Criteria
- [ ] All 5 trailer types render accurately
- [ ] Cargo items display with labels
- [ ] 13.5' height limit line visible
- [ ] Orbit/zoom/pan controls work
- [ ] Screenshot export works
- [ ] Mobile touch controls work

---

## PHASE 4: MULTI-ITEM & IMPORT (Week 7-8) ← NEW PHASE

### 4.1 Overview
Add Excel import and multi-item load optimization, allowing users to plan loads with multiple pieces of equipment.

### 4.2 Excel Import System

#### 4.2.1 Supported Formats
- Excel (.xlsx, .xls)
- CSV (.csv)
- Tab-separated (.tsv)
- Copy/paste from clipboard

#### 4.2.2 Import Component
```typescript
// src/components/import/ExcelImport.tsx

interface ExcelImportProps {
  onImport: (items: CargoItem[]) => void;
  onError: (errors: ImportError[]) => void;
}

interface ColumnMapping {
  description: string;   // "A" or "Name"
  length: string;        // "B" or "Length"
  width: string;         // "C" or "Width"
  height: string;        // "D" or "Height"
  weight: string;        // "E" or "Weight"
  quantity?: string;     // Optional
}

interface ImportSettings {
  lengthUnit: 'ft' | 'in' | 'm' | 'cm';
  weightUnit: 'lbs' | 'kg' | 'tons';
  hasHeaderRow: boolean;
  skipEmptyRows: boolean;
}
```

#### 4.2.3 Import UI

```
┌─────────────────────────────────────────────────────────────────┐
│                      IMPORT CARGO DATA                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │     📄 Drop Excel/CSV file here or click to browse     │   │
│  │                                                         │   │
│  │     ─────────── or paste from clipboard ───────────    │   │
│  │                                                         │   │
│  │     [Ctrl+V to paste]                                   │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ☑ First row contains headers                                  │
│                                                                 │
│  COLUMN MAPPING                                                 │
│  ┌──────────┬───────────────┬────────────┐                     │
│  │ Column   │ Maps To       │ Unit       │                     │
│  ├──────────┼───────────────┼────────────┤                     │
│  │ A: Item  │ [Description▼]│ -          │                     │
│  │ B: L     │ [Length     ▼]│ [feet   ▼] │                     │
│  │ C: W     │ [Width      ▼]│ [feet   ▼] │                     │
│  │ D: H     │ [Height     ▼]│ [feet   ▼] │                     │
│  │ E: Wt    │ [Weight     ▼]│ [lbs    ▼] │                     │
│  │ F: Qty   │ [Quantity   ▼]│ -          │                     │
│  └──────────┴───────────────┴────────────┘                     │
│                                                                 │
│  [Save mapping as template: [_______________] [💾]]            │
│                                                                 │
│  PREVIEW                                                        │
│  ┌────────────────┬────────┬───────┬────────┬──────────┬───┐   │
│  │ Description    │ Length │ Width │ Height │ Weight   │Qty│   │
│  ├────────────────┼────────┼───────┼────────┼──────────┼───┤   │
│  │ Excavator      │ 32 ft  │ 10 ft │ 10.5 ft│ 52,000 lb│ 1 │✅│
│  │ Forklift       │ 8 ft   │ 4 ft  │ 7 ft   │ 9,000 lb │ 2 │✅│
│  │ Skid Steer     │ 10 ft  │ 6 ft  │ 6 ft   │ 8,500 lb │ 1 │✅│
│  │ Generator      │ ERROR  │ 5 ft  │ 4 ft   │ 3,000 lb │ 1 │⚠️│
│  └────────────────┴────────┴───────┴────────┴──────────┴───┘   │
│                                                                 │
│  ⚠️ 1 row has errors - fix or skip                             │
│                                                                 │
│  [Cancel]                    [Skip Errors] [Import 4 Items]     │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Multi-Item Load Optimizer

#### 4.3.1 Algorithm Overview
```typescript
// src/lib/calculations/load-optimizer.ts

interface LoadOptimizerInput {
  items: CargoItem[];
  availableTrailers: TruckType[];
  constraints: {
    maxOverallHeight: number;      // 13.5' default
    maxWidth: number;              // 8.5' default
    preferSingleTruck: boolean;
    allowPermits: boolean;
    maxGrossWeight: number;
  };
  preferences: {
    minimizeTrucks: boolean;       // Fewer trucks = better
    minimizeCost: boolean;         // Cheaper trailers preferred
    prioritizeSpeed: boolean;      // Don't over-optimize
  };
}

interface LoadPlan {
  trucks: TruckLoadPlan[];
  summary: {
    totalTrucks: number;
    totalWeight: number;
    utilizationPercent: number;
    permitsRequired: PermitRequirement[];
    estimatedCost: number;
  };
  unplacedItems: CargoItem[];
  warnings: string[];
}

interface TruckLoadPlan {
  truck: TruckType;
  items: PlacedItem[];
  loadingOrder: number[];         // Order to load items
  metrics: {
    weightUtilization: number;
    lengthUtilization: number;
    heightUtilization: number;
    centerOfGravity: { x: number; y: number };
    isLegal: boolean;
    permitsNeeded: string[];
  };
}
```

#### 4.3.2 Optimization Steps
```
1. ANALYZE ITEMS
   - Calculate total volume/weight
   - Identify controlling item (tallest, heaviest, longest)
   - Flag items requiring special handling

2. SELECT TRAILER TYPE
   - Based on tallest item, choose minimum deck height
   - Flatbed (5') → Step Deck (3.5') → RGN (2') → Lowboy (1.5')
   
3. FIT ITEMS
   - Sort by: controlling dimension (height for tall loads, weight for heavy)
   - Place largest/heaviest first
   - Try to fit all on one truck
   - If not, overflow to second truck

4. OPTIMIZE PLACEMENT
   - Center heavy items over axles
   - Distribute weight evenly left-right
   - Calculate center of gravity
   - Adjust for safe loading

5. GENERATE LOADING ORDER
   - Last on = first off (if multiple destinations)
   - Or: heaviest first for stability

6. CHECK LEGAL LIMITS
   - Overall height (cargo + deck)
   - Overall width
   - Gross weight
   - Flag permit requirements
```

#### 4.3.3 Multi-Item UI

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-ITEM LOAD PLANNER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CARGO ITEMS (5)                      LOAD PLAN                 │
│  ┌─────────────────────────┐          ┌─────────────────────┐  │
│  │ ☑ Excavator             │          │ TRUCK 1: Step Deck  │  │
│  │   32' x 10' x 10.5'     │          │ ┌─────────────────┐ │  │
│  │   52,000 lbs            │          │ │ ┌───┐ ┌───────┐ │ │  │
│  │   🚛 Needs own truck    │          │ │ │ F │ │  SS   │ │ │  │
│  ├─────────────────────────┤          │ │ │ F │ │       │ │ │  │
│  │ ☑ Forklift (x2)         │          │ │ └───┘ └───────┘ │ │  │
│  │   8' x 4' x 7'          │          │ │       ┌───┐     │ │  │
│  │   9,000 lbs each        │          │ │       │ ME│     │ │  │
│  │   ✅ Fits on Truck 1    │          │ │       └───┘     │ │  │
│  ├─────────────────────────┤          │ └─────────────────┘ │  │
│  │ ☑ Skid Steer            │          │ Weight: 35,500 lbs  │  │
│  │   10' x 6' x 6'         │          │ Length: 33' / 48'   │  │
│  │   8,500 lbs             │          │ Legal: ✅           │  │
│  │   ✅ Fits on Truck 1    │          └─────────────────────┘  │
│  ├─────────────────────────┤                                    │
│  │ ☑ Mini Excavator        │          ┌─────────────────────┐  │
│  │   15' x 7' x 8'         │          │ TRUCK 2: RGN        │  │
│  │   12,000 lbs            │          │ ┌─────────────────┐ │  │
│  │   ✅ Fits on Truck 1    │          │ │ ┌─────────────┐ │ │  │
│  └─────────────────────────┘          │ │ │  EXCAVATOR  │ │ │  │
│                                        │ │ │  32'x10'    │ │ │  │
│  [+ Add Item] [📄 Import]             │ │ └─────────────┘ │ │  │
│                                        │ └─────────────────┘ │  │
│  ─────────────────────────            │ Weight: 52,000 lbs  │  │
│                                        │ Width: 10' ⚠️ PERMIT│  │
│  SUMMARY                              └─────────────────────┘  │
│  • 2 trucks required                                           │
│  • Total weight: 87,500 lbs                                    │
│  • Permits needed: Oversize (Truck 2)                          │
│                                                                 │
│  [Optimize] [View 3D] [Generate Quote]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Center of Gravity Calculator

```typescript
// src/lib/calculations/center-of-gravity.ts

interface CenterOfGravityResult {
  x: number;              // Distance from front (ft)
  y: number;              // Distance from left (ft)
  z: number;              // Height from deck (ft)
  isBalanced: boolean;
  warnings: string[];
  adjustments: {
    description: string;
    severity: 'info' | 'warning' | 'critical';
  }[];
}

function calculateCenterOfGravity(
  items: PlacedItem[],
  trailer: TruckType
): CenterOfGravityResult {
  // Calculate weighted center
  let totalMomentX = 0;
  let totalMomentY = 0;
  let totalWeight = 0;

  for (const item of items) {
    const cx = item.position.x + item.length / 2;
    const cy = item.position.y + item.width / 2;
    totalMomentX += cx * item.weight;
    totalMomentY += cy * item.weight;
    totalWeight += item.weight;
  }

  const cogX = totalMomentX / totalWeight;
  const cogY = totalMomentY / totalWeight;

  // Check balance
  const warnings: string[] = [];
  const idealX = trailer.deckLength * 0.45; // Slightly forward
  const idealY = trailer.deckWidth / 2;     // Centered

  if (cogX < trailer.deckLength * 0.35) {
    warnings.push('Load is front-heavy - may affect steering');
  }
  if (cogX > trailer.deckLength * 0.55) {
    warnings.push('Load is rear-heavy - may affect braking');
  }
  if (Math.abs(cogY - idealY) > trailer.deckWidth * 0.1) {
    warnings.push('Load is off-center - may affect stability');
  }

  return {
    x: cogX,
    y: cogY,
    z: 0,
    isBalanced: warnings.length === 0,
    warnings,
    adjustments: []
  };
}
```

### 4.5 Loading Instructions Generator

```typescript
// src/lib/calculations/loading-instructions.ts

interface LoadingStep {
  stepNumber: number;
  item: CargoItem;
  action: 'load' | 'secure' | 'adjust';
  position: {
    description: string;      // "Center of deck, 5ft from front"
    x: number;
    y: number;
  };
  securement: {
    method: string;           // "4 chains, grade 70"
    tiedownCount: number;
    notes: string[];
  };
  equipment: string[];        // ["Crane", "Spreader bar"]
  warnings: string[];
  image?: string;             // 3D view from this angle
}

function generateLoadingInstructions(
  plan: TruckLoadPlan
): LoadingStep[] {
  // Generate step-by-step instructions
  // Include 3D preview at each step
  // Note securement requirements
  // Flag special handling needs
}
```

### 4.6 Files to Create

```
src/
├── components/
│   ├── import/
│   │   ├── ExcelImport.tsx           # Main import component
│   │   ├── ColumnMapper.tsx          # Column mapping UI
│   │   ├── ImportPreview.tsx         # Preview table
│   │   ├── DropZone.tsx              # Drag & drop area
│   │   └── ClipboardPaste.tsx        # Paste handler
│   └── load-planner/
│       ├── MultiItemPlanner.tsx      # Main multi-item UI
│       ├── ItemList.tsx              # Cargo item list
│       ├── TruckAssignments.tsx      # Truck load cards
│       ├── LoadingSummary.tsx        # Summary panel
│       └── LoadingInstructions.tsx   # Step-by-step view
├── lib/
│   ├── import/
│   │   ├── excel-parser.ts           # Parse Excel files
│   │   ├── csv-parser.ts             # Parse CSV files
│   │   └── clipboard-parser.ts       # Parse pasted data
│   └── calculations/
│       ├── load-optimizer.ts         # Multi-item algorithm
│       ├── center-of-gravity.ts      # CoG calculation
│       └── loading-instructions.ts   # Step generator
```

### 4.7 Success Criteria
- [ ] Import Excel with 100+ items in < 5 seconds
- [ ] Correctly map common column names automatically
- [ ] Optimize load across multiple trucks
- [ ] Calculate accurate center of gravity
- [ ] Generate printable loading instructions
- [ ] 3D view updates as items are assigned

---

## PHASE 5: BUSINESS OPERATIONS (Week 9-10)
*Enhanced from original to include branded exports*

### 5.1 Deliverables
- PostgreSQL database with Prisma
- Customer management (CRUD)
- Load management (CRUD)
- Quote generator with line items
- **Branded PDF generation** ← Enhanced
- Clerk authentication

### 5.2 Branded PDF System

```typescript
// src/lib/pdf/branded-quote.tsx

interface BrandingSettings {
  logo: string;               // URL or base64
  companyName: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  primaryColor: string;       // Hex color
  accentColor: string;
  tagline?: string;
  footer?: string;
  includeTerms: boolean;
  termsText?: string;
}

interface QuotePDFOptions {
  branding: BrandingSettings;
  includeLoadPlan: boolean;
  include3DImage: boolean;
  includeLoadingInstructions: boolean;
  includePermitBreakdown: boolean;
  includeEscortDetails: boolean;
  includeRouteMap: boolean;
}
```

**PDF Layout:**

```
┌─────────────────────────────────────────────────────────────────┐
│  [LOGO]           ABC HEAVY HAUL                 QUOTE #Q-2024-001│
│                   123 Trucking Lane              Date: Jan 15, 2024│
│                   Houston, TX 77001              Valid: 30 days   │
│                   (713) 555-1234                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CUSTOMER                           LOAD DETAILS                │
│  John Smith                         CAT 320 Excavator           │
│  XYZ Construction                   32' x 10' x 10.5'           │
│  Dallas, TX                         52,000 lbs                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ROUTE: Houston, TX → Dallas, TX                                │
│  Distance: 243 miles | States: TX                               │
│  Truck: RGN 48' (2' deck height)                               │
│                                                                 │
│  [3D LOAD VISUALIZATION IMAGE]                                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRICING                                                        │
│  ─────────────────────────────────────────────────────────     │
│  Line Haul (243 mi @ $4.50/mi)                      $1,093.50  │
│  Fuel Surcharge (18%)                                 $196.83  │
│  TX Oversize Permit                                    $90.00  │
│  Lead Car Escort (243 mi)                             $425.25  │
│  ─────────────────────────────────────────────────────────     │
│  TOTAL                                              $1,805.58  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Terms and conditions text...]                                 │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│  "Moving Heavy Equipment Since 1985"                           │
│  www.abcheavyhaul.com                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## PHASE 6: SHARING & COLLABORATION (Week 11-12) ← NEW PHASE

### 6.1 Overview
Enable sharing load plans with customers, drivers, and team members.

### 6.2 Shareable Links System

#### 6.2.1 Database Schema Addition
```prisma
model SharedLink {
  id            String       @id @default(cuid())
  loadPlanId    String
  loadPlan      LoadPlan     @relation(fields: [loadPlanId], references: [id])
  
  token         String       @unique @default(cuid())
  
  permissions   Permission   @default(VIEW)
  expiresAt     DateTime?
  password      String?      // Optional password protection
  
  viewCount     Int          @default(0)
  lastViewedAt  DateTime?
  
  createdAt     DateTime     @default(now())
  createdById   String
  createdBy     User         @relation(fields: [createdById], references: [id])
}

enum Permission {
  VIEW          // Can only view
  COMMENT       // Can view and add comments
  EDIT          // Can modify the plan
  FULL          // Can share with others
}
```

#### 6.2.2 Share UI Component

```
┌─────────────────────────────────────────────────────────────────┐
│                      SHARE LOAD PLAN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔗 SHAREABLE LINK                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://loadplanner.app/s/abc123xyz789                  │   │
│  │                                     [📋 Copy] [📱 QR]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  SETTINGS                                                       │
│                                                                 │
│  Permission Level:                                              │
│  ○ View only - Can see the load plan                           │
│  ○ Can comment - Can view and add notes                        │
│  ● Can edit - Can modify placements                            │
│                                                                 │
│  Link Expiration:                                               │
│  ○ Never expires                                               │
│  ● Expires in: [7 days ▼]                                      │
│  ○ Custom date: [________]                                     │
│                                                                 │
│  Security:                                                      │
│  ☐ Require password: [____________]                            │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  QUICK SHARE                                                    │
│  [📧 Email]  [💬 SMS]  [📱 WhatsApp]  [🔗 Copy Link]           │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  EMBED CODE (for your website)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ <iframe src="https://loadplanner.app/embed/abc123"      │   │
│  │   width="800" height="600"></iframe>                    │   │
│  │                                            [📋 Copy]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]                                    [Create Link]      │
└─────────────────────────────────────────────────────────────────┘
```

#### 6.2.3 Public View Page
```typescript
// src/app/s/[token]/page.tsx

// Public page that shows:
// - 3D visualization (interactive)
// - Load details
// - Permit requirements
// - Quote (if included)
// - Comments (if enabled)
// - "Powered by Load Planner" footer
```

#### 6.2.4 QR Code Generation
```typescript
// Generate QR code for easy mobile sharing
import QRCode from 'qrcode';

async function generateQR(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    width: 200,
    margin: 2,
    color: { dark: '#000', light: '#fff' }
  });
}
```

### 6.3 Files to Create

```
src/
├── app/
│   ├── s/
│   │   └── [token]/
│   │       └── page.tsx              # Public shared view
│   └── embed/
│       └── [token]/
│           └── page.tsx              # Embeddable widget
├── components/
│   └── sharing/
│       ├── ShareDialog.tsx           # Share modal
│       ├── QRCodeDisplay.tsx         # QR code viewer
│       ├── EmbedCodeGenerator.tsx    # Embed code
│       └── SharePermissions.tsx      # Permission selector
├── lib/
│   └── sharing/
│       ├── create-share-link.ts      # Generate links
│       ├── validate-access.ts        # Check permissions
│       └── track-views.ts            # Analytics
```

### 6.4 Success Criteria
- [ ] Generate shareable links
- [ ] Public view works without login
- [ ] QR code generation works
- [ ] Embed widget renders correctly
- [ ] Password protection works
- [ ] Link expiration enforced

---

## PHASE 7: ENTERPRISE & API (Week 13+)
*Enhanced from original*

### 7.1 REST API

```typescript
// API Endpoints

// Load Plans
POST   /api/v1/loads/analyze          // AI email parsing
POST   /api/v1/loads/create           // Create load plan
GET    /api/v1/loads/:id              // Get load plan
PUT    /api/v1/loads/:id              // Update load plan
DELETE /api/v1/loads/:id              // Delete load plan

// Multi-Item
POST   /api/v1/loads/optimize         // Optimize multiple items
POST   /api/v1/loads/import           // Import from Excel/CSV

// Quotes
POST   /api/v1/quotes/generate        // Generate quote
GET    /api/v1/quotes/:id             // Get quote
GET    /api/v1/quotes/:id/pdf         // Download PDF

// Routes
POST   /api/v1/routes/calculate       // Calculate route
GET    /api/v1/routes/:id/permits     // Get permit costs

// Equipment
GET    /api/v1/equipment/trucks       // List truck types
GET    /api/v1/equipment/trucks/:id   // Get truck details
POST   /api/v1/equipment/custom       // Create custom equipment

// Sharing
POST   /api/v1/share                  // Create share link
GET    /api/v1/share/:token           // Get shared content
```

### 7.2 Webhook Events

```typescript
// Webhook events customers can subscribe to

interface WebhookEvent {
  event: WebhookEventType;
  timestamp: string;
  data: any;
}

type WebhookEventType =
  | 'load.created'
  | 'load.updated'
  | 'load.optimized'
  | 'quote.generated'
  | 'quote.accepted'
  | 'quote.declined'
  | 'share.viewed'
  | 'share.downloaded';
```

### 7.3 SDK/Embed Options

```typescript
// JavaScript SDK for embedding

// Option 1: Full widget embed
LoadPlanner.embed('#container', {
  apiKey: 'your-api-key',
  mode: 'full',           // Full planner interface
  theme: 'light',
  branding: false         // White label
});

// Option 2: 3D viewer only
LoadPlanner.viewer('#container', {
  apiKey: 'your-api-key',
  loadPlanId: 'abc123',
  interactive: true
});

// Option 3: Quote widget
LoadPlanner.quote('#container', {
  apiKey: 'your-api-key',
  style: 'compact'
});
```

---

## COMPLETE FILE STRUCTURE (All Phases)

```
load-planner/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── loads/
│   │   │   │   ├── page.tsx              # Load list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx          # New load (analyzer)
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx          # Load detail
│   │   │   ├── quotes/
│   │   │   ├── customers/
│   │   │   ├── routes/
│   │   │   ├── planner/                  # Multi-item planner
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── analyze/
│   │   │   ├── loads/
│   │   │   ├── quotes/
│   │   │   ├── routes/
│   │   │   ├── optimize/                 # Multi-item
│   │   │   ├── import/                   # Excel import
│   │   │   ├── share/                    # Sharing
│   │   │   └── v1/                       # Public API
│   │   ├── s/[token]/                    # Shared view
│   │   ├── embed/[token]/                # Embed widget
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/                           # shadcn/ui
│   │   ├── 3d/                           # 3D visualization
│   │   │   ├── LoadVisualization.tsx
│   │   │   ├── TrailerModel.tsx
│   │   │   ├── CargoModel.tsx
│   │   │   └── ...
│   │   ├── import/                       # Excel import
│   │   │   ├── ExcelImport.tsx
│   │   │   ├── ColumnMapper.tsx
│   │   │   └── ...
│   │   ├── load-planner/                 # Multi-item
│   │   │   ├── MultiItemPlanner.tsx
│   │   │   ├── ItemList.tsx
│   │   │   └── ...
│   │   ├── sharing/                      # Share features
│   │   │   ├── ShareDialog.tsx
│   │   │   └── ...
│   │   ├── maps/
│   │   ├── forms/
│   │   └── pdf/
│   ├── lib/
│   │   ├── db.ts
│   │   ├── gemini.ts
│   │   ├── geoapify.ts
│   │   ├── calculations/
│   │   │   ├── truck-selector.ts
│   │   │   ├── permit-calculator.ts
│   │   │   ├── escort-calculator.ts
│   │   │   ├── load-optimizer.ts         # Multi-item
│   │   │   ├── center-of-gravity.ts
│   │   │   └── loading-instructions.ts
│   │   ├── import/
│   │   │   ├── excel-parser.ts
│   │   │   └── csv-parser.ts
│   │   ├── 3d/
│   │   │   ├── trailer-geometries.ts
│   │   │   └── materials.ts
│   │   ├── sharing/
│   │   │   └── share-links.ts
│   │   └── pdf/
│   │       └── branded-quote.ts
│   ├── hooks/
│   ├── types/
│   └── data/
│       ├── trucks.ts
│       ├── state-permits.ts
│       └── escort-rules.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   └── models/                           # 3D model assets
└── package.json
```

---

## REVISED TIMELINE

| Phase | Weeks | Focus | Key Deliverables |
|-------|-------|-------|------------------|
| 1 | 1-2 | Core | AI parsing, truck selection, basic UI |
| 2 | 3-4 | Routes | Routing, permits, escorts, map |
| 3 | 5-6 | 3D | Interactive visualization |
| 4 | 7-8 | Multi-Item | Excel import, optimization |
| 5 | 9-10 | Business | Database, quotes, branded PDF |
| 6 | 11-12 | Sharing | Links, embed, QR codes |
| 7 | 13+ | Enterprise | API, webhooks, white label |

**Total MVP (Phases 1-5):** 10 weeks
**Full Product (All Phases):** 13+ weeks

---

## COMPETITIVE POSITIONING SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│                    LOAD PLANNER vs CARGO-PLANNER                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CARGO-PLANNER                    LOAD PLANNER                  │
│  ─────────────────────           ─────────────────────         │
│  ✓ 3D Visualization              ✓ 3D Visualization            │
│  ✓ Excel Import                  ✓ Excel Import                │
│  ✓ Multi-item Packing            ✓ Multi-item Packing          │
│  ✓ Shareable Links               ✓ Shareable Links             │
│  ✓ API Integration               ✓ API Integration             │
│                                                                 │
│  ✗ No AI email parsing           ✓ AI Email Parsing ★          │
│  ✗ No permit calculations        ✓ 50-State Permits ★          │
│  ✗ No route planning             ✓ Truck-Specific Routes ★     │
│  ✗ No escort requirements        ✓ Escort Calculator ★         │
│  ✗ No quote generation           ✓ Full Quote System ★         │
│  ✗ Container-focused             ✓ Heavy Haul Focused ★        │
│                                                                 │
│  Price: $59-99/mo                Price: $29-79/mo              │
│                                                                 │
│  ★ = Unique to Load Planner                                    │
└─────────────────────────────────────────────────────────────────┘
```

---

*Updated Master Plan v2.0 - January 2025*
