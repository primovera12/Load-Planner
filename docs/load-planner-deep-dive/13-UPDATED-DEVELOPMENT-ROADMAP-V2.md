# LOAD PLANNER - Updated Development Roadmap v2.0
## Complete Task Breakdown with New Features

---

## TIMELINE OVERVIEW

```
Week  1   2   3   4   5   6   7   8   9  10  11  12  13+
      ├───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼───┼────►
      │ PHASE 1 │ PHASE 2 │ PHASE 3 │ PHASE 4 │ PHASE 5 │ P6 │ P7
      │  Core   │ Routing │   3D    │ Multi-  │Business │Share│API
      │ Parser  │ Permits │  View   │  Item   │  Ops    │    │
      │         │         │   NEW   │   NEW   │         │NEW │
```

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| 1 | Week 1-2 | AI Parser + Truck Selector | Ready to start |
| 2 | Week 3-4 | Routing + Permits | Planned |
| 3 | Week 5-6 | 3D Visualization | **NEW** |
| 4 | Week 7-8 | Multi-Item + Excel Import | **NEW** |
| 5 | Week 9-10 | Database + Quotes | Planned |
| 6 | Week 11-12 | Sharing + Collaboration | **NEW** |
| 7 | Week 13+ | API + Enterprise | Planned |

---

## PHASE 1: CORE FOUNDATION (Week 1-2)

### Week 1: Setup & Data

#### Task 1.1: Project Setup
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create a new Next.js 14 project called 'load-planner' with:
- TypeScript
- Tailwind CSS
- App Router
- src/ directory
- ESLint configured
- shadcn/ui initialized with these components: button, card, input, 
  textarea, select, tabs, dialog, toast
Include a basic layout with header and the project structure from the plan."
```

**Files Created:**
- `package.json`
- `tsconfig.json`
- `tailwind.config.ts`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/components/ui/*`

#### Task 1.2: Type Definitions
**Time:** 1 hour

```bash
# Claude Code Prompt:
"Create TypeScript type definitions for Load Planner in src/types/:
- trucks.ts: TruckType, TruckCategory, AxleConfiguration, LoadingMethod
- loads.ts: CargoItem, ParsedLoad, Dimension, Weight
- permits.ts: PermitRequirement, EscortRequirement
- recommendations.ts: TruckRecommendation, FitDetails

Use the specifications from the planning documents."
```

#### Task 1.3: Truck Database
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create the truck specifications database in src/data/trucks.ts with all
trailer types from the Truck Specifications document:
- Flatbed (48', 53', stretch)
- Step Deck (standard, with ramps, stretch)
- RGN (standard, 3-axle, stretch, wide)
- Lowboy (standard, fixed neck, 3-axle)
- Double Drop
- Landoll
- Conestoga

Include accurate deck heights (flatbed: 5.0', step deck: 3.5', RGN: 2.0', 
lowboy: 1.5'), weight capacities, and features. Export as typed array."
```

#### Task 1.4: Unit Converter
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create unit conversion utilities in src/lib/calculations/unit-converter.ts:

Functions needed:
- parseDimension(input: string): Dimension
  Handle: 10'6", 10.5 ft, 126", 3.2m, 320cm, 10-6, 10ft 6in
  
- parseWeight(input: string): Weight
  Handle: 45,000 lbs, 22.5 tons, 20 MT, 20000 kg, 45K
  
- convertToFeet(value: number, unit: string): number
- convertToPounds(value: number, unit: string): number
- formatDimension(feet: number): string
- formatWeight(pounds: number): string

Include comprehensive regex patterns and unit conversion tables."
```

### Week 2: AI Parser & Truck Selector

#### Task 1.5: Gemini Email Parser
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create the AI email parser in src/lib/parse-load.ts using Google Gemini API:

1. Install @google/generative-ai
2. Create parseLoadEmail(emailText: string): Promise<ParsedLoad>
3. Use gemini-1.5-flash model
4. Prompt should extract:
   - Items (description, quantity, length, width, height, weight)
   - Origin (address, city, state, zip)
   - Destination (address, city, state, zip)
   - Dates (pickup, delivery)
   - Customer info (name, email, phone)
   - Special notes

Return JSON with confidence score. Handle unit conversion.
Include retry logic and error handling."
```

#### Task 1.6: Truck Selector Algorithm
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create the truck selection algorithm in src/lib/calculations/truck-selector.ts:

CRITICAL: The height calculation is:
totalHeight = cargoHeight + trailerDeckHeight
Legal limit = 13.5 ft

Function: selectTruck(load: ParsedLoad): TruckRecommendation[]

Algorithm:
1. Get largest item by volume
2. For each truck type:
   - Check if length fits
   - Calculate total height (cargo + deck)
   - Check if height is legal (< 13.5')
   - Check if width is legal (< 8.5')
   - Check if weight fits
   - Calculate score (0-100)
   - Identify permit requirements

3. Sort by: fits first, then by score
4. Return all trucks with fit status and reasons

Include detailed fitDetails: lengthMargin, heightMargin, weightMargin"
```

#### Task 1.7: Analyze API Endpoint
**Time:** 1 hour

```bash
# Claude Code Prompt:
"Create the analyze API endpoint at src/app/api/analyze/route.ts:

POST /api/analyze
Body: { email: string }

Response: {
  parsed: ParsedLoad,
  recommendations: TruckRecommendation[],
  bestTruck: TruckRecommendation,
  processingTime: number
}

Include error handling, input validation with Zod, and logging."
```

#### Task 1.8: Load Analyzer UI
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create the Load Analyzer page at src/app/page.tsx:

Layout (two columns on desktop, stacked on mobile):
LEFT SIDE:
- Large textarea for pasting email
- Example emails dropdown
- 'Analyze Load' button

RIGHT SIDE (shows after analysis):
- ParsedLoadCard: Shows extracted dimensions, weight, route
- RecommendedTruckCard: Best truck with reasons (green border)
- PermitWarningsCard: If permits needed (yellow/red)
- AlternativeTrucksCard: Other options with fit status

Use shadcn/ui components, show loading state, handle errors gracefully."
```

#### Task 1.9: Sample Emails for Testing
**Time:** 1 hour

```bash
# Claude Code Prompt:
"Create sample test emails in src/data/sample-emails.ts:

Include 5 diverse examples:
1. Standard excavator (RGN recommended)
2. Steel coils (Flatbed recommended)
3. Tall transformer (Lowboy + permit required)
4. Multiple items (Step deck)
5. Incomplete information (should show warnings)

Export as array with name, email text, and expected results."
```

### Phase 1 Deliverables Checklist
- [ ] Project setup complete
- [ ] Type definitions created
- [ ] Truck database with accurate specs
- [ ] Unit converter handles all formats
- [ ] Gemini parser working
- [ ] Truck selector with height calculation
- [ ] API endpoint functional
- [ ] UI displays results
- [ ] Sample emails for testing

---

## PHASE 2: ROUTING & PERMITS (Week 3-4)

### Week 3: Routing Integration

#### Task 2.1: Geoapify Integration
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create Geoapify routing integration in src/lib/geoapify.ts:

Functions:
- geocodeAddress(address: string): Promise<{lat, lon}>
- getRoute(request: RouteRequest): Promise<RouteResponse>

RouteRequest should include:
- origin, destination coordinates
- vehicleType: 'truck_heavy'
- vehicleHeight, vehicleWidth, vehicleWeight
- avoidTolls option

Return distance (miles), time (seconds), geometry (GeoJSON)."
```

#### Task 2.2: State Detection
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create state detection from route coordinates in 
src/lib/calculations/state-detector.ts:

Use @turf/turf for point-in-polygon detection.
Download US state boundaries GeoJSON.

Function: detectStatesFromRoute(coordinates): StateSegment[]

Return for each state:
- stateName, stateCode
- miles in that state
- entry/exit points

Handle edge cases: routes along state borders, short segments."
```

#### Task 2.3: State Permit Database
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create the state permit database in src/data/state-permits.ts:

Use the data from 06-STATE-PERMIT-DATABASE.md for all 50 states.
Include for each state:
- Legal limits (width, height, length, weight)
- Oversize permit fees (single trip, annual)
- Overweight permit fees (base, per-mile, ton-mile)
- Escort requirements (width/height triggers)
- Travel restrictions (night, weekend, holiday)

Export as typed Record<string, StatePermitData>."
```

### Week 4: Permit Calculations

#### Task 2.4: Permit Calculator
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create permit cost calculator in src/lib/calculations/permit-calculator.ts:

Function: calculatePermitCosts(
  stateSegments: StateSegment[],
  loadRequirements: LoadPermitRequirements
): TotalPermitCosts

For each state calculate:
- Oversize permit fee (if width/height/length exceeds limits)
- Overweight permit fee (if GVW exceeds limit)
- Per-mile fees
- Ton-mile fees

Return breakdown by state and grand total."
```

#### Task 2.5: Escort Calculator
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create escort requirements calculator in 
src/lib/calculations/escort-calculator.ts:

Function: calculateEscortRequirements(
  stateSegments: StateSegment[],
  loadDimensions: { width, height, length }
): EscortRequirements[]

Check each state's rules:
- Width triggers for 1 escort, 2 escorts, police escort
- Height triggers for pole car
- Calculate costs based on miles

Use standard rates: $1.75/mile regular escort, $2.25/mile pole car."
```

#### Task 2.6: Route Planning UI
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create the Route Planner page at src/app/(dashboard)/routes/page.tsx:

Features:
- Interactive map (Leaflet) showing route
- State segments highlighted in different colors
- Side panel with:
  - Route summary (total miles, time)
  - State-by-state breakdown
  - Permit costs by state
  - Escort requirements
  - Total costs

Include route API endpoint at src/app/api/routes/route.ts"
```

### Phase 2 Deliverables Checklist
- [ ] Geoapify routing integration
- [ ] State boundary detection
- [ ] 50-state permit database
- [ ] Permit cost calculator
- [ ] Escort requirements calculator
- [ ] Interactive route map
- [ ] State breakdown display
- [ ] Total cost summary

---

## PHASE 3: 3D VISUALIZATION (Week 5-6) ← NEW

### Week 5: 3D Foundation

#### Task 3.1: Three.js Setup
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Set up Three.js with React in the Load Planner project:

Install:
- three
- @react-three/fiber
- @react-three/drei

Create src/components/3d/LoadVisualization.tsx as the main wrapper.
Include basic Canvas with:
- Ambient and directional lighting
- OrbitControls for rotation/zoom
- Grid helper for ground reference
- Default camera position

Make sure it works with Next.js (handle SSR issues)."
```

#### Task 3.2: Trailer Models
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create 3D trailer models in src/components/3d/TrailerModel.tsx:

Support these trailer types with accurate proportions:
1. Flatbed - Simple flat deck, 5.0' height
2. Step Deck - Two-level with step, 3.5' lower deck
3. RGN - Low well section at 2.0', detachable gooseneck look
4. Lowboy - Very low center at 1.5'
5. Double Drop - Front deck, low well, rear deck

Use simple box geometries with realistic colors:
- Deck: Dark gray
- Frame: Black
- Wheels: Black circles

Props: type, dimensions (length, width, deckHeight), showDimensions"
```

#### Task 3.3: Cargo Models
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create cargo item rendering in src/components/3d/CargoModel.tsx:

Features:
- Render cargo as boxes with rounded edges
- Display label on top face (description)
- Show dimensions on hover (tooltip)
- Color coding:
  - Green: Legal dimensions
  - Yellow: Near limit
  - Red: Over limit
  - Blue: Selected

Props: items (array), showLabels, showWeights, onSelect callback"
```

### Week 6: 3D Features

#### Task 3.4: Legal Limits Overlay
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create legal limits visualization in src/components/3d/LegalLimitsOverlay.tsx:

Display:
1. Horizontal plane at 13.5' (height limit)
   - Semi-transparent red
   - Dashed line at edges
   - Label '13.5 ft Legal Limit'

2. Warning zone (13.0' - 13.5')
   - Semi-transparent yellow

3. Width boundaries at 8.5' on each side
   - Vertical planes
   - Toggle visibility

Props: maxHeight, maxWidth, currentHeight, currentWidth, showWarningZone"
```

#### Task 3.5: Center of Gravity Indicator
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create center of gravity visualization in 
src/components/3d/CenterOfGravityMarker.tsx:

Display:
- Vertical line from deck to cargo center
- Horizontal crosshairs
- Ball marker at CoG point
- Color: Green if balanced, Yellow/Red if off-center

Also show ideal CoG zone as a faint green area on deck."
```

#### Task 3.6: Screenshot & Export
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Add screenshot functionality to LoadVisualization:

1. 'Screenshot' button captures current 3D view as PNG
2. Trigger download with filename: 'load-plan-[id]-[view].png'
3. Option to copy to clipboard

Use canvas.toDataURL() and handle the export."
```

#### Task 3.7: View Controls Component
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create view preset controls in src/components/3d/ViewControls.tsx:

Buttons for camera presets:
- 3D (isometric corner view)
- Front (head-on, shows height)
- Side (profile, shows length)
- Top (bird's eye, shows width)
- Reset (return to default)

Animate camera transitions smoothly (use drei's useCamera or similar)."
```

#### Task 3.8: 3D Page Integration
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Integrate 3D visualization into the Load Detail page:

Add a tab or section that shows:
1. Full 3D visualization component
2. View controls (3D/Front/Side/Top)
3. Display options checkboxes:
   - Show dimensions
   - Show legal limits
   - Show center of gravity
4. Measurements panel showing:
   - Overall height with status
   - Overall width with status
   - Gross weight with status
5. Action buttons: Screenshot, Share, Add to PDF"
```

### Phase 3 Deliverables Checklist
- [ ] Three.js setup working with Next.js
- [ ] All 5 trailer types modeled
- [ ] Cargo items render with labels
- [ ] 13.5' height limit plane displayed
- [ ] Center of gravity marker
- [ ] View presets (3D, Front, Side, Top)
- [ ] Screenshot export working
- [ ] Integrated into load detail page

---

## PHASE 4: MULTI-ITEM & IMPORT (Week 7-8) ← NEW

### Week 7: Excel Import

#### Task 4.1: File Parser Library
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create file parsing utilities in src/lib/import/:

excel-parser.ts:
- Use 'xlsx' package to parse .xlsx and .xls files
- Return rows as array of objects

csv-parser.ts:
- Parse CSV and TSV files
- Handle quoted fields and various delimiters

clipboard-parser.ts:
- Parse tab-separated data from clipboard
- Handle Excel's copy format

All should return same format: { headers: string[], rows: any[][] }"
```

#### Task 4.2: Column Mapper Component
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create column mapping component in src/components/import/ColumnMapper.tsx:

Features:
- Display detected columns from imported data
- Dropdown for each column to map to: Description, Length, Width, 
  Height, Weight, Quantity, Notes, or 'Skip'
- Unit selector for dimension/weight columns
- Auto-detect common column names (Length, L, Len, etc.)
- Save mapping as template for reuse
- Load saved templates

Props: columns, onMappingChange, savedTemplates"
```

#### Task 4.3: Import Preview
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create import preview in src/components/import/ImportPreview.tsx:

Show table of items to import:
- Apply column mapping
- Convert units in preview
- Validate each row (mark errors)
- Show status icon per row (✅ OK, ⚠️ Warning, ❌ Error)
- Highlight problems (missing required fields, invalid values)

Options for handling errors:
- Skip rows with errors
- Set default value
- Import anyway

Props: data, mapping, onValidationChange"
```

#### Task 4.4: Excel Import Modal
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create complete import modal in src/components/import/ExcelImport.tsx:

3-step wizard:
1. Upload: Drag/drop zone, file picker, or clipboard paste
2. Map Columns: ColumnMapper with auto-detection
3. Preview: ImportPreview with validation

On complete, call onImport(items: CargoItem[])

Include progress indicator and back/next navigation."
```

### Week 8: Multi-Item Optimization

#### Task 4.5: Load Optimizer Algorithm
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create multi-item load optimizer in 
src/lib/calculations/load-optimizer.ts:

Function: optimizeLoad(
  items: CargoItem[],
  availableTrailers: TruckType[],
  constraints: LoadConstraints
): LoadPlan

Algorithm:
1. Sort items by controlling dimension (tallest first usually)
2. Select minimum-deck-height trailer that fits tallest item
3. Bin pack items onto trailer (largest first)
4. If items don't fit, overflow to second truck
5. Optimize placement for weight distribution
6. Calculate center of gravity
7. Flag permit requirements

Return: Array of TruckLoadPlan with items and placements."
```

#### Task 4.6: Center of Gravity Calculator
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create CoG calculator in src/lib/calculations/center-of-gravity.ts:

Function: calculateCenterOfGravity(
  items: PlacedItem[],
  trailer: TruckType
): CenterOfGravityResult

Calculate weighted center point.
Check if balanced:
- X position: 35-55% of trailer length (ideal ~45%)
- Y position: centered ±10%

Return warnings if off-balance."
```

#### Task 4.7: Loading Instructions Generator
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create loading instructions in 
src/lib/calculations/loading-instructions.ts:

Function: generateLoadingInstructions(
  plan: TruckLoadPlan
): LoadingStep[]

For each item in reverse loading order:
- Step number
- Item description
- Position description ('Center of deck, 5ft from front')
- Securement requirements (chains/straps, count)
- Equipment needed (crane, ramps, etc.)
- Any warnings

Generate as printable format."
```

#### Task 4.8: Multi-Item Planner UI
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create multi-item planner page at src/app/(dashboard)/planner/page.tsx:

Layout:
LEFT: Cargo items list with add/edit/remove
      Import button opens ExcelImport modal
      AI button for email parsing

CENTER/RIGHT: Truck cards showing assignments
             Mini 3D preview per truck
             Utilization bars
             Status indicators

BOTTOM: Summary with total trucks, weight, permits needed

Features:
- Drag items between trucks
- 'Optimize' button to auto-assign
- Click truck card to see 3D view
- Generate quote button"
```

#### Task 4.9: Loading Instructions View
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create loading instructions view at 
src/components/load-planner/LoadingInstructions.tsx:

Displays step-by-step loading guide:
- Each step in a card with 3D preview
- Step number and item name
- Position description
- Securement requirements
- Final checklist

Include Print button for PDF-friendly version."
```

### Phase 4 Deliverables Checklist
- [ ] Excel/CSV file parser
- [ ] Clipboard paste support
- [ ] Column mapping with auto-detect
- [ ] Import preview with validation
- [ ] Complete import wizard
- [ ] Multi-item load optimizer
- [ ] Center of gravity calculation
- [ ] Loading instructions generator
- [ ] Multi-item planner UI
- [ ] Drag and drop between trucks
- [ ] Loading instructions view

---

## PHASE 5: BUSINESS OPERATIONS (Week 9-10)

### Week 9: Database & Core CRUD

#### Task 5.1: Database Setup
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Set up PostgreSQL with Prisma:

1. Install prisma and @prisma/client
2. Create prisma/schema.prisma with all models from planning doc:
   - User, Customer, Load, LoadItem, Route, Quote, QuoteLineItem
   - TruckType, StatePermit
   - SharedLink (new for phase 6)
3. Configure for PostgreSQL
4. Create initial migration
5. Set up src/lib/db.ts with Prisma client singleton"
```

#### Task 5.2: Seed Data
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create database seed script at prisma/seed.ts:

Seed:
- All truck types from trucks database
- All 50 states' permit data
- Sample customers (5)
- Sample loads (10)
- Sample quotes (5)

Add seed script to package.json."
```

#### Task 5.3: Customer CRUD
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create customer management:

API Routes at src/app/api/customers/:
- GET / - List customers with pagination
- POST / - Create customer
- GET /[id] - Get customer
- PUT /[id] - Update customer
- DELETE /[id] - Delete customer

Customer Page at src/app/(dashboard)/customers/page.tsx:
- Table with search and filters
- Add/Edit dialog
- Delete confirmation"
```

#### Task 5.4: Load CRUD
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create load management:

API Routes at src/app/api/loads/:
- GET / - List loads with filters
- POST / - Create load
- POST /analyze - AI parse and create
- GET /[id] - Get load with items and route
- PUT /[id] - Update load
- DELETE /[id] - Delete load

Pages:
- src/app/(dashboard)/loads/page.tsx - List
- src/app/(dashboard)/loads/new/page.tsx - New (analyzer)
- src/app/(dashboard)/loads/[id]/page.tsx - Detail with 3D view"
```

### Week 10: Quotes & PDF

#### Task 5.5: Quote Generator
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create quote generator in src/lib/calculations/quote-generator.ts:

Function: generateQuote(input: QuoteInput): GeneratedQuote

Calculate line items:
- Line haul (miles × rate)
- Fuel surcharge (percentage)
- Permit fees by state (from permit calculator)
- Escort costs by state
- Additional fees (tarping, etc.)
- Discount

Generate quote number: Q-YYYY-NNNNN
Calculate totals and save to database."
```

#### Task 5.6: Quote Builder UI
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create quote builder wizard at src/app/(dashboard)/quotes/new/page.tsx:

4-step wizard:
1. Select Load - Choose existing load or create new
2. Pricing - Set rates, fuel surcharge, add fees
3. Review - Show full breakdown with 3D preview
4. Send - Preview email, send or save as draft

Use shadcn/ui Tabs or Stepper pattern."
```

#### Task 5.7: Branded PDF Generation
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create branded PDF generator using @react-pdf/renderer:

src/lib/pdf/quote-pdf.tsx:
- Company branding section (logo, name, address)
- Quote number and date
- Customer information
- Load details section
- Route summary with state breakdown
- 3D visualization image (if available)
- Pricing breakdown table
- Terms and conditions
- Footer with tagline

Support custom colors from branding settings."
```

#### Task 5.8: Branding Settings
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create branding settings page at src/app/(dashboard)/settings/branding/page.tsx:

Form fields:
- Logo upload (handle image, store URL)
- Company name, address, phone, email, website
- Tagline
- Primary and accent colors (color pickers)
- Terms and conditions text

Save to user profile in database.
Show live preview of PDF header."
```

#### Task 5.9: Authentication
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Set up Clerk authentication:

1. Install @clerk/nextjs
2. Configure environment variables
3. Create src/middleware.ts for protected routes
4. Add ClerkProvider to layout
5. Create sign-in and sign-up pages
6. Set up webhook for user sync to database
7. Protect all (dashboard) routes"
```

### Phase 5 Deliverables Checklist
- [ ] PostgreSQL database configured
- [ ] Prisma schema with all models
- [ ] Seed data for testing
- [ ] Customer CRUD complete
- [ ] Load CRUD with AI parsing
- [ ] Quote generator with line items
- [ ] Quote builder wizard
- [ ] Branded PDF generation
- [ ] Branding settings page
- [ ] Clerk authentication working

---

## PHASE 6: SHARING & COLLABORATION (Week 11-12) ← NEW

### Week 11: Shareable Links

#### Task 6.1: Share Link Database
**Time:** 1 hour

```bash
# Claude Code Prompt:
"Add SharedLink model to Prisma schema:

model SharedLink {
  id            String      @id @default(cuid())
  loadPlanId    String
  token         String      @unique @default(cuid())
  permissions   Permission  @default(VIEW)
  password      String?
  expiresAt     DateTime?
  viewCount     Int         @default(0)
  lastViewedAt  DateTime?
  createdAt     DateTime    @default(now())
  createdById   String
}

enum Permission { VIEW, COMMENT, EDIT }

Run migration."
```

#### Task 6.2: Share API
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Create share link API at src/app/api/share/:

POST / - Create share link
  Body: { loadPlanId, permissions, password?, expiresAt? }
  Returns: { token, url }

GET /[token] - Get shared content (public)
  Check: valid token, not expired, correct password
  Increment viewCount
  Returns: Load plan data

DELETE /[token] - Revoke share link"
```

#### Task 6.3: Share Dialog Component
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create share dialog at src/components/sharing/ShareDialog.tsx:

Features:
- Generate shareable URL
- Copy link button
- Quick share buttons (Email, SMS, WhatsApp)
- Permission selector (View, Comment, Edit)
- Expiration options (Never, 7 days, 30 days, custom)
- Optional password protection
- Include options (3D view, permits, pricing, instructions)
- Embed code generator

Use shadcn/ui Dialog."
```

#### Task 6.4: QR Code Generator
**Time:** 1 hour

```bash
# Claude Code Prompt:
"Create QR code display at src/components/sharing/QRCodeDisplay.tsx:

Use 'qrcode' package to generate QR code from share URL.
Display in modal with:
- QR code image
- Load plan name
- Expiration date
- Download PNG button
- Print button"
```

### Week 12: Public View & Embed

#### Task 6.5: Public Shared View
**Time:** 4 hours

```bash
# Claude Code Prompt:
"Create public shared view at src/app/s/[token]/page.tsx:

No authentication required.
Display:
- Header with shared by company name
- Interactive 3D visualization
- Cargo details card
- Truck details card
- Measurements with legal status
- Permit requirements (if included)
- Download PDF button
- 'Powered by Load Planner' footer with CTA

Handle: expired links, invalid tokens, password prompt"
```

#### Task 6.6: Embed Widget
**Time:** 3 hours

```bash
# Claude Code Prompt:
"Create embeddable widget at src/app/embed/[token]/page.tsx:

Minimal, iframe-friendly version:
- 3D visualization only
- Basic controls
- No header/footer
- Responsive sizing
- Light/dark theme option via query param

Create embed code generator showing:
<iframe src='...' width='100%' height='600'></iframe>"
```

#### Task 6.7: Share Integration
**Time:** 2 hours

```bash
# Claude Code Prompt:
"Integrate sharing throughout the app:

Add 'Share' button to:
- Load Detail page
- 3D Visualization view
- Multi-item planner
- Quote detail page

Button opens ShareDialog with context-appropriate defaults."
```

### Phase 6 Deliverables Checklist
- [ ] SharedLink database model
- [ ] Share link API
- [ ] Share dialog with all options
- [ ] QR code generation
- [ ] Public shared view page
- [ ] Embeddable widget
- [ ] Password protection
- [ ] Expiration enforcement
- [ ] Share buttons throughout app

---

## PHASE 7: ENTERPRISE & API (Week 13+)

### API Development

#### Task 7.1: REST API v1
```bash
# Create versioned public API at src/app/api/v1/

Endpoints:
- POST /loads/analyze
- POST /loads
- GET /loads/:id
- POST /optimize
- POST /quotes
- GET /equipment/trucks
- POST /share

Include API key authentication and rate limiting.
```

#### Task 7.2: API Documentation
```bash
# Create API docs at /docs using Swagger/OpenAPI

Document all endpoints with:
- Request/response schemas
- Authentication
- Rate limits
- Code examples
```

#### Task 7.3: Webhooks
```bash
# Create webhook system

Events:
- load.created
- quote.generated
- quote.accepted
- share.viewed

Allow customers to register webhook URLs.
```

### Enterprise Features

#### Task 7.4: Team Management
- Organization model
- Team member invites
- Role-based permissions

#### Task 7.5: White Label
- Custom domain support
- Remove all branding
- Custom CSS theming

#### Task 7.6: Analytics Dashboard
- Quote conversion rates
- Popular routes
- Revenue tracking
- Usage statistics

---

## TESTING STRATEGY

### Unit Tests
```bash
# Test each calculation module

- unit-converter.test.ts: All input formats
- truck-selector.test.ts: Height calculations!
- permit-calculator.test.ts: State fee accuracy
- load-optimizer.test.ts: Multi-item placement
- center-of-gravity.test.ts: Balance detection
```

### Integration Tests
```bash
# Test complete flows

- Email → Parse → Recommend → Route → Quote
- Import → Optimize → Visualize → Share
- Create → Edit → Generate PDF
```

### E2E Tests
```bash
# Playwright tests for critical paths

- New user signup → First load analysis
- Excel import → Generate quote
- Create load → Share with customer
```

---

## DEPLOYMENT

### Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url",
    "GEMINI_API_KEY": "@gemini-api-key",
    "GEOAPIFY_API_KEY": "@geoapify-api-key"
  }
}
```

### Environment Variables
```
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
GEOAPIFY_API_KEY=...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
CLERK_WEBHOOK_SECRET=...
```

### Launch Checklist
- [ ] All environment variables set
- [ ] Database migrated
- [ ] Seed data loaded
- [ ] Clerk webhooks configured
- [ ] Custom domain set
- [ ] SSL certificate active
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Posthog/Mixpanel)

---

*Updated Development Roadmap v2.0 - January 2025*
