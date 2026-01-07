# LOAD PLANNER - Deep Dive Planning Document
## Part 7: Development Roadmap & Task Breakdown

---

## 1. DEVELOPMENT PHASES OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LOAD PLANNER DEVELOPMENT TIMELINE                       │
└─────────────────────────────────────────────────────────────────────────────┘

 Week 1       Week 2       Week 3       Week 4       Week 5       Week 6+
   │            │            │            │            │            │
   ▼            ▼            ▼            ▼            ▼            ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ PHASE 1  │ │ PHASE 1  │ │ PHASE 2  │ │ PHASE 2  │ │ PHASE 3  │ │ PHASE 3+ │
│          │ │          │ │          │ │          │ │          │ │          │
│ Project  │ │ Truck    │ │ Routing  │ │ Permits  │ │ Database │ │ Quotes   │
│ Setup    │ │ Selector │ │ API      │ │ & Escort │ │ & CRUD   │ │ & More   │
│ + Email  │ │ + UI     │ │ + Maps   │ │ Calc     │ │          │ │          │
│ Parser   │ │          │ │          │ │          │ │          │ │          │
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
     │            │            │            │            │            │
     ▼            ▼            ▼            ▼            ▼            ▼
   MVP #1      MVP #2      MVP #3      MVP #4      MVP #5      Full App
 (Parse)    (Recommend)  (Route)    (Costs)    (Persist)   (Production)
```

---

## 2. PHASE 1: CORE FOUNDATION

### 2.1 Phase 1 Overview

**Goal:** Paste email → Get truck recommendation  
**Duration:** ~1 week  
**Deliverable:** Working web page that parses emails and recommends trucks

### 2.2 Phase 1 Tasks

#### Task 1.1: Project Setup (2-3 hours)

**Description:** Initialize Next.js project with TypeScript, Tailwind, and essential dependencies

**Claude Code Prompt:**
```
Create a new Next.js 14 project for Load Planner with:
- TypeScript configured
- Tailwind CSS with a custom color scheme (blue primary)
- App Router structure
- Essential folders: /app, /lib, /components, /data, /types
- Environment variables template
- Basic layout with header

Install these packages:
- @google/generative-ai (Gemini)
- zod (validation)
- clsx, tailwind-merge (styling utilities)

Create a clean, professional design system foundation.
```

**Expected Files:**
```
load-planner/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   │       └── button.tsx
│   ├── lib/
│   │   └── utils.ts
│   ├── types/
│   │   └── index.ts
│   └── data/
├── .env.example
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**Verification:**
- [ ] `pnpm dev` starts without errors
- [ ] Page loads at localhost:3000
- [ ] Tailwind styles working

---

#### Task 1.2: Type Definitions (1 hour)

**Description:** Define TypeScript interfaces for loads, trucks, and recommendations

**Claude Code Prompt:**
```
Create comprehensive TypeScript types for Load Planner in /src/types/:

1. load.types.ts:
   - ParsedLoad (items, origin, destination, dates)
   - ParsedLoadItem (description, dimensions, weight)
   - Dimension (value, unit, normalized)
   - Weight (value, unit, normalized)
   - Location (address, city, state, lat, lon)

2. truck.types.ts:
   - TruckType (id, name, category, deckSpecs, capacity)
   - TruckCategory enum
   - TruckVariation
   - TruckRecommendation (truck, score, fits, fitDetails, permitRequired)
   - FitDetails (lengthFits, widthFits, heightFits, weightFits, margins)
   - PermitRequired (oversize, overweight, superload, reasons)

3. api.types.ts:
   - AnalyzeRequest, AnalyzeResponse
   - ApiResponse<T>, ApiError

Export everything from index.ts barrel file.
Include JSDoc comments for complex types.
```

**Verification:**
- [ ] Types compile without errors
- [ ] IntelliSense working in IDE

---

#### Task 1.3: Truck Database (2 hours)

**Description:** Create comprehensive truck specifications database

**Claude Code Prompt:**
```
Create the truck database in /src/data/trucks.ts with ALL truck types:

Include these trucks with ACCURATE specifications:
1. Flatbed (48ft, 53ft variations)
2. Step Deck (single drop, stretch variations)
3. RGN - Removable Gooseneck (standard, stretch, extendable)
4. Lowboy (fixed neck, detachable, stretch)
5. Double Drop
6. Landoll/Traveling Axle
7. Conestoga

For each truck include:
- Accurate deck dimensions (length, width, deck height)
- Well dimensions where applicable
- Weight capacity (cargo weight, not GVW)
- Typical tare weight
- Features array
- Best-for use cases
- Limitations

Also create /src/data/legal-limits.ts with:
- Federal legal limits (8.5' width, 13.5' height, 80,000 GVW)
- Permit thresholds

Use the truck data from the planning document for reference.
Make sure deck heights are accurate - this is critical for height calculations.
```

**Key Accuracy Points:**
- Flatbed deck height: 5.0 ft
- Step deck main deck: 3.5 ft
- RGN well: 2.0 ft
- Lowboy: 1.5 ft

**Verification:**
- [ ] All 7 truck categories present
- [ ] Deck heights accurate
- [ ] Weight capacities realistic

---

#### Task 1.4: Unit Converter (1.5 hours)

**Description:** Build robust unit conversion utilities

**Claude Code Prompt:**
```
Create /src/lib/services/unit-converter.ts with functions to:

1. Convert dimensions:
   - toFeet(value, unit) - convert from any unit to feet
   - toInches(value, unit) - convert from any unit to inches
   - Support: ft, in, m, cm

2. Convert weights:
   - toPounds(value, unit) - convert from any unit to lbs
   - toTons(value, unit) - convert from any unit to tons
   - Support: lbs, tons, kg, mt (metric tons)

3. Parse dimension strings:
   - parseDimensionString("10'6\"") → { value: 10.5, unit: 'ft' }
   - parseDimensionString("126 inches") → { value: 126, unit: 'in' }
   - parseDimensionString("3.2m") → { value: 3.2, unit: 'm' }

4. Parse weight strings:
   - parseWeightString("45,000 lbs") → { value: 45000, unit: 'lbs' }
   - parseWeightString("22.5 tons") → { value: 22.5, unit: 'tons' }

5. Format for display:
   - formatDimension(10.5, 'feetInches') → "10'6\""
   - formatDimension(10.5, 'decimal') → "10.5 ft"
   - formatWeight(45000) → "45,000 lbs"

Include comprehensive unit tests.
Handle edge cases: missing units, comma separators, fractions.
```

**Verification:**
- [ ] parseDimensionString("10'6\"") returns 10.5
- [ ] toPounds(22.5, 'tons') returns 45000
- [ ] Handles malformed input gracefully

---

#### Task 1.5: Email Parser with Gemini (3 hours)

**Description:** AI-powered email parsing using Google Gemini

**Claude Code Prompt:**
```
Create /src/lib/services/email-parser.ts with Gemini integration:

1. Set up Gemini client:
   - Use gemini-1.5-flash model for speed
   - Low temperature (0.1) for consistent parsing
   - Structured output enforcement

2. Create parseLoadEmail(emailContent: string): Promise<ParsedLoad>:
   - Send email to Gemini with detailed parsing prompt
   - Prompt should instruct model to:
     * Extract ALL cargo items with dimensions/weights
     * Identify origin and destination
     * Extract pickup/delivery dates
     * Note any special requirements
     * Return ONLY valid JSON (no markdown)
   - Parse JSON response
   - Validate with Zod schema
   - Normalize all units to feet/lbs

3. Handle edge cases:
   - Multiple items in one email
   - Dimensions in various formats (10'6", 10.5ft, 126")
   - Weights as tons or lbs
   - Partial information (calculate confidence score)
   - Retry on malformed response

4. Calculate confidence score:
   - 1.0 = all fields present
   - Deduct for missing fields
   - Below 0.5 = warn user

Create the parsing prompt that handles real-world freight emails.
Include example emails in comments for testing.
```

**Parsing Prompt Template:**
```
You are a freight load parser. Extract load details from this email.

Return ONLY valid JSON (no markdown, no explanation):
{
  "confidence": 0.95,
  "items": [
    {
      "description": "item name",
      "quantity": 1,
      "length": { "value": 20, "unit": "ft" },
      "width": { "value": 8, "unit": "ft" },
      "height": { "value": 10, "unit": "ft" },
      "weight": { "value": 45000, "unit": "lbs" },
      "notes": []
    }
  ],
  "origin": { "city": "Houston", "state": "TX", "address": "..." },
  "destination": { "city": "Chicago", "state": "IL", "address": "..." },
  "pickupDate": "2024-01-15",
  "deliveryDate": null,
  "customerName": "...",
  "customerEmail": "...",
  "specialNotes": []
}

RULES:
- Extract dimensions exactly as written, note the unit
- If dimensions are in inches, use "in" as unit
- If weight is in tons, use "tons" as unit
- Extract ALL items if email mentions multiple pieces
- Set confidence lower if information is unclear
- Return null for truly missing fields
```

**Verification:**
- [ ] Parses sample excavator email correctly
- [ ] Handles multiple items
- [ ] Returns valid ParsedLoad type
- [ ] Confidence score reflects completeness

---

#### Task 1.6: Truck Selector Logic (3 hours)

**Description:** Algorithm to recommend trucks based on load specs

**Claude Code Prompt:**
```
Create /src/lib/services/truck-selector.ts:

1. Main function: selectTruck(load: ParsedLoad): TruckSelectionResult
   - Find the controlling item (largest by volume OR weight)
   - Evaluate each truck type
   - Return sorted recommendations

2. For each truck, calculate:
   - Length fit: cargo length vs deck length
   - Width fit: cargo width vs deck width (8.5' legal)
   - Height fit: cargo height + deck height vs 13.5' legal
   - Weight fit: cargo weight vs truck capacity

3. Calculate overall dimensions:
   - totalHeight = cargoHeight + truckDeckHeight
   - grossWeight = cargoWeight + truckTareWeight

4. Determine permit requirements:
   - Oversize: width > 8.5' OR height > 13.5' OR length > 53'
   - Overweight: grossWeight > 80,000 lbs
   - Superload: width > 16' OR height > 16' OR weight > 150,000

5. Scoring algorithm (100 point base):
   - Deduct 50 if doesn't physically fit
   - Deduct 10 for each permit type needed
   - Add 20 if optimal for cargo type (using bestFor array)
   - Add 10 for efficiency (not wasting capacity)

6. Generate pros/cons for each recommendation

Critical: The HEIGHT CALCULATION is the key logic:
- For tall cargo, lower deck trucks score higher
- RGN (2' deck) fits 11.5' cargo legally
- Flatbed (5' deck) only fits 8.5' cargo legally

Return results sorted by: fits first, then by score descending.
```

**Verification:**
- [ ] 10' tall cargo recommends RGN/Lowboy, not Flatbed
- [ ] 52,000 lbs triggers overweight warning
- [ ] 12' wide cargo triggers oversize permit
- [ ] Recommendations are sensibly ordered

---

#### Task 1.7: Analyze API Endpoint (1.5 hours)

**Description:** POST endpoint that orchestrates parsing and truck selection

**Claude Code Prompt:**
```
Create /src/app/api/analyze/route.ts:

1. POST handler that:
   - Accepts { content: string, options?: {...} }
   - Validates input with Zod
   - Calls emailParser.parseLoadEmail()
   - Normalizes all dimensions to feet, weights to lbs
   - Calls truckSelector.selectTruck()
   - Returns combined result

2. Response shape:
{
  success: true,
  data: {
    parsed: ParsedLoad,
    recommendations: TruckRecommendation[],
    bestMatch: TruckRecommendation,
    warnings: string[]
  }
}

3. Error handling:
   - 400 for missing content
   - 422 for parse failures (with partial data if available)
   - 502 for Gemini API errors
   - 500 for unexpected errors

4. Generate warnings array:
   - Low confidence parse
   - Oversize/overweight flags
   - Weight near capacity
   - Any special concerns

Add request logging for debugging.
```

**Verification:**
- [ ] Returns 400 for empty body
- [ ] Returns parsed load and recommendations
- [ ] Handles Gemini failures gracefully

---

#### Task 1.8: Load Analyzer UI (4 hours)

**Description:** Main page with email input and results display

**Claude Code Prompt:**
```
Create the Load Analyzer page at /src/app/page.tsx:

Layout: Two-column on desktop, stacked on mobile
Left: Input section
Right: Results section

1. Input Section:
   - Large textarea (min 400px height)
   - Monospace font for email readability
   - Character count
   - "Analyze Load" button (blue, prominent)
   - Example buttons below: [Excavator] [Steel Coils] [Transformer]
   - Each example fills textarea with sample email

2. Results Section (shows after analysis):
   
   a. ParsedLoadCard:
      - Items with dimensions/weights
      - Origin → Destination
      - Pickup date
      - Confidence indicator (green/yellow/red)
   
   b. RecommendedTruckCard (prominent, green border):
      - Truck name with icon
      - "✓ Recommended" badge
      - Fit details (checkmarks for each dimension)
      - Overall dimensions calculated
   
   c. PermitWarningsCard (yellow, if needed):
      - "⚠ Permits Required"
      - List of reasons
   
   d. AlternativeTrucksCard:
      - Other trucks with fit/no-fit status
      - Collapsed by default, expandable

3. States:
   - Empty: Show input, example buttons
   - Loading: Spinner in results area
   - Success: All cards populated
   - Error: Error message with retry button
   - Low confidence: Warning banner above results

Use Tailwind for styling. Make it look professional.
Include sample emails in the code for testing.
```

**Sample Email for Testing:**
```
Subject: Quote Request - Excavator Transport

Hi,

We need to move a CAT 320 Excavator:
- Dimensions: 32' long x 10' wide x 10'6" tall
- Weight: 52,000 lbs
- Non-running, will need ramps

Pickup: Houston, TX (1234 Industrial Blvd)
Delivery: Dallas, TX (5678 Construction Ave)
Pickup date: January 15, 2024

Please provide a quote.

Thanks,
John Smith
ABC Construction
john@abcconstruction.com
```

**Verification:**
- [ ] Page renders without errors
- [ ] Example buttons populate textarea
- [ ] Analyze button triggers API call
- [ ] Results display correctly
- [ ] Mobile responsive

---

#### Task 1.9: Phase 1 Testing & Polish (2 hours)

**Description:** End-to-end testing and UI polish

**Claude Code Prompt:**
```
Test and polish Phase 1:

1. Test with various email formats:
   - Multiple items
   - Dimensions in different formats
   - Missing information
   - Non-standard layouts

2. Verify truck recommendations:
   - Tall load (10'+ cargo) → RGN/Lowboy
   - Heavy load (45k+) → Verify capacity
   - Wide load (10'+) → Permit warnings
   - Long load (100'+) → Correct truck

3. UI improvements:
   - Loading state with skeleton
   - Smooth transitions
   - Error messages are helpful
   - Confidence warning is clear
   - Mobile layout works

4. Add helpful features:
   - Copy results button
   - Clear input button
   - Keyboard shortcuts (Ctrl+Enter to analyze)

5. Create README with:
   - Setup instructions
   - Environment variables needed
   - How to test
```

**Final Phase 1 Checklist:**
- [ ] Email parsing works with various formats
- [ ] Truck recommendations are accurate
- [ ] UI is polished and responsive
- [ ] Error states handled gracefully
- [ ] README is complete

---

## 3. PHASE 2: ROUTING & PERMITS

### 3.1 Phase 2 Overview

**Goal:** Add routing with state detection and permit cost calculations  
**Duration:** ~1.5 weeks  
**Prerequisite:** Phase 1 complete

### 3.2 Phase 2 Tasks

#### Task 2.1: Geoapify Integration (3 hours)

**Claude Code Prompt:**
```
Create /src/lib/services/route-planner.ts with Geoapify:

1. Set up API client:
   - Base URL: https://api.geoapify.com/v1
   - Use GEOAPIFY_API_KEY from env

2. geocodeAddress(address: string): Promise<Location>
   - Call /geocode/search endpoint
   - Filter to US results
   - Return lat/lon with formatted address

3. planRoute(input: RoutePlannerInput): Promise<RouteResult>
   - Build waypoints string
   - Call /routing endpoint with:
     * mode: truck
     * vehicle height/width/weight params (in meters!)
     * details: instruction_details
   - Parse response
   - Convert distances to miles
   - Return geometry and stats

4. Unit conversions:
   - Feet to meters for API calls
   - Meters to miles for response

Handle rate limits and errors appropriately.
```

---

#### Task 2.2: State Detection (2 hours)

**Claude Code Prompt:**
```
Create /src/lib/services/state-detector.ts:

1. Load US state boundary GeoJSON data
   - Use a simplified boundary file (not high-res)
   - Store in /src/data/state-boundaries.json

2. detectStates(coordinates: [number, number][]): StateSegment[]
   - Iterate through route coordinates
   - Use point-in-polygon to detect state for each point
   - Track when state changes
   - Calculate miles in each state segment
   - Return entry/exit points for each state

3. Use @turf/turf for geo calculations:
   - booleanPointInPolygon
   - length (for segment distances)

4. Return StateSegment[]:
   - state, stateCode
   - miles, kilometers
   - entryPoint, exitPoint
   - sortOrder
```

---

#### Task 2.3: State Permit Database (4 hours)

**Claude Code Prompt:**
```
Create /src/data/state-permits.ts with data for all 50 states.

Use the complete state data from the planning document.

For each state include:
- stateCode, stateName, timezone
- legalLimits (width, height, length, weight)
- oversizePermits (single trip fees, annual fees)
- overweightPermits (base fee, per-mile fee)
- escortRules (thresholds for 1 escort, 2 escorts, pole car)
- travelRestrictions (night, weekend, holiday)
- contact info (phone, website)

Export as a Record<string, StatePermitData> for easy lookup.

Focus on accuracy for the major states:
TX, CA, FL, NY, IL, OH, PA, GA, NC, MI
```

---

#### Task 2.4: Permit Calculator (3 hours)

**Claude Code Prompt:**
```
Create /src/lib/services/permit-calculator.ts:

1. calculatePermitCosts(input): PermitCalculatorResult
   - Take stateSegments and loadDimensions
   - For each state:
     * Look up state permit data
     * Determine if OS/OW permit needed
     * Calculate base fees
     * Calculate dimension surcharges (if width > 12', etc.)
     * Calculate mileage fees (miles * per-mile rate)
   
2. calculateEscortRequirements(segment, dimensions): EscortRequirement
   - Check width against escort thresholds
   - Check height for pole car
   - Check length thresholds
   - Estimate costs: miles * escort rate ($1.50-2.00/mile)
   - Flag police escort requirements

3. getTravelRestrictions(stateCode): TravelRestriction[]
   - Night travel restrictions
   - Weekend restrictions
   - Holiday restrictions

4. Generate totals:
   - Sum of all permit fees
   - Sum of all mileage fees  
   - Sum of escort costs
   - Grand total

Return detailed breakdown by state plus totals.
```

---

#### Task 2.5: Route API Endpoints (2 hours)

**Claude Code Prompt:**
```
Create API routes for routing functionality:

1. POST /api/routing/route
   - Accept origin, destination, waypoints, vehicleParams
   - Call route planner
   - Detect states
   - Return route with state segments

2. POST /api/routing/geocode
   - Accept address string
   - Return geocoded location

3. POST /api/permits/calculate
   - Accept stateSegments and loadDimensions
   - Calculate permit costs
   - Return detailed breakdown

4. GET /api/permits/states
   - Return all state permit data
   - Optional filter by state codes

Each endpoint should follow the standard response format.
Include input validation with Zod.
```

---

#### Task 2.6: Route Planner UI (4 hours)

**Claude Code Prompt:**
```
Create Route Planner page at /src/app/routes/page.tsx:

1. Input Section:
   - Origin address input (with geocode on blur)
   - Destination address input
   - Vehicle dimensions from analyzed load
   - "Calculate Route" button

2. Map Component (using Leaflet):
   - Show route line on map
   - Markers for origin/destination
   - State boundary overlays (optional)
   - Clearance warning markers

3. Results Section:
   - Route summary (miles, time)
   - State segments list with miles each
   - Permit costs by state
   - Escort requirements
   - Travel restrictions

4. Create reusable components:
   - RouteMap
   - StateCostBreakdown
   - EscortRequirements
   - TravelRestrictions

Install leaflet and react-leaflet packages.
```

---

#### Task 2.7: Low Clearance Integration (Optional - 2 hours)

**Claude Code Prompt:**
```
If Low Clearance Map API is available, create /src/lib/services/clearance-checker.ts:

1. checkClearances(coordinates, loadHeight): ClearanceResult
   - Call Low Clearance API with route
   - Get obstacles along route
   - Compare to load height
   - Calculate margin for each

2. Integrate with route planner:
   - After getting route, check clearances
   - Add clearance issues to route result
   - Flag routes with tight clearances

If API not available, create stub that returns "clearance unchecked" status.
```

---

## 4. PHASE 3: BUSINESS OPERATIONS

### 4.1 Phase 3 Overview

**Goal:** Add database persistence, customers, and quote generation  
**Duration:** ~2 weeks  
**Prerequisite:** Phase 2 complete

### 4.2 Phase 3 Tasks

#### Task 3.1: Database Setup (3 hours)

**Claude Code Prompt:**
```
Set up PostgreSQL with Prisma:

1. Install Prisma: pnpm add prisma @prisma/client

2. Initialize: npx prisma init

3. Create schema.prisma with ALL models from the planning document:
   - User, Company
   - Customer
   - Load, LoadItem
   - Route, RouteState, ClearanceIssue
   - Quote, QuoteLineItem
   - TruckType, StatePermitData
   - AuditLog

4. Set up database connection:
   - Use DATABASE_URL from env
   - Configure for Vercel Postgres or Supabase

5. Generate client: npx prisma generate

6. Create initial migration: npx prisma migrate dev

7. Create /src/lib/db.ts with Prisma client singleton
```

---

#### Task 3.2: Seed Data (2 hours)

**Claude Code Prompt:**
```
Create /prisma/seed.ts to populate reference data:

1. Seed truck types from /src/data/trucks.ts

2. Seed state permit data from /src/data/state-permits.ts

3. Create seed command in package.json

4. Run seed after migrations

Use upsert to make seed idempotent.
```

---

#### Task 3.3: Customer CRUD (3 hours)

**Claude Code Prompt:**
```
Create customer management:

1. /src/lib/services/customer-service.ts:
   - createCustomer()
   - getCustomer(id)
   - listCustomers(filters, pagination)
   - updateCustomer()
   - deleteCustomer()

2. API routes:
   - POST /api/customers
   - GET /api/customers
   - GET /api/customers/[id]
   - PATCH /api/customers/[id]
   - DELETE /api/customers/[id]

3. Customer list page: /dashboard/customers
   - Data table with search, filter, sort
   - Click to view details
   - New customer button

4. Customer detail page: /dashboard/customers/[id]
   - Customer info card
   - Related loads/quotes
   - Edit/delete actions
```

---

#### Task 3.4: Load CRUD (4 hours)

**Claude Code Prompt:**
```
Create load management:

1. /src/lib/services/load-service.ts:
   - createLoad() - from parsed email or manual
   - getLoad(id) with relations
   - listLoads(filters, pagination)
   - updateLoad()
   - deleteLoad() (soft delete - set status CANCELLED)
   - generateLoadNumber() - LD-2024-00001 format

2. API routes following same pattern

3. Load list page: /dashboard/loads
   - Data table with status badges
   - Quick filters: status, date, customer
   - New load button

4. Load detail page: /dashboard/loads/[id]
   - Load info with items
   - Truck recommendation
   - Route summary (if calculated)
   - Related quotes
   - Actions: edit, calculate route, generate quote
```

---

#### Task 3.5: Quote Generator (4 hours)

**Claude Code Prompt:**
```
Create quote generation:

1. /src/lib/services/quote-generator.ts:
   - generateQuote(input): GeneratedQuote
     * Calculate line haul (miles * rate)
     * Add fuel surcharge
     * Add permit costs from calculator
     * Add escort costs
     * Add additional fees
     * Apply discount
     * Generate quote number: Q-2024-00001
   
2. /src/lib/services/quote-service.ts:
   - createQuote() - save to DB
   - getQuote(id) with line items
   - listQuotes(filters)
   - updateQuote()
   - updateQuoteStatus()

3. Quote line items breakdown:
   - LINE_HAUL, FUEL_SURCHARGE
   - PERMIT_OVERSIZE, PERMIT_OVERWEIGHT per state
   - ESCORT_LEAD, ESCORT_CHASE per state
   - ADDITIONAL fees
   - DISCOUNT

4. API routes for quotes
```

---

#### Task 3.6: Quote Builder UI (4 hours)

**Claude Code Prompt:**
```
Create multi-step quote builder at /dashboard/quotes/new:

Step 1 - Select Load:
- Choose from existing loads
- Or create new load
- Show load summary

Step 2 - Configure Pricing:
- Base mileage rate input
- Fuel surcharge percentage
- Additional fees (add/remove)
- Discount amount/reason
- Valid days

Step 3 - Review:
- Full quote preview
- Line item breakdown
- Edit any values
- Total prominently displayed

Step 4 - Send:
- Customer email
- Preview email message
- Send button
- Or save as draft

Create stepper component for navigation.
Show quote preview updating in real-time.
```

---

#### Task 3.7: PDF Generation (3 hours)

**Claude Code Prompt:**
```
Create PDF quote generation:

1. Install: pnpm add @react-pdf/renderer

2. Create /src/lib/pdf/quote-template.tsx:
   - Professional quote layout
   - Company header with logo
   - Customer info
   - Load details summary
   - Pricing table with line items
   - Terms and conditions
   - Valid until date

3. Create /api/quotes/[id]/pdf route:
   - Generate PDF from quote data
   - Return as downloadable file
   - Or return URL to stored file

4. Add download button to quote detail page

Use the PDF template design from planning document.
```

---

#### Task 3.8: Authentication with Clerk (3 hours)

**Claude Code Prompt:**
```
Add Clerk authentication:

1. Install: pnpm add @clerk/nextjs

2. Configure Clerk:
   - Add environment variables
   - Set up middleware for protected routes
   - Wrap app in ClerkProvider

3. Create auth pages:
   - /sign-in - Clerk SignIn component
   - /sign-up - Clerk SignUp component

4. Protect dashboard routes:
   - All /dashboard/* routes require auth
   - Redirect to sign-in if not authenticated

5. Sync Clerk user to database:
   - Create webhook /api/webhooks/clerk
   - On user.created, create User record
   - On user.updated, update User record

6. Add user context:
   - Get current user in API routes
   - Filter data by userId/companyId
```

---

## 5. PHASE 4 & 5 TASKS (Summary)

### Phase 4: Advanced Features

| Task | Description | Estimate |
|------|-------------|----------|
| 4.1 | Dashboard page with metrics cards | 3h |
| 4.2 | Securement calculator (chains/straps) | 2h |
| 4.3 | Load stacking optimizer | 4h |
| 4.4 | Natural language search with AI | 3h |
| 4.5 | Mobile responsive polish | 2h |
| 4.6 | Settings page (user prefs, defaults) | 2h |

### Phase 5: Enterprise & Scale

| Task | Description | Estimate |
|------|-------------|----------|
| 5.1 | Multi-tenant company support | 4h |
| 5.2 | API key management | 3h |
| 5.3 | External API documentation | 2h |
| 5.4 | Email automation (incoming) | 4h |
| 5.5 | Analytics dashboard | 4h |
| 5.6 | Audit logging | 2h |
| 5.7 | Production deployment | 2h |

---

## 6. CLAUDE CODE WORKFLOW

### 6.1 Recommended Development Flow

```
For each task:

1. Start with clear prompt from this document
2. Let Claude generate the code
3. Review and test the output
4. Request fixes/improvements as needed
5. Commit working code
6. Move to next task

Example workflow:
> "Let's work on Task 1.5: Email Parser with Gemini. Here's the spec..."
> [Claude generates code]
> "Test it with this sample email: [paste email]"
> [Claude tests and fixes]
> "Great, now let's move to Task 1.6: Truck Selector"
```

### 6.2 Prompt Tips for Claude Code

1. **Be specific about file locations**
   - "Create /src/lib/services/email-parser.ts"
   - "Update /src/app/api/analyze/route.ts"

2. **Reference existing code**
   - "Use the TruckType interface from /src/types/"
   - "Follow the same pattern as customer-service.ts"

3. **Include test cases**
   - "Test with this sample email: ..."
   - "Verify that 10'6" parses to 10.5 feet"

4. **Request error handling**
   - "Handle Gemini API rate limits"
   - "Return helpful error messages"

5. **Ask for verification**
   - "Show me how to test this endpoint"
   - "What would the response look like for this input?"

---

## 7. TESTING STRATEGY

### 7.1 Unit Tests

```
Focus areas:
- Unit converter: All conversions accurate
- Truck selector: Height calculations correct
- Permit calculator: Fee calculations accurate
- State detector: State boundaries correct
```

### 7.2 Integration Tests

```
Test full flows:
- Email → Parse → Recommend → Works
- Route → States → Permits → Correct totals
- Quote generation → PDF → Downloads
```

### 7.3 E2E Tests (Playwright)

```
Critical paths:
- User can paste email and get recommendation
- User can calculate route and see permit costs
- User can generate and download quote PDF
```

---

## 8. DEPLOYMENT CHECKLIST

### 8.1 Pre-Deployment

- [ ] All environment variables set in Vercel
- [ ] Database migrated in production
- [ ] Seed data loaded
- [ ] Clerk webhooks configured
- [ ] Custom domain configured
- [ ] Error monitoring set up (Sentry)

### 8.2 Environment Variables

```
DATABASE_URL=
GEMINI_API_KEY=
GEOAPIFY_API_KEY=
LOW_CLEARANCE_MAP_API_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

---

*End of Part 7: Development Roadmap & Task Breakdown*
