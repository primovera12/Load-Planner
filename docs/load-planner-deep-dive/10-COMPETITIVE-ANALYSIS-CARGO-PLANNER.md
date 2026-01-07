# LOAD PLANNER - Competitive Analysis: Cargo-Planner.com
## What We Can Learn & How to Build Better

---

## 1. CARGO-PLANNER OVERVIEW

**Company:** Törnblom Software AB (Sweden, est. 2015)
**Product:** Container/trailer 3D load optimization software
**Pricing:** Starting at $59/month
**Rating:** 4.8/5 on Capterra
**Major Clients:** DHL, Maersk, Air Canada, DSV, GEODIS, Airbus, Schneider

### What They Do Well

| Feature | Description | Rating |
|---------|-------------|--------|
| **3D Visualization** | Interactive 3D view of cargo inside containers | ⭐⭐⭐⭐⭐ |
| **Packing Algorithm** | Optimizes placement of multiple items | ⭐⭐⭐⭐⭐ |
| **Excel Import** | Copy/paste cargo lists instantly | ⭐⭐⭐⭐⭐ |
| **Equipment Library** | Pre-built containers, trailers, pallets | ⭐⭐⭐⭐ |
| **Sharing** | URL links, PDFs, branded exports | ⭐⭐⭐⭐⭐ |
| **Multi-language** | 12+ languages supported | ⭐⭐⭐⭐ |
| **API** | REST API for integrations | ⭐⭐⭐⭐ |

### What They DON'T Do (Our Opportunity)

| Gap | Load Planner Advantage |
|-----|------------------------|
| No AI email parsing | We parse unstructured emails automatically |
| No permit calculations | We calculate oversize/overweight permits |
| No routing integration | We plan truck-specific routes |
| No escort requirements | We determine escort needs by state |
| No state-by-state regulations | We have all 50 states' rules |
| No quote generation | We create complete cost quotes |
| No oversize/heavy haul focus | That's our specialty |

---

## 2. KEY FEATURES TO ADOPT

### 2.1 🎯 Interactive 3D Visualization (MUST HAVE)

**What They Have:**
- Walk around cargo in 3D
- Zoom, rotate, pan controls
- See cargo from inside the container
- Color-coded items
- Step-by-step loading instructions

**What We Should Build:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    3D LOAD VISUALIZATION                        │
│                                                                 │
│    ┌─────────────────────────────────────────────────────────┐ │
│    │                                                         │ │
│    │         ┌─────────────────────────────┐                │ │
│    │         │    ███████████████████      │                │ │
│    │         │    █  EXCAVATOR      █      │   🔄 Rotate    │ │
│    │         │    █  32' x 10' x 10'█      │   🔍 Zoom      │ │
│    │         │    █  52,000 lbs     █      │   ↔️ Pan       │ │
│    │         │    ███████████████████      │                │ │
│    │         │          │                  │                │ │
│    │     ════╧══════════╧══════════════════╧════            │ │
│    │                RGN TRAILER                              │ │
│    │              48' x 8.5' x 2'                            │ │
│    │                                                         │ │
│    └─────────────────────────────────────────────────────────┘ │
│                                                                 │
│    Overall Height: 12.5 ft  ✅ Under 13.5' limit               │
│    Gross Weight: 72,000 lbs ✅ Under 80,000 limit              │
│                                                                 │
│    [View from Front] [View from Side] [View from Top]          │
└─────────────────────────────────────────────────────────────────┘
```

**Implementation: Three.js or React-Three-Fiber**

```typescript
// 3D Trailer Visualization Component Concept
interface TrailerVisualizationProps {
  trailer: TruckType;
  cargo: CargoItem[];
  showDimensions: boolean;
  showWeightDistribution: boolean;
  viewAngle: 'front' | 'side' | 'top' | '3d';
}

// Features to include:
// - Accurate trailer mesh (flatbed, step deck, RGN, lowboy)
// - Cargo boxes with labels
// - Color coding: green (safe), yellow (warning), red (over limit)
// - Legal height line at 13.5'
// - Deck height visualization
// - Weight distribution indicator
// - Interactive controls (orbit, zoom, pan)
// - Screenshot/export capability
```

---

### 2.2 📊 Multi-Item Load Optimization (SHOULD HAVE)

**What They Have:**
- Load multiple items optimally
- Drag and drop between containers
- Automatic best-fit algorithm
- Stacking rules (stackable, non-stackable, bottom-only)

**What We Should Build:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-ITEM LOAD PLANNER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CARGO ITEMS                          LOAD PLAN                 │
│  ┌─────────────────────────┐          ┌─────────────────────┐  │
│  │ ☐ Forklift              │          │                     │  │
│  │   8' x 4' x 7'          │          │   ┌───┐ ┌───────┐   │  │
│  │   9,000 lbs             │   ───►   │   │ F │ │  ME   │   │  │
│  │   ✅ Fits on Truck 1    │          │   └───┘ └───────┘   │  │
│  ├─────────────────────────┤          │   ┌───────────────┐ │  │
│  │ ☐ Skid Steer            │          │   │     SS        │ │  │
│  │   10' x 6' x 6'         │          │   └───────────────┘ │  │
│  │   8,500 lbs             │          │                     │  │
│  │   ✅ Fits on Truck 1    │          │   Step Deck 48'     │  │
│  ├─────────────────────────┤          │   Total: 29,500 lbs │  │
│  │ ☐ Mini Excavator        │          │   Length: 33' used  │  │
│  │   15' x 7' x 8'         │          └─────────────────────┘  │
│  │   12,000 lbs            │                                    │
│  │   ✅ Fits on Truck 1    │          UTILIZATION              │
│  └─────────────────────────┘          ▓▓▓▓▓▓▓▓░░░ 69%         │
│                                                                 │
│  SUMMARY                                                        │
│  • All 3 items fit on 1 Step Deck                              │
│  • No permits required (all legal dimensions)                   │
│  • Recommended loading order: Mini Exc → Skid Steer → Forklift │
│                                                                 │
│  [Optimize Placement] [Add Item] [Generate Quote]              │
└─────────────────────────────────────────────────────────────────┘
```

**Algorithm:**
1. Sort items by size (largest first) or weight
2. Try to fit all on one truck
3. If not, recommend multiple trucks
4. Check stacking compatibility
5. Calculate center of gravity
6. Warn if weight distribution is off

---

### 2.3 📋 Excel/CSV Import (MUST HAVE)

**What They Have:**
- Paste from Excel
- Upload CSV files  
- Map columns to fields
- Bulk import thousands of items

**What We Should Build:**

```typescript
// Excel Import Interface
interface ExcelImportColumn {
  excelColumn: string;      // "A", "B", "C"
  mappedField: string;      // "length", "width", "weight"
  unit?: string;            // "ft", "in", "lbs"
}

// Expected Excel format:
// | Description | Length | Width | Height | Weight |
// | Excavator   | 32     | 10    | 10.5   | 52000  |
// | Forklift    | 8      | 4     | 7      | 9000   |

// Features:
// - Drag & drop Excel file
// - Copy/paste from spreadsheet
// - Auto-detect column headers
// - Unit conversion on import
// - Validation with error highlighting
// - Save column mapping as template
```

**UI Mockup:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    IMPORT CARGO DATA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │          📄 Drop Excel/CSV file here                   │   │
│  │              or click to browse                         │   │
│  │                                                         │   │
│  │          ─── or paste directly ───                     │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  COLUMN MAPPING                                                 │
│  ┌──────────────┬───────────────┬─────────────┐               │
│  │ Excel Column │ Maps To       │ Unit        │               │
│  ├──────────────┼───────────────┼─────────────┤               │
│  │ A: Name      │ Description   │ -           │               │
│  │ B: L         │ Length        │ [ft ▼]      │               │
│  │ C: W         │ Width         │ [ft ▼]      │               │
│  │ D: H         │ Height        │ [in ▼]      │               │
│  │ E: WT        │ Weight        │ [lbs ▼]     │               │
│  └──────────────┴───────────────┴─────────────┘               │
│                                                                 │
│  PREVIEW (5 of 12 items)                                        │
│  ┌──────────────┬────────┬───────┬────────┬──────────┐        │
│  │ Description  │ Length │ Width │ Height │ Weight   │        │
│  ├──────────────┼────────┼───────┼────────┼──────────┤        │
│  │ Excavator    │ 32 ft  │ 10 ft │ 10.5 ft│ 52,000 lb│  ✅   │
│  │ Forklift     │ 8 ft   │ 4 ft  │ 7 ft   │ 9,000 lb │  ✅   │
│  │ Skid Steer   │ 10 ft  │ 6 ft  │ 6 ft   │ 8,500 lb │  ✅   │
│  │ Generator    │ ??     │ 5 ft  │ 4 ft   │ 3,000 lb │  ⚠️   │
│  └──────────────┴────────┴───────┴────────┴──────────┘        │
│                                                                 │
│  ⚠️ 1 item has missing data (highlighted)                      │
│                                                                 │
│  [Cancel]                            [Import 12 Items]          │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.4 🔗 Shareable Links & PDFs (MUST HAVE)

**What They Have:**
- Generate shareable URL
- Permission controls (view only, edit)
- Branded PDF exports
- Step-by-step loading instructions
- Multiple export formats

**What We Should Build:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      SHARE LOAD PLAN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  🔗 SHAREABLE LINK                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ https://loadplanner.com/share/abc123xyz                 │   │
│  │                                          [Copy] [QR]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  PERMISSIONS                                                    │
│  ○ View only - recipient can see but not edit                  │
│  ○ Can comment - recipient can add notes                       │
│  ○ Can edit - recipient can modify the plan                    │
│                                                                 │
│  EXPIRES                                                        │
│  ○ Never  ○ 7 days  ○ 30 days  ○ Custom: [____]               │
│                                                                 │
│  ─────────────────────────────────────────────────────────     │
│                                                                 │
│  📄 EXPORT OPTIONS                                              │
│                                                                 │
│  [📋 Load Plan PDF]     - 3D view + dimensions + instructions  │
│  [💰 Quote PDF]         - Professional quote for customer      │
│  [📊 Excel Export]      - Raw data for analysis                │
│  [🖼️ 3D Image]          - PNG of 3D visualization             │
│                                                                 │
│  BRANDING                                                       │
│  ☑ Include my company logo                                     │
│  ☑ Include contact information                                 │
│  ☐ White label (remove Load Planner branding)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### 2.5 🏗️ Custom Equipment Builder (NICE TO HAVE)

**What They Have:**
- Create custom container dimensions
- Set axle positions
- Configure walls/openings
- Save to library

**What We Should Build:**

```
┌─────────────────────────────────────────────────────────────────┐
│                  CUSTOM TRAILER BUILDER                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  TRAILER TYPE: [Flatbed ▼]                                      │
│                                                                 │
│  DIMENSIONS                                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Deck Length:    [48    ] ft                            │   │
│  │  Deck Width:     [8.5   ] ft                            │   │
│  │  Deck Height:    [5.0   ] ft  (from ground)             │   │
│  │  Well Length:    [N/A   ] ft  (RGN/Lowboy only)         │   │
│  │  Well Height:    [N/A   ] ft                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  CAPACITY                                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Max Cargo Weight:  [48000 ] lbs                        │   │
│  │  Tare Weight:       [15000 ] lbs                        │   │
│  │  Axle Config:       [Tandem ▼]                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  FEATURES                                                       │
│  ☑ Ramp capable                                                │
│  ☑ Tie-down points                                             │
│  ☐ Winch                                                       │
│  ☐ Coil wells                                                  │
│                                                                 │
│  PREVIEW                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │          ════════════════════════════════════           │   │
│  │          │         48' FLATBED            │           │   │
│  │          │         5.0' deck height        │           │   │
│  │          ════════════════════════════════════           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Cancel]  [Save to My Equipment]  [Use for This Load]          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. OUR UNIQUE ADVANTAGES (Build On These)

### Features They DON'T Have That We Do/Will:

| Our Feature | Value Proposition |
|-------------|-------------------|
| **AI Email Parsing** | "Paste email, get instant analysis" - they require manual entry |
| **Permit Calculations** | Automatic cost calculations for all 50 states |
| **Route Planning** | Truck-specific routes with clearance checking |
| **Escort Requirements** | Know exactly when you need pilot cars |
| **Travel Restrictions** | Night/weekend/holiday rules by state |
| **Quote Generation** | Complete customer-ready quotes with permits |
| **Heavy Haul Focus** | Built for oversize, not just containers |

### Our Messaging:

```
Cargo-Planner: "How many boxes fit in this container?"
Load Planner:  "What truck do I need, what permits, and what's the cost?"
```

---

## 4. COMBINED FEATURE ROADMAP

### Priority Matrix

| Feature | Priority | Effort | From Cargo-Planner? |
|---------|----------|--------|---------------------|
| 3D Visualization | HIGH | HIGH | ✅ Yes |
| Excel Import | HIGH | MEDIUM | ✅ Yes |
| Shareable Links | HIGH | LOW | ✅ Yes |
| PDF Branding | MEDIUM | LOW | ✅ Yes |
| Multi-Item Optimization | MEDIUM | HIGH | ✅ Yes |
| Custom Equipment Builder | LOW | MEDIUM | ✅ Yes |
| API for Integrations | MEDIUM | MEDIUM | ✅ Yes |
| Weight Distribution View | MEDIUM | MEDIUM | ✅ Yes |

### Implementation Order

**Phase 1 (Current):** Core truck selection + AI parsing *(Our advantage)*

**Phase 2:** Add routing + permits *(Our advantage)*

**Phase 3:** Add 3D visualization *(Inspired by Cargo-Planner)*
- Three.js trailer renderer
- Interactive orbit controls
- Cargo placement view

**Phase 4:** Multi-item load planning *(Inspired by Cargo-Planner)*
- Load multiple items on one trailer
- Optimization algorithm
- Center of gravity calculation

**Phase 5:** Sharing & Export *(Inspired by Cargo-Planner)*
- Shareable links
- Branded PDFs
- Excel export

**Phase 6:** API & Integrations *(Inspired by Cargo-Planner)*
- REST API
- SDK for embedding
- Webhook support

---

## 5. TECHNICAL IMPLEMENTATION NOTES

### 3D Visualization Stack

```typescript
// Recommended: React-Three-Fiber (Three.js for React)
// Dependencies:
// - @react-three/fiber
// - @react-three/drei (helpers)
// - three (core library)

// Example component structure:
<Canvas>
  <Scene>
    <Trailer type="rgn" dimensions={trailerDims} />
    <Cargo items={cargoItems} placement={placements} />
    <HeightLimitLine height={13.5} />
    <Grid />
    <Lighting />
  </Scene>
  <OrbitControls />
</Canvas>
```

### Load Optimization Algorithm

```typescript
// Bin packing algorithm for multiple items
interface LoadOptimizationInput {
  items: CargoItem[];
  availableTrailers: TruckType[];
  constraints: {
    maxHeight: number;      // 13.5' legal
    maxWidth: number;       // 8.5' legal
    maxWeight: number;      // per trailer
    stackingRules: StackingRule[];
  };
}

interface LoadOptimizationResult {
  trucks: {
    trailer: TruckType;
    items: PlacedItem[];
    utilizationPercent: number;
    weightPercent: number;
    centerOfGravity: { x: number; y: number };
  }[];
  unplacedItems: CargoItem[];
  warnings: string[];
}

// Algorithm steps:
// 1. Sort items by controlling dimension (height or weight)
// 2. Try to fit all on smallest suitable trailer
// 3. If not, try next larger trailer
// 4. If still not, split across multiple trailers
// 5. Optimize placement for weight distribution
// 6. Generate loading order (heaviest/largest first)
```

---

## 6. PRICING COMPARISON

| Tier | Cargo-Planner | Load Planner (Proposed) |
|------|---------------|------------------------|
| Starter | $59/mo | $29/mo |
| Professional | $99/mo | $79/mo |
| Enterprise | Custom | $199/mo |
| API Access | Extra | Included in Pro+ |

**Our Advantage:** Lower price + more features for heavy haul

---

## 7. GO-TO-MARKET DIFFERENTIATION

### Cargo-Planner Positioning:
- "Container loading calculator"
- Sea freight, air freight, warehouses
- Volume optimization
- Enterprise focus (DHL, Maersk)

### Load Planner Positioning:
- "Oversize/heavy haul quote calculator"
- Heavy equipment, machinery transport
- Permit & escort automation
- Small-to-medium carrier focus

### Our Unique Value Props:
1. **AI-Powered** - Paste email, get results (they don't have this)
2. **Permit Calculator** - 50-state database (they don't have this)
3. **All-in-One Quote** - From email to customer quote (they don't have this)
4. **Heavy Haul Expertise** - Built for oversize, not containers

---

## 8. ACTION ITEMS

### Immediate (Phase 1-2):
- [x] Core email parsing *(our differentiator)*
- [x] Truck selection *(our differentiator)*
- [ ] Route planning *(our differentiator)*
- [ ] Permit calculations *(our differentiator)*

### Near-term (Phase 3-4):
- [ ] Add 3D visualization *(from Cargo-Planner)*
- [ ] Excel import/export *(from Cargo-Planner)*
- [ ] Shareable links *(from Cargo-Planner)*
- [ ] Multi-item load planning *(from Cargo-Planner)*

### Future (Phase 5+):
- [ ] API for integrations *(from Cargo-Planner)*
- [ ] White-label options *(from Cargo-Planner)*
- [ ] Mobile app *(from Cargo-Planner)*

---

## 9. SUMMARY

**Cargo-Planner is excellent at:**
- 3D visualization
- Multi-item packing optimization
- Enterprise integrations
- User experience polish

**We should adopt:**
- Interactive 3D trailer view
- Excel/CSV import
- Shareable links with permissions
- Professional PDF exports
- Load optimization for multiple items

**We beat them with:**
- AI email parsing (they require manual entry)
- Permit calculations (they don't do this)
- Route planning with clearances (they don't do this)
- Escort requirements (they don't do this)
- Complete quote generation (they don't do this)
- Heavy haul specialization (they're general-purpose)

**Bottom Line:** Take their best UX features, combine with our unique permit/routing capabilities, and we have a compelling product that serves a niche they don't address.

---

*Analysis completed: January 2025*
