# LOAD PLANNER - Deep Dive Planning Document
## Part 3: Complete Database Schema

---

## 1. SCHEMA OVERVIEW

### 1.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOAD PLANNER DATABASE SCHEMA                          │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌───────────┐         ┌───────────┐         ┌───────────┐
    │   User    │────────<│  Company  │>────────│  Setting  │
    └───────────┘         └───────────┘         └───────────┘
          │                     │
          │                     │
          ▼                     ▼
    ┌───────────┐         ┌───────────┐
    │  Quote    │<────────│  Customer │
    └───────────┘         └───────────┘
          │                     │
          │                     │
          ▼                     ▼
    ┌───────────┐         ┌───────────┐
    │   Load    │<────────│   Load    │
    │           │         │   Item    │
    └───────────┘         └───────────┘
          │
          │
          ▼
    ┌───────────┐         ┌───────────┐         ┌───────────┐
    │   Route   │────────>│  Route    │<────────│   State   │
    │           │         │  State    │         │  Permit   │
    └───────────┘         └───────────┘         └───────────┘
          │
          │
          ▼
    ┌───────────┐         ┌───────────┐
    │ Clearance │         │  Escort   │
    │   Issue   │         │Requirement│
    └───────────┘         └───────────┘


    Reference Tables (Static):
    ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐
    │TruckType  │  │StatePermit│  │EscortRule │  │LegalLimit │
    └───────────┘  └───────────┘  └───────────┘  └───────────┘
```

### 1.2 Table Summary

| Table | Purpose | Phase |
|-------|---------|-------|
| `users` | Clerk user sync, preferences | 3 |
| `companies` | Multi-tenant organization | 5 |
| `customers` | Customer contacts | 3 |
| `loads` | Load requests with items | 2 |
| `load_items` | Individual cargo pieces | 2 |
| `routes` | Calculated routes | 2 |
| `route_states` | States crossed by route | 2 |
| `clearance_issues` | Low bridge warnings | 2 |
| `quotes` | Generated quotes | 3 |
| `quote_line_items` | Quote pricing breakdown | 3 |
| `escort_requirements` | Escort needs per state | 2 |
| `truck_types` | Truck specifications | 1 |
| `state_permits` | State permit data | 2 |
| `escort_rules` | Escort trigger rules | 2 |
| `legal_limits` | Federal/state limits | 2 |
| `audit_logs` | Change tracking | 4 |
| `api_keys` | External API access | 5 |

---

## 2. COMPLETE PRISMA SCHEMA

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// =============================================================================
// USER & COMPANY MODELS
// =============================================================================

model User {
  id              String    @id @default(cuid())
  clerkId         String    @unique                // Clerk user ID
  email           String    @unique
  firstName       String?
  lastName        String?
  avatarUrl       String?
  role            UserRole  @default(USER)
  
  // Company association (for multi-tenant)
  companyId       String?
  company         Company?  @relation(fields: [companyId], references: [id])
  
  // User preferences (stored as JSON for flexibility)
  preferences     Json      @default("{}")
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastActiveAt    DateTime?
  
  // Relations
  quotes          Quote[]
  customers       Customer[]
  loads           Load[]
  auditLogs       AuditLog[]
  apiKeys         ApiKey[]
  
  @@index([clerkId])
  @@index([email])
  @@index([companyId])
}

enum UserRole {
  ADMIN           // Full access, can manage users
  USER            // Create/edit loads, quotes, customers
  VIEWER          // Read-only access
}

model Company {
  id              String    @id @default(cuid())
  name            String
  slug            String    @unique               // URL-friendly identifier
  
  // Contact info
  phone           String?
  email           String?
  website         String?
  
  // Address
  address         String?
  city            String?
  state           String?
  zip             String?
  
  // Branding
  logoUrl         String?
  primaryColor    String?   @default("#2563eb")
  
  // Settings
  settings        Json      @default("{}")        // Company-wide settings
  
  // Subscription
  plan            CompanyPlan @default(FREE)
  planExpiresAt   DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  users           User[]
  customers       Customer[]
  loads           Load[]
  quotes          Quote[]
  apiKeys         ApiKey[]
  
  @@index([slug])
}

enum CompanyPlan {
  FREE
  STARTER
  PROFESSIONAL
  ENTERPRISE
}

model UserPreferences {
  id                      String    @id @default(cuid())
  userId                  String    @unique
  
  // Default pricing
  defaultMileageRate      Float     @default(3.50)
  defaultFuelSurcharge    Float     @default(15)      // percentage
  defaultMinimumCharge    Float     @default(500)
  
  // Display preferences
  distanceUnit            String    @default("miles") // miles | kilometers
  weightUnit              String    @default("lbs")   // lbs | kg
  dimensionUnit           String    @default("feet")  // feet | meters
  
  // Notification preferences
  emailNotifications      Boolean   @default(true)
  quoteReminders          Boolean   @default(true)
  
  // Timezone
  timezone                String    @default("America/Chicago")
  
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt
}

// =============================================================================
// CUSTOMER MODEL
// =============================================================================

model Customer {
  id              String    @id @default(cuid())
  
  // Basic info
  name            String
  company         String?
  
  // Contact
  email           String?
  phone           String?
  fax             String?
  
  // Address
  address         String?
  city            String?
  state           String?
  zip             String?
  country         String    @default("US")
  
  // Classification
  type            CustomerType @default(SHIPPER)
  status          CustomerStatus @default(ACTIVE)
  
  // Billing
  paymentTerms    String?   @default("Net 30")
  creditLimit     Float?
  taxExempt       Boolean   @default(false)
  taxId           String?
  
  // Preferences
  preferredContact String?  // email | phone | fax
  notes           String?
  tags            String[]  @default([])
  
  // Custom fields (flexible JSON)
  customFields    Json      @default("{}")
  
  // Ownership
  createdById     String
  createdBy       User      @relation(fields: [createdById], references: [id])
  companyId       String?
  companyOrg      Company?  @relation(fields: [companyId], references: [id])
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  loads           Load[]
  quotes          Quote[]
  
  @@index([name])
  @@index([email])
  @@index([createdById])
  @@index([companyId])
}

enum CustomerType {
  SHIPPER         // Has cargo to ship
  BROKER          // Arranges freight
  CARRIER         // Transports freight
  CONSIGNEE       // Receives freight
  OTHER
}

enum CustomerStatus {
  ACTIVE
  INACTIVE
  PROSPECT
  BLOCKED
}

// =============================================================================
// LOAD MODELS
// =============================================================================

model Load {
  id              String    @id @default(cuid())
  
  // Reference
  loadNumber      String    @unique               // Auto-generated: LD-2024-00001
  
  // Description
  description     String
  loadType        LoadType  @default(STANDARD)
  
  // Origin
  originAddress   String?
  originCity      String
  originState     String
  originZip       String?
  originLat       Float?
  originLon       Float?
  originNotes     String?
  
  // Destination
  destAddress     String?
  destCity        String
  destState       String
  destZip         String?
  destLat         Float?
  destLon         Float?
  destNotes       String?
  
  // Dates
  pickupDate      DateTime?
  pickupTimeStart String?   // e.g., "08:00"
  pickupTimeEnd   String?   // e.g., "17:00"
  deliveryDate    DateTime?
  deliveryTimeStart String?
  deliveryTimeEnd String?
  
  // Overall dimensions (calculated from items)
  totalLength     Float?    // feet (overall)
  totalWidth      Float?    // feet (max of items)
  totalHeight     Float?    // feet (cargo + deck)
  totalWeight     Float?    // lbs (sum of items)
  grossWeight     Float?    // lbs (cargo + truck)
  
  // Truck recommendation
  recommendedTruck String?  // truck type ID
  selectedTruck   String?   // user-selected truck ID
  
  // Permit flags
  isOversize      Boolean   @default(false)
  isOverweight    Boolean   @default(false)
  isSuperload     Boolean   @default(false)
  oversizeReasons String[]  @default([])
  overweightReasons String[] @default([])
  
  // Status
  status          LoadStatus @default(DRAFT)
  
  // Raw input (for AI parsing)
  rawInput        String?   // Original email/text
  rawInputType    String?   // email | manual | api
  parseConfidence Float?    // 0-1 AI confidence
  
  // Notes
  specialNotes    String?
  internalNotes   String?
  
  // Custom fields
  customFields    Json      @default("{}")
  
  // Ownership
  customerId      String?
  customer        Customer? @relation(fields: [customerId], references: [id])
  createdById     String
  createdBy       User      @relation(fields: [createdById], references: [id])
  companyId       String?
  company         Company?  @relation(fields: [companyId], references: [id])
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  items           LoadItem[]
  route           Route?
  quotes          Quote[]
  
  @@index([loadNumber])
  @@index([status])
  @@index([createdById])
  @@index([customerId])
  @@index([companyId])
  @@index([createdAt])
}

enum LoadType {
  STANDARD        // Normal freight
  HEAVY_HAUL      // Overweight
  OVERSIZE        // Over dimensional
  SUPERLOAD       // Exceeds superload thresholds
  HAZMAT          // Hazardous materials
  SPECIALIZED     // Requires special equipment
}

enum LoadStatus {
  DRAFT           // Initial creation
  ANALYZED        // AI parsed and truck selected
  ROUTED          // Route calculated
  QUOTED          // Quote generated
  BOOKED          // Customer accepted
  IN_TRANSIT      // Currently moving
  DELIVERED       // Completed
  CANCELLED       // Cancelled
}

model LoadItem {
  id              String    @id @default(cuid())
  loadId          String
  load            Load      @relation(fields: [loadId], references: [id], onDelete: Cascade)
  
  // Item description
  description     String
  quantity        Int       @default(1)
  
  // Dimensions (normalized to feet)
  length          Float     // feet
  width           Float     // feet
  height          Float     // feet
  
  // Original dimensions (as entered)
  lengthOriginal  Float?
  lengthUnit      String?   // ft | in | m | cm
  widthOriginal   Float?
  widthUnit       String?
  heightOriginal  Float?
  heightUnit      String?
  
  // Weight (normalized to lbs)
  weight          Float     // lbs
  weightOriginal  Float?
  weightUnit      String?   // lbs | tons | kg | mt
  
  // Characteristics
  isStackable     Boolean   @default(false)
  maxStackWeight  Float?    // Max weight that can be placed on top
  isFragile       Boolean   @default(false)
  requiresTarp    Boolean   @default(false)
  
  // Loading
  loadingMethod   String?   // crane | forklift | drive_on | roll_on
  hasLiftPoints   Boolean   @default(false)
  tieDownPoints   Int?      // Number of tie-down points
  
  // Notes
  notes           String?
  
  // Order
  sortOrder       Int       @default(0)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([loadId])
}

// =============================================================================
// ROUTE MODELS
// =============================================================================

model Route {
  id              String    @id @default(cuid())
  loadId          String    @unique
  load            Load      @relation(fields: [loadId], references: [id], onDelete: Cascade)
  
  // Route basics
  totalMiles      Float
  totalKilometers Float
  estimatedTime   Int       // seconds
  
  // Geometry (GeoJSON LineString)
  geometry        Json
  
  // Bounds
  boundsNorth     Float
  boundsSouth     Float
  boundsEast      Float
  boundsWest      Float
  
  // Vehicle parameters used
  vehicleHeight   Float     // feet
  vehicleWidth    Float     // feet
  vehicleLength   Float     // feet
  vehicleWeight   Float     // lbs
  
  // Options used
  avoidTolls      Boolean   @default(false)
  avoidHighways   Boolean   @default(false)
  
  // Totals
  totalPermitCost Float     @default(0)
  totalEscortCost Float     @default(0)
  totalPoliceCost Float     @default(0)
  
  // Status
  clearanceStatus ClearanceStatus @default(UNCHECKED)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  states          RouteState[]
  clearanceIssues ClearanceIssue[]
  escortRequirements EscortRequirement[]
  
  @@index([loadId])
}

enum ClearanceStatus {
  UNCHECKED       // Not yet checked
  CLEAR           // All clearances OK
  WARNING         // Marginal clearances
  BLOCKED         // Won't fit somewhere
}

model RouteState {
  id              String    @id @default(cuid())
  routeId         String
  route           Route     @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  // State info
  stateCode       String    // Two-letter code
  stateName       String
  
  // Distance in state
  miles           Float
  kilometers      Float
  estimatedTime   Int       // seconds
  
  // Entry/exit points [lon, lat]
  entryLon        Float
  entryLat        Float
  exitLon         Float
  exitLat         Float
  
  // Permit costs for this state
  oversizePermitFee Float   @default(0)
  overweightPermitFee Float @default(0)
  superloadFee    Float     @default(0)
  mileageFee      Float     @default(0)
  otherFees       Float     @default(0)
  totalStateCost  Float     @default(0)
  
  // Permit details
  permitType      String?   // single_trip | annual | none
  processingTime  String?
  permitNotes     String[]  @default([])
  
  // Order in route
  sortOrder       Int       @default(0)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([routeId])
  @@index([stateCode])
}

model ClearanceIssue {
  id              String    @id @default(cuid())
  routeId         String
  route           Route     @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  // Location [lon, lat]
  longitude       Float
  latitude        Float
  
  // Obstacle info
  obstacleType    String    // bridge | tunnel | overpass | utility
  clearanceHeight Float     // feet
  description     String
  roadName        String?
  mileMarker      Float?
  
  // Comparison
  loadHeight      Float     // feet
  margin          Float     // feet (negative = won't fit)
  
  // Distance from start
  distanceFromStart Float   // miles
  
  // Severity
  severity        ClearanceSeverity
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([routeId])
}

enum ClearanceSeverity {
  INFO            // Plenty of clearance, just FYI
  WARNING         // Less than 1ft margin
  CRITICAL        // Less than 0.5ft margin
  BLOCKED         // Won't fit
}

model EscortRequirement {
  id              String    @id @default(cuid())
  routeId         String
  route           Route     @relation(fields: [routeId], references: [id], onDelete: Cascade)
  
  // State
  stateCode       String
  stateName       String
  
  // What's required
  leadCarRequired Boolean   @default(false)
  chaseCarRequired Boolean  @default(false)
  poleCarRequired Boolean   @default(false)
  policeRequired  Boolean   @default(false)
  
  // Why required
  triggerReason   String    // Width > 12ft, Height > 15ft, etc.
  
  // Costs
  escortCostPerMile Float   @default(1.75)
  miles           Float
  totalEscortCost Float     @default(0)
  policeCost      Float     @default(0)
  
  // Notes
  notes           String[]  @default([])
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([routeId])
  @@index([stateCode])
}

// =============================================================================
// QUOTE MODELS
// =============================================================================

model Quote {
  id              String    @id @default(cuid())
  
  // Reference
  quoteNumber     String    @unique               // Q-2024-00001
  
  // Status
  status          QuoteStatus @default(DRAFT)
  
  // Relations
  loadId          String
  load            Load      @relation(fields: [loadId], references: [id])
  customerId      String
  customer        Customer  @relation(fields: [customerId], references: [id])
  createdById     String
  createdBy       User      @relation(fields: [createdById], references: [id])
  companyId       String?
  company         Company?  @relation(fields: [companyId], references: [id])
  
  // Pricing inputs
  baseMileageRate Float     // $/mile
  fuelSurchargePercent Float // e.g., 15 for 15%
  
  // Calculated totals
  lineHaul        Float     // baseMileageRate * miles
  fuelSurcharge   Float     // lineHaul * fuelSurchargePercent
  permitFees      Float     // Sum of all permit costs
  escortFees      Float     // Sum of escort costs
  policeEscorts   Float     // Sum of police escort costs
  additionalFees  Float     @default(0)
  subtotal        Float
  discount        Float     @default(0)
  discountReason  String?
  total           Float
  
  // Validity
  validUntil      DateTime?
  
  // Notes
  publicNotes     String?   // Shown to customer
  internalNotes   String?   // Internal only
  terms           String?   // Terms and conditions
  
  // Tracking
  sentAt          DateTime?
  viewedAt        DateTime?
  acceptedAt      DateTime?
  declinedAt      DateTime?
  declineReason   String?
  
  // Versions
  version         Int       @default(1)
  parentQuoteId   String?   // If this is a revision
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  // Relations
  lineItems       QuoteLineItem[]
  
  @@index([quoteNumber])
  @@index([status])
  @@index([loadId])
  @@index([customerId])
  @@index([createdById])
  @@index([companyId])
  @@index([createdAt])
}

enum QuoteStatus {
  DRAFT           // Being created
  PENDING         // Ready to send
  SENT            // Sent to customer
  VIEWED          // Customer viewed
  ACCEPTED        // Customer accepted
  DECLINED        // Customer declined
  EXPIRED         // Past validUntil
  CANCELLED       // Manually cancelled
  REVISED         // Replaced by new version
}

model QuoteLineItem {
  id              String    @id @default(cuid())
  quoteId         String
  quote           Quote     @relation(fields: [quoteId], references: [id], onDelete: Cascade)
  
  // Line item type
  type            LineItemType
  
  // Description
  description     String
  
  // Quantity and rate
  quantity        Float     @default(1)
  unit            String?   // miles, each, flat, etc.
  rate            Float
  amount          Float     // quantity * rate
  
  // State-specific (for permits/escorts)
  stateCode       String?
  
  // Taxable
  isTaxable       Boolean   @default(false)
  
  // Notes
  notes           String?
  
  // Order
  sortOrder       Int       @default(0)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([quoteId])
}

enum LineItemType {
  LINE_HAUL       // Base mileage charge
  FUEL_SURCHARGE  // Fuel surcharge
  PERMIT_OVERSIZE // Oversize permit
  PERMIT_OVERWEIGHT // Overweight permit
  PERMIT_SUPERLOAD // Superload permit
  PERMIT_MILEAGE  // Per-mile permit fees
  ESCORT_LEAD     // Lead car escort
  ESCORT_CHASE    // Chase car escort
  ESCORT_POLE     // Pole car
  ESCORT_POLICE   // Police escort
  ADDITIONAL      // Additional charges
  DISCOUNT        // Discounts (negative)
}

// =============================================================================
// REFERENCE DATA MODELS (Static, managed via admin)
// =============================================================================

model TruckType {
  id              String    @id @default(cuid())
  
  // Identity
  code            String    @unique               // flatbed-48
  name            String                          // 48ft Flatbed
  category        String                          // flatbed
  
  // Deck specifications (JSON for flexibility)
  deckSpecs       Json
  // {
  //   length: 48,
  //   width: 8.5,
  //   deckHeight: 5.0,
  //   wellLength: null,
  //   wellDepth: null
  // }
  
  // Capacity
  maxWeight       Int                             // lbs
  maxConcentrated Int?                            // lbs per linear foot
  typicalTareWeight Int                           // empty trailer weight
  
  // Features
  features        String[]  @default([])
  bestFor         String[]  @default([])
  limitations     String[]  @default([])
  
  // Variations (JSON array)
  variations      Json      @default("[]")
  
  // Status
  isActive        Boolean   @default(true)
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([category])
  @@index([isActive])
}

model StatePermitData {
  id              String    @id @default(cuid())
  
  // State identity
  stateCode       String    @unique
  stateName       String
  timezone        String
  
  // Legal limits (JSON)
  legalLimits     Json
  // {
  //   maxWidth: 8.5,
  //   maxHeight: 13.5,
  //   maxLength: { single: 45, combination: 65 },
  //   maxWeight: { gross: 80000, perAxle: {...} }
  // }
  
  // Permit fees (JSON)
  oversizePermits Json
  overweightPermits Json
  superloadThresholds Json
  
  // Escort rules (JSON)
  escortRules     Json
  
  // Travel restrictions (JSON)
  travelRestrictions Json
  
  // Contact info (JSON)
  contact         Json
  
  // Notes
  notes           String[]  @default([])
  
  // Status
  isActive        Boolean   @default(true)
  lastVerified    DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([stateCode])
  @@index([isActive])
}

// =============================================================================
// SYSTEM MODELS
// =============================================================================

model AuditLog {
  id              String    @id @default(cuid())
  
  // Who
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])
  userEmail       String?   // Denormalized for when user deleted
  
  // What
  action          String    // CREATE | UPDATE | DELETE | VIEW
  entityType      String    // Load | Quote | Customer | etc.
  entityId        String
  
  // Details
  changes         Json?     // { field: { old: x, new: y } }
  metadata        Json?     // Additional context
  
  // When
  createdAt       DateTime  @default(now())
  
  // Request info
  ipAddress       String?
  userAgent       String?
  
  @@index([userId])
  @@index([entityType, entityId])
  @@index([createdAt])
}

model ApiKey {
  id              String    @id @default(cuid())
  
  // Key info
  name            String
  keyHash         String    @unique               // Hashed key (never store plain)
  keyPrefix       String                          // First 8 chars for identification
  
  // Owner
  userId          String?
  user            User?     @relation(fields: [userId], references: [id])
  companyId       String?
  company         Company?  @relation(fields: [companyId], references: [id])
  
  // Permissions
  scopes          String[]  @default(["read"])    // read | write | admin
  
  // Rate limiting
  rateLimit       Int       @default(100)         // requests per minute
  
  // Status
  isActive        Boolean   @default(true)
  expiresAt       DateTime?
  lastUsedAt      DateTime?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([keyHash])
  @@index([userId])
  @@index([companyId])
}

// =============================================================================
// GEOCODING CACHE
// =============================================================================

model GeocodedAddress {
  id              String    @id @default(cuid())
  
  // Input
  inputAddress    String    @unique               // Normalized input
  
  // Result
  formattedAddress String
  city            String
  state           String
  zip             String?
  country         String    @default("US")
  latitude        Float
  longitude       Float
  
  // Provider info
  provider        String    @default("geoapify")
  confidence      Float?
  
  // Timestamps
  createdAt       DateTime  @default(now())
  
  @@index([inputAddress])
  @@index([city, state])
}
```

---

## 3. DATABASE INDEXES

### 3.1 Primary Indexes

All tables have a primary key index on `id` (automatically created by Prisma).

### 3.2 Unique Indexes

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| `users` | `clerkId` | Clerk integration |
| `users` | `email` | Login lookup |
| `companies` | `slug` | URL routing |
| `loads` | `loadNumber` | Reference lookup |
| `quotes` | `quoteNumber` | Reference lookup |
| `truck_types` | `code` | API lookup |
| `state_permit_data` | `stateCode` | State lookup |
| `geocoded_addresses` | `inputAddress` | Cache lookup |
| `api_keys` | `keyHash` | Auth lookup |

### 3.3 Foreign Key Indexes

| Table | Column | References |
|-------|--------|------------|
| `users` | `companyId` | `companies.id` |
| `customers` | `createdById` | `users.id` |
| `customers` | `companyId` | `companies.id` |
| `loads` | `customerId` | `customers.id` |
| `loads` | `createdById` | `users.id` |
| `loads` | `companyId` | `companies.id` |
| `load_items` | `loadId` | `loads.id` |
| `routes` | `loadId` | `loads.id` |
| `route_states` | `routeId` | `routes.id` |
| `clearance_issues` | `routeId` | `routes.id` |
| `escort_requirements` | `routeId` | `routes.id` |
| `quotes` | `loadId` | `loads.id` |
| `quotes` | `customerId` | `customers.id` |
| `quotes` | `createdById` | `users.id` |
| `quotes` | `companyId` | `companies.id` |
| `quote_line_items` | `quoteId` | `quotes.id` |
| `audit_logs` | `userId` | `users.id` |
| `api_keys` | `userId` | `users.id` |
| `api_keys` | `companyId` | `companies.id` |

### 3.4 Query Optimization Indexes

```sql
-- Common query patterns

-- Find loads by date range
CREATE INDEX idx_loads_created_at ON loads(created_at DESC);
CREATE INDEX idx_loads_pickup_date ON loads(pickup_date);

-- Find quotes by status
CREATE INDEX idx_quotes_status_created ON quotes(status, created_at DESC);

-- Find by company (multi-tenant)
CREATE INDEX idx_loads_company ON loads(company_id, created_at DESC);
CREATE INDEX idx_quotes_company ON quotes(company_id, created_at DESC);
CREATE INDEX idx_customers_company ON customers(company_id, name);

-- Search by customer name
CREATE INDEX idx_customers_name_trgm ON customers USING gin(name gin_trgm_ops);

-- Search by load number
CREATE INDEX idx_loads_number_trgm ON loads USING gin(load_number gin_trgm_ops);

-- Route state queries
CREATE INDEX idx_route_states_state ON route_states(state_code);

-- Audit log queries
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
```

---

## 4. DATABASE MIGRATIONS

### 4.1 Initial Migration (Phase 1)

```sql
-- 001_initial_schema.sql

-- Create enums
CREATE TYPE user_role AS ENUM ('ADMIN', 'USER', 'VIEWER');
CREATE TYPE company_plan AS ENUM ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- Users table (minimal for Phase 1)
CREATE TABLE users (
  id VARCHAR(25) PRIMARY KEY,
  clerk_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role user_role DEFAULT 'USER',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Truck types (reference data)
CREATE TABLE truck_types (
  id VARCHAR(25) PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  deck_specs JSONB NOT NULL,
  max_weight INTEGER NOT NULL,
  max_concentrated INTEGER,
  typical_tare_weight INTEGER NOT NULL,
  features TEXT[] DEFAULT '{}',
  best_for TEXT[] DEFAULT '{}',
  limitations TEXT[] DEFAULT '{}',
  variations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_truck_types_category ON truck_types(category);
```

### 4.2 Phase 2 Migration

```sql
-- 002_loads_and_routes.sql

CREATE TYPE load_type AS ENUM ('STANDARD', 'HEAVY_HAUL', 'OVERSIZE', 'SUPERLOAD', 'HAZMAT', 'SPECIALIZED');
CREATE TYPE load_status AS ENUM ('DRAFT', 'ANALYZED', 'ROUTED', 'QUOTED', 'BOOKED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');
CREATE TYPE clearance_status AS ENUM ('UNCHECKED', 'CLEAR', 'WARNING', 'BLOCKED');
CREATE TYPE clearance_severity AS ENUM ('INFO', 'WARNING', 'CRITICAL', 'BLOCKED');

-- Loads table
CREATE TABLE loads (
  id VARCHAR(25) PRIMARY KEY,
  load_number VARCHAR(20) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  load_type load_type DEFAULT 'STANDARD',
  
  -- Origin
  origin_address TEXT,
  origin_city VARCHAR(100) NOT NULL,
  origin_state VARCHAR(2) NOT NULL,
  origin_zip VARCHAR(10),
  origin_lat DOUBLE PRECISION,
  origin_lon DOUBLE PRECISION,
  origin_notes TEXT,
  
  -- Destination
  dest_address TEXT,
  dest_city VARCHAR(100) NOT NULL,
  dest_state VARCHAR(2) NOT NULL,
  dest_zip VARCHAR(10),
  dest_lat DOUBLE PRECISION,
  dest_lon DOUBLE PRECISION,
  dest_notes TEXT,
  
  -- Dates
  pickup_date DATE,
  pickup_time_start VARCHAR(5),
  pickup_time_end VARCHAR(5),
  delivery_date DATE,
  delivery_time_start VARCHAR(5),
  delivery_time_end VARCHAR(5),
  
  -- Dimensions
  total_length DOUBLE PRECISION,
  total_width DOUBLE PRECISION,
  total_height DOUBLE PRECISION,
  total_weight DOUBLE PRECISION,
  gross_weight DOUBLE PRECISION,
  
  -- Truck
  recommended_truck VARCHAR(50),
  selected_truck VARCHAR(50),
  
  -- Permit flags
  is_oversize BOOLEAN DEFAULT FALSE,
  is_overweight BOOLEAN DEFAULT FALSE,
  is_superload BOOLEAN DEFAULT FALSE,
  oversize_reasons TEXT[] DEFAULT '{}',
  overweight_reasons TEXT[] DEFAULT '{}',
  
  -- Status
  status load_status DEFAULT 'DRAFT',
  
  -- Raw input
  raw_input TEXT,
  raw_input_type VARCHAR(20),
  parse_confidence DOUBLE PRECISION,
  
  -- Notes
  special_notes TEXT,
  internal_notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  
  -- Ownership
  customer_id VARCHAR(25),
  created_by_id VARCHAR(25) NOT NULL REFERENCES users(id),
  company_id VARCHAR(25),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Load items
CREATE TABLE load_items (
  id VARCHAR(25) PRIMARY KEY,
  load_id VARCHAR(25) NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  
  -- Dimensions (normalized)
  length DOUBLE PRECISION NOT NULL,
  width DOUBLE PRECISION NOT NULL,
  height DOUBLE PRECISION NOT NULL,
  weight DOUBLE PRECISION NOT NULL,
  
  -- Original values
  length_original DOUBLE PRECISION,
  length_unit VARCHAR(5),
  width_original DOUBLE PRECISION,
  width_unit VARCHAR(5),
  height_original DOUBLE PRECISION,
  height_unit VARCHAR(5),
  weight_original DOUBLE PRECISION,
  weight_unit VARCHAR(5),
  
  -- Characteristics
  is_stackable BOOLEAN DEFAULT FALSE,
  max_stack_weight DOUBLE PRECISION,
  is_fragile BOOLEAN DEFAULT FALSE,
  requires_tarp BOOLEAN DEFAULT FALSE,
  loading_method VARCHAR(20),
  has_lift_points BOOLEAN DEFAULT FALSE,
  tie_down_points INTEGER,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Routes
CREATE TABLE routes (
  id VARCHAR(25) PRIMARY KEY,
  load_id VARCHAR(25) UNIQUE NOT NULL REFERENCES loads(id) ON DELETE CASCADE,
  
  total_miles DOUBLE PRECISION NOT NULL,
  total_kilometers DOUBLE PRECISION NOT NULL,
  estimated_time INTEGER NOT NULL,
  
  geometry JSONB NOT NULL,
  bounds_north DOUBLE PRECISION NOT NULL,
  bounds_south DOUBLE PRECISION NOT NULL,
  bounds_east DOUBLE PRECISION NOT NULL,
  bounds_west DOUBLE PRECISION NOT NULL,
  
  vehicle_height DOUBLE PRECISION NOT NULL,
  vehicle_width DOUBLE PRECISION NOT NULL,
  vehicle_length DOUBLE PRECISION NOT NULL,
  vehicle_weight DOUBLE PRECISION NOT NULL,
  
  avoid_tolls BOOLEAN DEFAULT FALSE,
  avoid_highways BOOLEAN DEFAULT FALSE,
  
  total_permit_cost DOUBLE PRECISION DEFAULT 0,
  total_escort_cost DOUBLE PRECISION DEFAULT 0,
  total_police_cost DOUBLE PRECISION DEFAULT 0,
  
  clearance_status clearance_status DEFAULT 'UNCHECKED',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Route states
CREATE TABLE route_states (
  id VARCHAR(25) PRIMARY KEY,
  route_id VARCHAR(25) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  
  state_code VARCHAR(2) NOT NULL,
  state_name VARCHAR(50) NOT NULL,
  miles DOUBLE PRECISION NOT NULL,
  kilometers DOUBLE PRECISION NOT NULL,
  estimated_time INTEGER NOT NULL,
  
  entry_lon DOUBLE PRECISION NOT NULL,
  entry_lat DOUBLE PRECISION NOT NULL,
  exit_lon DOUBLE PRECISION NOT NULL,
  exit_lat DOUBLE PRECISION NOT NULL,
  
  oversize_permit_fee DOUBLE PRECISION DEFAULT 0,
  overweight_permit_fee DOUBLE PRECISION DEFAULT 0,
  superload_fee DOUBLE PRECISION DEFAULT 0,
  mileage_fee DOUBLE PRECISION DEFAULT 0,
  other_fees DOUBLE PRECISION DEFAULT 0,
  total_state_cost DOUBLE PRECISION DEFAULT 0,
  
  permit_type VARCHAR(20),
  processing_time VARCHAR(50),
  permit_notes TEXT[] DEFAULT '{}',
  
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clearance issues
CREATE TABLE clearance_issues (
  id VARCHAR(25) PRIMARY KEY,
  route_id VARCHAR(25) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  
  longitude DOUBLE PRECISION NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  
  obstacle_type VARCHAR(20) NOT NULL,
  clearance_height DOUBLE PRECISION NOT NULL,
  description TEXT NOT NULL,
  road_name VARCHAR(100),
  mile_marker DOUBLE PRECISION,
  
  load_height DOUBLE PRECISION NOT NULL,
  margin DOUBLE PRECISION NOT NULL,
  distance_from_start DOUBLE PRECISION NOT NULL,
  
  severity clearance_severity NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- State permit data (reference)
CREATE TABLE state_permit_data (
  id VARCHAR(25) PRIMARY KEY,
  state_code VARCHAR(2) UNIQUE NOT NULL,
  state_name VARCHAR(50) NOT NULL,
  timezone VARCHAR(50) NOT NULL,
  
  legal_limits JSONB NOT NULL,
  oversize_permits JSONB NOT NULL,
  overweight_permits JSONB NOT NULL,
  superload_thresholds JSONB NOT NULL,
  escort_rules JSONB NOT NULL,
  travel_restrictions JSONB NOT NULL,
  contact JSONB NOT NULL,
  
  notes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_loads_load_number ON loads(load_number);
CREATE INDEX idx_loads_status ON loads(status);
CREATE INDEX idx_loads_created_by ON loads(created_by_id);
CREATE INDEX idx_loads_created_at ON loads(created_at DESC);
CREATE INDEX idx_load_items_load ON load_items(load_id);
CREATE INDEX idx_routes_load ON routes(load_id);
CREATE INDEX idx_route_states_route ON route_states(route_id);
CREATE INDEX idx_route_states_state ON route_states(state_code);
CREATE INDEX idx_clearance_route ON clearance_issues(route_id);
```

---

## 5. SEED DATA

### 5.1 Truck Types Seed

```typescript
// prisma/seed/truck-types.ts

import { PrismaClient } from '@prisma/client';

const trucks = [
  {
    code: 'flatbed-48',
    name: '48ft Flatbed',
    category: 'flatbed',
    deckSpecs: {
      length: 48,
      width: 8.5,
      deckHeight: 5.0,
    },
    maxWeight: 48000,
    maxConcentrated: 4000,
    typicalTareWeight: 14000,
    features: ['Side loading', 'Top loading', 'Tarping available'],
    bestFor: ['Steel', 'Lumber', 'Building materials', 'Machinery under 8.5ft tall'],
    limitations: ['8.5ft max cargo height for legal', 'No weather protection'],
    variations: [
      { id: 'flatbed-48-standard', name: 'Standard 48ft', lengthRange: [48, 48] },
      { id: 'flatbed-53', name: '53ft Flatbed', lengthRange: [53, 53] },
    ],
  },
  // ... more trucks (complete list in architecture doc)
];

export async function seedTruckTypes(prisma: PrismaClient) {
  for (const truck of trucks) {
    await prisma.truckType.upsert({
      where: { code: truck.code },
      update: truck,
      create: {
        ...truck,
        id: `trk_${truck.code.replace(/-/g, '_')}`,
      },
    });
  }
}
```

### 5.2 State Permit Data Seed

```typescript
// prisma/seed/state-permits.ts

import { PrismaClient } from '@prisma/client';

const states = [
  {
    stateCode: 'TX',
    stateName: 'Texas',
    timezone: 'America/Chicago',
    legalLimits: {
      maxWidth: 8.5,
      maxHeight: 14.0,
      maxLength: { single: 45, combination: 65 },
      maxWeight: { gross: 80000, perAxle: { single: 20000, tandem: 34000, tridem: 42000 } },
    },
    oversizePermits: {
      singleTrip: {
        baseFee: 60,
        dimensionSurcharges: {
          width: [{ threshold: 12, fee: 30 }, { threshold: 14, fee: 60 }, { threshold: 16, fee: 120 }],
          height: [{ threshold: 15, fee: 30 }, { threshold: 17, fee: 90 }],
          length: [{ threshold: 110, fee: 30 }, { threshold: 125, fee: 60 }],
        },
        processingTime: 'Immediate (online)',
        validity: '5 days',
        onlineAvailable: true,
      },
    },
    overweightPermits: {
      singleTrip: {
        baseFee: 75,
        weightBrackets: [
          { upTo: 120000, fee: 75 },
          { upTo: 160000, fee: 150 },
          { upTo: 200000, fee: 225 },
        ],
      },
    },
    superloadThresholds: {
      width: 16, height: 18, length: 125, weight: 200000,
      requiresRouteSurvey: true, requiresBridgeAnalysis: true,
    },
    escortRules: {
      width: { oneEscort: 12, twoEscorts: 16, front: true, rear: true },
      height: { poleCar: 17 },
      length: { oneEscort: 110, twoEscorts: 125 },
      policeEscort: { width: 18, height: 18, fee: 350 },
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
      website: 'https://www.txdmv.gov/motor-carriers/oversize-overweight-permits',
      permitPortal: 'https://www.txpros.txdmv.gov/',
    },
    notes: ['Texas allows 14ft height on designated routes without permit'],
  },
  // ... more states (all 50)
];

export async function seedStatePermits(prisma: PrismaClient) {
  for (const state of states) {
    await prisma.statePermitData.upsert({
      where: { stateCode: state.stateCode },
      update: state,
      create: {
        ...state,
        id: `stp_${state.stateCode.toLowerCase()}`,
      },
    });
  }
}
```

---

## 6. QUERY EXAMPLES

### 6.1 Common Queries

```typescript
// Get load with all relations
const load = await prisma.load.findUnique({
  where: { loadNumber: 'LD-2024-00001' },
  include: {
    items: { orderBy: { sortOrder: 'asc' } },
    route: {
      include: {
        states: { orderBy: { sortOrder: 'asc' } },
        clearanceIssues: true,
        escortRequirements: true,
      },
    },
    customer: true,
    quotes: { where: { status: 'SENT' } },
  },
});

// Get user's recent loads with pagination
const loads = await prisma.load.findMany({
  where: {
    createdById: userId,
    status: { not: 'CANCELLED' },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
  skip: page * 20,
  include: {
    customer: { select: { name: true, company: true } },
    route: { select: { totalMiles: true, totalPermitCost: true } },
  },
});

// Search customers by name (with trigram index)
const customers = await prisma.$queryRaw`
  SELECT * FROM customers
  WHERE name % ${searchTerm}
  ORDER BY similarity(name, ${searchTerm}) DESC
  LIMIT 10
`;

// Get quote conversion rate by month
const stats = await prisma.$queryRaw`
  SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as total_quotes,
    COUNT(*) FILTER (WHERE status = 'ACCEPTED') as accepted,
    ROUND(COUNT(*) FILTER (WHERE status = 'ACCEPTED')::numeric / COUNT(*)::numeric * 100, 1) as conversion_rate
  FROM quotes
  WHERE created_at > NOW() - INTERVAL '12 months'
    AND company_id = ${companyId}
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month DESC
`;

// Get loads by state
const loadsByState = await prisma.$queryRaw`
  SELECT 
    rs.state_code,
    rs.state_name,
    COUNT(DISTINCT l.id) as load_count,
    SUM(rs.miles) as total_miles,
    SUM(rs.total_state_cost) as total_permit_cost
  FROM route_states rs
  JOIN routes r ON r.id = rs.route_id
  JOIN loads l ON l.id = r.load_id
  WHERE l.company_id = ${companyId}
    AND l.created_at > NOW() - INTERVAL '30 days'
  GROUP BY rs.state_code, rs.state_name
  ORDER BY load_count DESC
`;
```

---

*End of Part 3: Complete Database Schema*
