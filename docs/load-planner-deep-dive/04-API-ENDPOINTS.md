# LOAD PLANNER - Deep Dive Planning Document
## Part 4: Complete API Endpoints

---

## 1. API OVERVIEW

### 1.1 Base URL

- Development: `http://localhost:3000/api`
- Production: `https://loadplanner.app/api`

### 1.2 Authentication

All API routes (except `/api/analyze` in Phase 1) require authentication via Clerk.

```typescript
// Headers
Authorization: Bearer <clerk_session_token>

// Or via Clerk middleware (automatic for browser requests)
```

### 1.3 Response Format

All responses follow this structure:

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": { ... }  // Optional additional info
  }
}

// Paginated response
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 1.4 Common Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Unprocessable (parsing failed) |
| 429 | Rate Limited |
| 500 | Server Error |
| 502 | External API Error |

---

## 2. PHASE 1 ENDPOINTS

### 2.1 POST /api/analyze

**Purpose:** Parse load email and get truck recommendations (no auth required in Phase 1)

**Request:**
```typescript
POST /api/analyze
Content-Type: application/json

{
  "content": "string",           // Raw email or text content
  "options": {                   // Optional
    "includeAlternatives": true, // Include non-fitting trucks
    "parseOnly": false           // Just parse, don't select truck
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "parsed": {
      "confidence": 0.95,
      "items": [
        {
          "description": "CAT 320 Excavator",
          "quantity": 1,
          "length": { "value": 32, "unit": "ft", "normalized": 32 },
          "width": { "value": 10, "unit": "ft", "normalized": 10 },
          "height": { "value": 10.5, "unit": "ft", "normalized": 10.5 },
          "weight": { "value": 52000, "unit": "lbs", "normalized": 52000 },
          "notes": ["Track machine", "Non-running"]
        }
      ],
      "origin": {
        "city": "Houston",
        "state": "TX",
        "address": "1234 Industrial Blvd"
      },
      "destination": {
        "city": "Dallas",
        "state": "TX",
        "address": "5678 Construction Ave"
      },
      "pickupDate": "2024-01-15",
      "deliveryDate": null,
      "customerName": "ABC Construction",
      "customerEmail": "john@abcconstruction.com",
      "specialNotes": ["Needs ramps", "Pickup by noon"],
      "rawExtract": {
        "dimensions": ["32' x 10' x 10'6\""],
        "weights": ["52,000 lbs"],
        "locations": ["Houston, TX", "Dallas, TX"]
      }
    },
    "recommendations": [
      {
        "truck": {
          "id": "rgn-48",
          "name": "48ft RGN",
          "category": "rgn",
          "deckSpecs": {
            "length": 48,
            "width": 8.5,
            "deckHeight": 2.0,
            "wellLength": 29
          },
          "maxWeight": 42000
        },
        "score": 95,
        "fits": true,
        "fitDetails": {
          "lengthFits": true,
          "widthFits": false,
          "heightFits": true,
          "weightFits": false,
          "lengthMargin": 16,
          "widthMargin": -1.5,
          "heightMargin": 1,
          "weightMargin": -10000
        },
        "overallDimensions": {
          "totalLength": 32,
          "totalWidth": 10,
          "totalHeight": 12.5,
          "grossWeight": 72000
        },
        "permitRequired": {
          "oversize": true,
          "overweight": true,
          "superload": false,
          "reasons": [
            "Width 10ft > 8.5ft legal limit",
            "Gross weight 72,000 lbs < 80,000 lbs but cargo exceeds trailer capacity"
          ]
        },
        "pros": [
          "Ground-level loading for track equipment",
          "Detachable gooseneck",
          "Low deck height maximizes cargo height"
        ],
        "cons": [
          "Width requires oversize permit",
          "Weight at trailer capacity limit"
        ]
      },
      // ... more recommendations
    ],
    "bestMatch": { /* same as recommendations[0] */ },
    "warnings": [
      "Load is 1.5ft over-width - will require oversize permit in all states",
      "Weight is at RGN capacity limit - verify exact weight before booking"
    ]
  }
}
```

**Error Responses:**

```typescript
// 400 - Missing content
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Content is required",
    "details": { "field": "content" }
  }
}

// 422 - Could not parse
{
  "success": false,
  "error": {
    "code": "PARSE_ERROR",
    "message": "Could not extract load details from content",
    "details": {
      "confidence": 0.2,
      "extractedFields": ["origin"],
      "missingFields": ["dimensions", "weight", "destination"]
    }
  }
}

// 502 - AI API error
{
  "success": false,
  "error": {
    "code": "EXTERNAL_API_ERROR",
    "message": "Gemini API: Rate limit exceeded",
    "details": { "service": "gemini", "retryAfter": 60 }
  }
}
```

---

### 2.2 GET /api/trucks

**Purpose:** Get list of available truck types

**Request:**
```typescript
GET /api/trucks?category=flatbed&active=true
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | - | Filter by category |
| active | boolean | true | Only active trucks |

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "flatbed-48",
      "code": "flatbed-48",
      "name": "48ft Flatbed",
      "category": "flatbed",
      "deckSpecs": {
        "length": 48,
        "width": 8.5,
        "deckHeight": 5.0
      },
      "capacity": {
        "maxWeight": 48000,
        "maxConcentrated": 4000
      },
      "typicalTareWeight": 14000,
      "features": ["Side loading", "Top loading", "Tarping available"],
      "bestFor": ["Steel", "Lumber", "Building materials"],
      "limitations": ["8.5ft max cargo height for legal"],
      "variations": [
        { "id": "flatbed-48-standard", "name": "Standard 48ft", "lengthRange": [48, 48] },
        { "id": "flatbed-53", "name": "53ft Flatbed", "lengthRange": [53, 53] }
      ]
    },
    // ... more trucks
  ]
}
```

---

### 2.3 GET /api/trucks/[id]

**Purpose:** Get single truck type details

**Request:**
```typescript
GET /api/trucks/rgn-48
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "rgn-48",
    "code": "rgn-48",
    "name": "48ft RGN",
    "category": "rgn",
    // ... full truck details
  }
}
```

---

## 3. PHASE 2 ENDPOINTS

### 3.1 POST /api/routing/route

**Purpose:** Calculate route between origin and destination

**Request:**
```typescript
POST /api/routing/route
Content-Type: application/json

{
  "origin": {
    "address": "1234 Industrial Blvd, Houston, TX 77001"
    // OR
    "lat": 29.7604,
    "lon": -95.3698
  },
  "destination": {
    "address": "5678 Construction Ave, Dallas, TX 75201"
    // OR
    "lat": 32.7767,
    "lon": -96.7970
  },
  "waypoints": [                    // Optional
    { "address": "Austin, TX" }
  ],
  "vehicleParams": {
    "height": 13.5,                 // feet (overall)
    "width": 10,                    // feet
    "length": 65,                   // feet
    "weight": 72000                 // lbs (gross)
  },
  "options": {
    "avoidTolls": false,
    "avoidHighways": false,
    "checkClearances": true,        // Check low bridges
    "findAlternateIfBlocked": true  // Find alt route if clearance issue
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "route": {
      "totalMiles": 243,
      "totalKilometers": 391,
      "estimatedTime": 14580,       // seconds (4h 3m)
      "estimatedTimeFormatted": "4h 3m",
      "geometry": {
        "type": "LineString",
        "coordinates": [[-95.3698, 29.7604], /* ... */, [-96.7970, 32.7767]]
      },
      "bounds": {
        "north": 32.78,
        "south": 29.75,
        "east": -95.36,
        "west": -96.80
      }
    },
    "stateSegments": [
      {
        "state": "Texas",
        "stateCode": "TX",
        "miles": 243,
        "kilometers": 391,
        "entryPoint": [-95.3698, 29.7604],
        "exitPoint": [-96.7970, 32.7767],
        "estimatedTime": 14580
      }
    ],
    "clearanceCheck": {
      "safe": true,
      "obstacleCount": 2,
      "obstacles": [
        {
          "id": "br_i45_123",
          "type": "bridge",
          "location": [-95.42, 30.12],
          "clearanceHeight": 15.2,
          "loadHeight": 13.5,
          "margin": 1.7,
          "description": "I-45 Overpass at Exit 123",
          "roadName": "I-45",
          "distanceFromStart": 45.2,
          "severity": "INFO"
        }
      ],
      "minimumClearance": 14.8,
      "recommendations": []
    },
    "tollInfo": {
      "hasTolls": true,
      "estimatedTollCost": 12.50,
      "tollPlazas": [
        { "name": "Hardy Toll Road", "cost": 5.50 },
        { "name": "SH 130", "cost": 7.00 }
      ]
    },
    "warnings": []
  }
}
```

---

### 3.2 POST /api/routing/geocode

**Purpose:** Convert address to coordinates

**Request:**
```typescript
POST /api/routing/geocode
Content-Type: application/json

{
  "address": "1234 Industrial Blvd, Houston, TX 77001"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "inputAddress": "1234 Industrial Blvd, Houston, TX 77001",
    "formattedAddress": "1234 Industrial Boulevard, Houston, TX 77001, USA",
    "city": "Houston",
    "state": "TX",
    "zip": "77001",
    "country": "US",
    "latitude": 29.7604,
    "longitude": -95.3698,
    "confidence": 0.95
  }
}
```

---

### 3.3 POST /api/permits/calculate

**Purpose:** Calculate permit costs for a route

**Request:**
```typescript
POST /api/permits/calculate
Content-Type: application/json

{
  "stateSegments": [
    {
      "stateCode": "TX",
      "miles": 312
    },
    {
      "stateCode": "OK",
      "miles": 215
    },
    {
      "stateCode": "KS",
      "miles": 320
    }
  ],
  "loadDimensions": {
    "width": 12,              // feet
    "height": 14.5,           // feet (overall)
    "length": 65,             // feet (overall)
    "overhangFront": 3,       // feet
    "overhangRear": 5,        // feet
    "grossWeight": 95000      // lbs
  },
  "permitType": "single_trip",
  "tripDate": "2024-01-15"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "totalCost": 1245.00,
    "breakdown": {
      "permitFees": 485.00,
      "mileageFees": 125.00,
      "escortCosts": 535.00,
      "policeEscortCosts": 0,
      "otherFees": 100.00
    },
    "byState": [
      {
        "state": "Texas",
        "stateCode": "TX",
        "miles": 312,
        "oversizePermitFee": 90,
        "overweightPermitFee": 150,
        "superloadFee": 0,
        "mileageFee": 0,
        "bridgeAnalysisFee": 0,
        "routeSurveyFee": 0,
        "totalStateCost": 240,
        "permitType": "single_trip",
        "processingTime": "Immediate (online)",
        "validityPeriod": "5 days",
        "notes": ["Width surcharge applied for 12ft width"],
        "permitPortalUrl": "https://www.txpros.txdmv.gov/"
      },
      {
        "state": "Oklahoma",
        "stateCode": "OK",
        "miles": 215,
        "oversizePermitFee": 35,
        "overweightPermitFee": 60,
        "superloadFee": 0,
        "mileageFee": 43,         // $0.20/mile overweight
        "totalStateCost": 138,
        "notes": ["Per-mile fee for overweight"]
      },
      {
        "state": "Kansas",
        "stateCode": "KS",
        "miles": 320,
        "oversizePermitFee": 25,
        "overweightPermitFee": 50,
        "superloadFee": 0,
        "mileageFee": 32,
        "totalStateCost": 107
      }
    ],
    "escortRequirements": [
      {
        "state": "Texas",
        "stateCode": "TX",
        "required": true,
        "leadCar": true,
        "chaseCar": false,
        "poleCar": false,
        "policeEscort": false,
        "reason": "Width 12ft >= 12ft threshold",
        "estimatedCost": 175,     // 312 miles * $0.56/mile avg
        "notes": ["One escort required for loads 12-16ft wide"]
      },
      {
        "state": "Oklahoma",
        "stateCode": "OK",
        "required": true,
        "leadCar": true,
        "chaseCar": false,
        "poleCar": false,
        "policeEscort": false,
        "reason": "Width 12ft >= 12ft threshold",
        "estimatedCost": 180
      },
      {
        "state": "Kansas",
        "stateCode": "KS",
        "required": true,
        "leadCar": true,
        "chaseCar": false,
        "poleCar": false,
        "policeEscort": false,
        "reason": "Width 12ft >= 11ft threshold",
        "estimatedCost": 180
      }
    ],
    "travelRestrictions": [
      {
        "state": "Texas",
        "stateCode": "TX",
        "type": "time",
        "description": "No night travel",
        "restriction": "30 minutes before sunset to 30 minutes after sunrise"
      },
      {
        "state": "Oklahoma",
        "stateCode": "OK",
        "type": "time",
        "description": "No night travel for oversize",
        "restriction": "Sunset to sunrise"
      },
      {
        "state": "All",
        "stateCode": "*",
        "type": "holiday",
        "description": "No travel on major holidays",
        "restriction": "Check specific state holiday schedules"
      }
    ],
    "requiredDocuments": [
      "Valid oversize/overweight permit for each state",
      "Proof of insurance",
      "Vehicle registration",
      "Escort vehicle certification (if using pilot cars)"
    ],
    "warnings": [
      "Escort vehicles must be arranged separately",
      "Permit must be in vehicle during transport"
    ],
    "notes": [
      "Prices based on current state fee schedules",
      "Actual permit costs may vary based on exact route",
      "Police escort requirements should be verified with local authorities"
    ]
  }
}
```

---

### 3.4 GET /api/permits/states

**Purpose:** Get permit information for all states

**Request:**
```typescript
GET /api/permits/states
GET /api/permits/states?codes=TX,OK,KS
```

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "stateCode": "TX",
      "stateName": "Texas",
      "legalLimits": {
        "maxWidth": 8.5,
        "maxHeight": 14.0,
        "maxLength": { "single": 45, "combination": 65 },
        "maxWeight": { "gross": 80000 }
      },
      "oversizePermits": {
        "singleTrip": { "baseFee": 60 },
        "annual": { "baseFee": 1200 }
      },
      "overweightPermits": {
        "singleTrip": { "baseFee": 75 }
      },
      "escortThresholds": {
        "width": { "oneEscort": 12, "twoEscorts": 16 },
        "height": { "poleCar": 17 },
        "length": { "oneEscort": 110 }
      },
      "contact": {
        "agency": "Texas DMV",
        "phone": "1-800-299-1700",
        "website": "https://www.txdmv.gov"
      },
      "lastUpdated": "2024-12-01"
    }
    // ... more states
  ]
}
```

---

### 3.5 GET /api/permits/states/[code]

**Purpose:** Get detailed permit info for a single state

**Request:**
```typescript
GET /api/permits/states/TX
```

**Response:** Full state permit data object

---

## 4. PHASE 3 ENDPOINTS

### 4.1 Loads CRUD

#### POST /api/loads

**Purpose:** Create a new load

**Request:**
```typescript
POST /api/loads
Content-Type: application/json

{
  "description": "CAT 320 Excavator",
  "loadType": "HEAVY_HAUL",
  "origin": {
    "address": "1234 Industrial Blvd",
    "city": "Houston",
    "state": "TX",
    "zip": "77001"
  },
  "destination": {
    "address": "5678 Construction Ave",
    "city": "Dallas",
    "state": "TX",
    "zip": "75201"
  },
  "pickupDate": "2024-01-15",
  "items": [
    {
      "description": "CAT 320 Excavator",
      "quantity": 1,
      "length": 32,
      "lengthUnit": "ft",
      "width": 10,
      "widthUnit": "ft",
      "height": 10.5,
      "heightUnit": "ft",
      "weight": 52000,
      "weightUnit": "lbs",
      "loadingMethod": "drive_on"
    }
  ],
  "customerId": "cust_abc123",        // Optional
  "specialNotes": "Non-running, needs ramps"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "load_xyz789",
    "loadNumber": "LD-2024-00047",
    "description": "CAT 320 Excavator",
    "status": "DRAFT",
    // ... full load object
  }
}
```

#### GET /api/loads

**Purpose:** List loads with filtering and pagination

**Request:**
```typescript
GET /api/loads?status=DRAFT,ANALYZED&page=1&pageSize=20&sort=createdAt:desc
```

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string[] | - | Filter by status(es) |
| customerId | string | - | Filter by customer |
| search | string | - | Search load number, description |
| fromDate | ISO date | - | Created after date |
| toDate | ISO date | - | Created before date |
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page (max 100) |
| sort | string | createdAt:desc | Sort field and direction |

**Response:**
```typescript
{
  "success": true,
  "data": [
    {
      "id": "load_xyz789",
      "loadNumber": "LD-2024-00047",
      "description": "CAT 320 Excavator",
      "status": "ANALYZED",
      "originCity": "Houston",
      "originState": "TX",
      "destCity": "Dallas",
      "destState": "TX",
      "totalWeight": 52000,
      "isOversize": true,
      "isOverweight": false,
      "customer": {
        "id": "cust_abc123",
        "name": "ABC Construction"
      },
      "route": {
        "totalMiles": 243,
        "totalPermitCost": 485
      },
      "createdAt": "2024-01-10T15:30:00Z"
    }
    // ... more loads
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 47,
    "totalPages": 3
  }
}
```

#### GET /api/loads/[id]

**Purpose:** Get single load with full details

#### PATCH /api/loads/[id]

**Purpose:** Update a load

**Request:**
```typescript
PATCH /api/loads/load_xyz789
Content-Type: application/json

{
  "description": "Updated description",
  "selectedTruck": "rgn-48",
  "specialNotes": "Updated notes"
}
```

#### DELETE /api/loads/[id]

**Purpose:** Delete a load (soft delete - sets status to CANCELLED)

---

### 4.2 Customers CRUD

#### POST /api/customers

**Request:**
```typescript
POST /api/customers
Content-Type: application/json

{
  "name": "John Smith",
  "company": "ABC Construction",
  "email": "john@abcconstruction.com",
  "phone": "555-123-4567",
  "address": "1234 Business Park Dr",
  "city": "Houston",
  "state": "TX",
  "zip": "77001",
  "type": "SHIPPER",
  "paymentTerms": "Net 30",
  "notes": "Prefers email communication"
}
```

#### GET /api/customers

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| search | string | - | Search name, company, email |
| type | string | - | Filter by type |
| status | string | ACTIVE | Filter by status |
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page |

#### GET /api/customers/[id]

#### PATCH /api/customers/[id]

#### DELETE /api/customers/[id]

---

### 4.3 Quotes CRUD

#### POST /api/quotes

**Purpose:** Generate a quote for a load

**Request:**
```typescript
POST /api/quotes
Content-Type: application/json

{
  "loadId": "load_xyz789",
  "customerId": "cust_abc123",
  "pricing": {
    "baseMileageRate": 3.50,        // $/mile
    "fuelSurchargePercent": 15      // percentage
  },
  "additionalFees": [               // Optional
    { "description": "Tarping", "amount": 150 }
  ],
  "discount": 0,                    // Optional
  "discountReason": null,
  "validDays": 7,
  "publicNotes": "Quote valid for 7 days",
  "internalNotes": "Customer is price sensitive"
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "quote_abc123",
    "quoteNumber": "Q-2024-00089",
    "status": "DRAFT",
    "loadId": "load_xyz789",
    "customerId": "cust_abc123",
    
    "lineHaul": 850.50,           // 243 miles * $3.50
    "fuelSurcharge": 127.58,      // $850.50 * 15%
    "permitFees": 485.00,
    "escortFees": 535.00,
    "policeEscorts": 0,
    "additionalFees": 150.00,
    "subtotal": 2148.08,
    "discount": 0,
    "total": 2148.08,
    
    "validUntil": "2024-01-22T23:59:59Z",
    
    "lineItems": [
      { "type": "LINE_HAUL", "description": "Line haul (243 miles)", "quantity": 243, "unit": "miles", "rate": 3.50, "amount": 850.50 },
      { "type": "FUEL_SURCHARGE", "description": "Fuel surcharge (15%)", "quantity": 1, "rate": 127.58, "amount": 127.58 },
      { "type": "PERMIT_OVERSIZE", "description": "Texas oversize permit", "stateCode": "TX", "amount": 90 },
      { "type": "PERMIT_OVERWEIGHT", "description": "Texas overweight permit", "stateCode": "TX", "amount": 150 },
      // ... more line items
    ],
    
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/quotes

**Query Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string[] | - | Filter by status(es) |
| loadId | string | - | Filter by load |
| customerId | string | - | Filter by customer |
| fromDate | ISO date | - | Created after date |
| toDate | ISO date | - | Created before date |
| minTotal | number | - | Minimum total amount |
| maxTotal | number | - | Maximum total amount |
| page | number | 1 | Page number |
| pageSize | number | 20 | Items per page |
| sort | string | createdAt:desc | Sort field and direction |

#### GET /api/quotes/[id]

#### PATCH /api/quotes/[id]

**Purpose:** Update quote details or status

```typescript
PATCH /api/quotes/quote_abc123
Content-Type: application/json

{
  "status": "SENT",
  "sentAt": "2024-01-15T11:00:00Z"
}
```

#### POST /api/quotes/[id]/pdf

**Purpose:** Generate PDF for quote

**Response:**
```typescript
{
  "success": true,
  "data": {
    "url": "https://storage.loadplanner.app/quotes/Q-2024-00089.pdf",
    "expiresAt": "2024-01-16T11:00:00Z"
  }
}
```

#### POST /api/quotes/[id]/send

**Purpose:** Send quote to customer via email

**Request:**
```typescript
POST /api/quotes/quote_abc123/send
Content-Type: application/json

{
  "toEmail": "john@abcconstruction.com",
  "ccEmails": ["dispatch@carrier.com"],
  "message": "Please find attached our quote for your equipment transport."
}
```

#### POST /api/quotes/[id]/duplicate

**Purpose:** Create a copy of a quote (for revisions)

---

## 5. PHASE 4 ENDPOINTS

### 5.1 POST /api/ai/chat

**Purpose:** Natural language interface for querying system

**Request:**
```typescript
POST /api/ai/chat
Content-Type: application/json

{
  "message": "Show me all Texas loads from last week",
  "conversationId": "conv_123",    // Optional, for multi-turn
  "context": {                      // Optional additional context
    "currentView": "dashboard"
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "response": "I found 12 loads originating from or destined for Texas in the last 7 days. Here's a summary...",
    "intent": "LOAD_QUERY",
    "query": {
      "type": "loads",
      "filters": {
        "states": ["TX"],
        "fromDate": "2024-01-08",
        "toDate": "2024-01-15"
      }
    },
    "results": [
      // ... load objects matching query
    ],
    "suggestedActions": [
      { "action": "VIEW_LOADS", "label": "View all 12 loads" },
      { "action": "EXPORT", "label": "Export to CSV" }
    ],
    "conversationId": "conv_123"
  }
}
```

---

### 5.2 POST /api/securement/calculate

**Purpose:** Calculate chain/strap requirements for load

**Request:**
```typescript
POST /api/securement/calculate
Content-Type: application/json

{
  "items": [
    {
      "description": "Excavator",
      "length": 32,
      "width": 10,
      "height": 10.5,
      "weight": 52000,
      "type": "machinery",
      "isArticulated": true
    }
  ]
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "minTiedowns": 5,
    "recommendedTiedowns": 7,
    "tiedownType": "chain",
    "chainGrade": 70,
    "minWLL": 26000,              // Working load limit (lbs)
    "additionalRequirements": [
      "Use binder chains for heavy machinery",
      "Secure all articulating parts independently"
    ],
    "regulations": [
      "FMCSA 393.100-136: Cargo Securement Rules",
      "Min aggregate WLL: 26,000 lbs",
      "Min tiedowns by length: 5"
    ]
  }
}
```

---

### 5.3 POST /api/stacking/optimize

**Purpose:** Optimize cargo placement on trailer

**Request:**
```typescript
POST /api/stacking/optimize
Content-Type: application/json

{
  "items": [
    { "id": "item1", "description": "Crate A", "length": 8, "width": 6, "height": 5, "weight": 5000, "stackable": true, "maxStackWeight": 3000 },
    { "id": "item2", "description": "Crate B", "length": 6, "width": 6, "height": 4, "weight": 3000, "stackable": true },
    { "id": "item3", "description": "Machine", "length": 12, "width": 8, "height": 7, "weight": 15000, "stackable": false }
  ],
  "truck": {
    "type": "flatbed-48",
    "deckLength": 48,
    "deckWidth": 8.5,
    "maxHeight": 8.5,
    "maxWeight": 48000
  }
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "success": true,
    "placements": [
      { "itemId": "item3", "position": { "x": 0, "y": 0.25, "z": 0 }, "rotated": false },
      { "itemId": "item1", "position": { "x": 14, "y": 0, "z": 0 }, "rotated": false },
      { "itemId": "item2", "position": { "x": 14, "y": 0, "z": 5 }, "rotated": false }  // Stacked
    ],
    "utilizationPercent": 35.2,
    "totalWeight": 23000,
    "centerOfGravity": { "x": 18.5, "y": 4.1 },
    "warnings": [],
    "unplacedItems": []
  }
}
```

---

## 6. PHASE 5 ENDPOINTS

### 6.1 GET /api/analytics/dashboard

**Purpose:** Get dashboard metrics

**Request:**
```typescript
GET /api/analytics/dashboard?period=30d
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "quotes": {
      "total": 156,
      "draft": 12,
      "sent": 45,
      "accepted": 67,
      "declined": 32,
      "conversionRate": 42.9
    },
    "revenue": {
      "total": 245000,
      "thisMonth": 89000,
      "lastMonth": 76000,
      "growth": 17.1
    },
    "loads": {
      "total": 89,
      "inTransit": 12,
      "delivered": 67,
      "cancelled": 10
    },
    "topLanes": [
      { "origin": "Houston, TX", "destination": "Dallas, TX", "count": 23, "revenue": 52000 },
      { "origin": "Houston, TX", "destination": "Oklahoma City, OK", "count": 15, "revenue": 41000 }
    ],
    "topCustomers": [
      { "id": "cust_1", "name": "ABC Construction", "loads": 34, "revenue": 78000 },
      { "id": "cust_2", "name": "XYZ Equipment", "loads": 21, "revenue": 52000 }
    ]
  }
}
```

---

### 6.2 API Key Management

#### POST /api/keys

**Purpose:** Create API key for external access

**Request:**
```typescript
POST /api/keys
Content-Type: application/json

{
  "name": "Integration Key",
  "scopes": ["read", "write"],
  "expiresInDays": 365
}
```

**Response:**
```typescript
{
  "success": true,
  "data": {
    "id": "key_abc123",
    "name": "Integration Key",
    "key": "lp_live_abc123xyz789...",   // Only shown once!
    "keyPrefix": "lp_live_",
    "scopes": ["read", "write"],
    "expiresAt": "2025-01-15T00:00:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### GET /api/keys

#### DELETE /api/keys/[id]

---

## 7. WEBHOOK ENDPOINTS

### 7.1 POST /api/webhooks/clerk

**Purpose:** Handle Clerk user events

```typescript
// Clerk sends user.created, user.updated, user.deleted events
POST /api/webhooks/clerk
```

---

## 8. ERROR CODES REFERENCE

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| PARSE_ERROR | 422 | Could not parse content |
| NOT_FOUND | 404 | Resource not found |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized for this action |
| RATE_LIMITED | 429 | Too many requests |
| EXTERNAL_API_ERROR | 502 | External service error (Gemini, Geoapify, etc.) |
| INTERNAL_ERROR | 500 | Unexpected server error |
| DUPLICATE_ERROR | 409 | Resource already exists |
| QUOTA_EXCEEDED | 403 | Plan quota exceeded |

---

*End of Part 4: Complete API Endpoints*
