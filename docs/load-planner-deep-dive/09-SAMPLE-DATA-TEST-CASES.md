# LOAD PLANNER - Deep Dive Planning Document
## Part 9: Sample Data & Test Cases

---

## 1. SAMPLE LOAD EMAILS

### 1.1 Standard Excavator (RGN Recommended)

```
Subject: Quote Request - CAT 320 Excavator

Hi,

We need a quote to transport the following:

Equipment: CAT 320 Excavator
Dimensions: 32' long x 10' wide x 10'6" tall
Weight: 52,000 lbs
Condition: Non-running, will need ramps

Pickup Location: 
ABC Equipment Rental
1234 Industrial Blvd
Houston, TX 77001

Delivery Location:
XYZ Construction Site
5678 Highway 75
Dallas, TX 75201

Requested Pickup: January 15, 2024
Flexible on delivery date

Please provide your best rate.

Thanks,
John Smith
ABC Construction
john@abcconstruction.com
(713) 555-1234
```

**Expected Parse Result:**
```json
{
  "confidence": 0.95,
  "items": [{
    "description": "CAT 320 Excavator",
    "quantity": 1,
    "length": { "value": 32, "unit": "ft", "normalized": 32 },
    "width": { "value": 10, "unit": "ft", "normalized": 10 },
    "height": { "value": 10.5, "unit": "ft", "normalized": 10.5 },
    "weight": { "value": 52000, "unit": "lbs", "normalized": 52000 },
    "notes": ["Non-running", "Will need ramps"]
  }],
  "origin": {
    "address": "1234 Industrial Blvd",
    "city": "Houston",
    "state": "TX",
    "zip": "77001"
  },
  "destination": {
    "address": "5678 Highway 75",
    "city": "Dallas",
    "state": "TX",
    "zip": "75201"
  },
  "pickupDate": "2024-01-15",
  "customerName": "John Smith",
  "customerEmail": "john@abcconstruction.com"
}
```

**Expected Truck Recommendation:**
```json
{
  "bestMatch": {
    "truck": "RGN 48'",
    "score": 95,
    "fits": true,
    "fitDetails": {
      "lengthFits": true,
      "lengthMargin": 16,
      "widthFits": false,
      "widthMargin": -1.5,
      "heightFits": true,
      "heightMargin": 1,
      "weightFits": true,
      "weightMargin": -10000
    },
    "overallDimensions": {
      "totalHeight": 12.5,
      "grossWeight": 72000
    },
    "permitRequired": {
      "oversize": true,
      "overweight": false,
      "reasons": ["Width 10ft exceeds 8.5ft legal limit"]
    }
  },
  "alternatives": [
    { "truck": "Lowboy", "fits": true, "score": 90 },
    { "truck": "Step Deck", "fits": false, "reason": "Height 14ft exceeds 13.5ft limit" },
    { "truck": "Flatbed", "fits": false, "reason": "Height 15.5ft exceeds 13.5ft limit" }
  ]
}
```

---

### 1.2 Steel Coils (Flatbed Recommended)

```
Subject: Steel Coil Shipment - 3 Pieces

Good morning,

Please quote the following steel coil shipment:

Commodity: Hot Rolled Steel Coils
Quantity: 3 coils
Dimensions per coil: 72" OD x 48" wide
Weight per coil: 22,000 lbs (66,000 lbs total)

Origin: Steel Mill
Chicago, IL 60601

Destination: Manufacturing Plant
Detroit, MI 48201

Ship date: ASAP

Tarping required. Need chains, no straps.

Contact: Mike Johnson
Steel Corp
mike@steelcorp.com
```

**Expected Parse Result:**
```json
{
  "confidence": 0.90,
  "items": [{
    "description": "Hot Rolled Steel Coils",
    "quantity": 3,
    "length": { "value": 6, "unit": "ft", "normalized": 6 },
    "width": { "value": 4, "unit": "ft", "normalized": 4 },
    "height": { "value": 6, "unit": "ft", "normalized": 6 },
    "weight": { "value": 66000, "unit": "lbs", "normalized": 66000 },
    "notes": ["Tarping required", "Chains only, no straps"]
  }],
  "origin": { "city": "Chicago", "state": "IL" },
  "destination": { "city": "Detroit", "state": "MI" },
  "pickupDate": null,
  "customerName": "Mike Johnson",
  "customerEmail": "mike@steelcorp.com"
}
```

**Expected Truck Recommendation:**
```json
{
  "bestMatch": {
    "truck": "Flatbed 48'",
    "score": 98,
    "fits": true,
    "fitDetails": {
      "lengthFits": true,
      "widthFits": true,
      "heightFits": true,
      "heightMargin": 2.5,
      "weightFits": false,
      "weightMargin": -18000
    },
    "permitRequired": {
      "oversize": false,
      "overweight": true,
      "reasons": ["Gross weight ~86,000 lbs exceeds 80,000 lbs limit"]
    }
  },
  "notes": ["Consider splitting into 2 trucks to avoid overweight permit"]
}
```

---

### 1.3 Tall Transformer (Lowboy Required)

```
Subject: Urgent - Transformer Move Quote Needed

Need quote ASAP:

Item: 500kVA Electrical Transformer
Size: 18 feet long, 12 feet wide, 14 feet tall
Weight: 85,000 pounds
NON-DIVISIBLE LOAD

From: Power Systems Inc
Los Angeles, CA 90001

To: Utility Substation
Phoenix, AZ 85001

Must deliver by January 20th
Route survey may be required

Call me: 555-888-9999
- Sarah at Power Systems
```

**Expected Parse Result:**
```json
{
  "confidence": 0.92,
  "items": [{
    "description": "500kVA Electrical Transformer",
    "quantity": 1,
    "length": { "value": 18, "unit": "ft", "normalized": 18 },
    "width": { "value": 12, "unit": "ft", "normalized": 12 },
    "height": { "value": 14, "unit": "ft", "normalized": 14 },
    "weight": { "value": 85000, "unit": "lbs", "normalized": 85000 },
    "notes": ["Non-divisible load", "Route survey may be required"]
  }],
  "origin": { "city": "Los Angeles", "state": "CA" },
  "destination": { "city": "Phoenix", "state": "AZ" },
  "deliveryDate": "2024-01-20",
  "customerName": "Sarah",
  "customerPhone": "555-888-9999"
}
```

**Expected Truck Recommendation:**
```json
{
  "bestMatch": {
    "truck": "Lowboy 3-Axle",
    "score": 85,
    "fits": true,
    "fitDetails": {
      "lengthFits": true,
      "widthFits": false,
      "widthMargin": -3.5,
      "heightFits": false,
      "heightMargin": -2,
      "weightFits": false,
      "weightMargin": -30000
    },
    "overallDimensions": {
      "totalHeight": 15.5,
      "grossWeight": 125000
    },
    "permitRequired": {
      "oversize": true,
      "overweight": true,
      "superload": true,
      "reasons": [
        "Width 12ft exceeds 8.5ft legal limit",
        "Height 15.5ft exceeds 13.5ft legal limit",
        "Gross weight 125,000 lbs exceeds 80,000 lbs limit",
        "May qualify as superload in CA/AZ"
      ]
    }
  },
  "warnings": [
    "This is a SUPERLOAD - requires special permitting",
    "Route survey likely required",
    "Multiple escorts required",
    "May need utility coordination for power lines"
  ]
}
```

---

### 1.4 Multiple Items (Partial Parse)

```
Subject: 3 Machines - Austin to San Antonio

Hi there,

Got 3 pieces going same route:

1) Forklift - 8' x 4' x 7' - 9,000 lbs
2) Skid Steer - 10' x 6' x 6' - 8,500 lbs  
3) Mini Excavator - 15' x 7' x 8' - 12,000 lbs

From Austin TX to San Antonio TX

Next week sometime

Thanks
Bob
```

**Expected Parse Result:**
```json
{
  "confidence": 0.85,
  "items": [
    {
      "description": "Forklift",
      "quantity": 1,
      "length": { "value": 8, "unit": "ft", "normalized": 8 },
      "width": { "value": 4, "unit": "ft", "normalized": 4 },
      "height": { "value": 7, "unit": "ft", "normalized": 7 },
      "weight": { "value": 9000, "unit": "lbs", "normalized": 9000 }
    },
    {
      "description": "Skid Steer",
      "quantity": 1,
      "length": { "value": 10, "unit": "ft", "normalized": 10 },
      "width": { "value": 6, "unit": "ft", "normalized": 6 },
      "height": { "value": 6, "unit": "ft", "normalized": 6 },
      "weight": { "value": 8500, "unit": "lbs", "normalized": 8500 }
    },
    {
      "description": "Mini Excavator",
      "quantity": 1,
      "length": { "value": 15, "unit": "ft", "normalized": 15 },
      "width": { "value": 7, "unit": "ft", "normalized": 7 },
      "height": { "value": 8, "unit": "ft", "normalized": 8 },
      "weight": { "value": 12000, "unit": "lbs", "normalized": 12000 }
    }
  ],
  "origin": { "city": "Austin", "state": "TX" },
  "destination": { "city": "San Antonio", "state": "TX" },
  "totalWeight": 29500,
  "customerName": "Bob"
}
```

**Expected Truck Recommendation:**
```json
{
  "bestMatch": {
    "truck": "Step Deck with Ramps",
    "score": 95,
    "fits": true,
    "reasoning": "All items fit on step deck, can drive on, legal dimensions"
  },
  "loadPlan": {
    "totalLength": 33,
    "maxHeight": 8,
    "totalWeight": 29500,
    "allItemsFitOnOneTruck": true
  },
  "permitRequired": {
    "oversize": false,
    "overweight": false
  }
}
```

---

### 1.5 Incomplete Information

```
Subject: need a quote

excavator pickup dallas

call me 555-1234
```

**Expected Parse Result:**
```json
{
  "confidence": 0.25,
  "items": [{
    "description": "Excavator",
    "quantity": 1,
    "length": null,
    "width": null,
    "height": null,
    "weight": null
  }],
  "origin": { "city": "Dallas", "state": null },
  "destination": null,
  "customerPhone": "555-1234",
  "warnings": [
    "Missing dimensions - cannot recommend truck",
    "Missing weight - cannot verify capacity",
    "Missing destination",
    "Please request complete information from customer"
  ]
}
```

---

## 2. UNIT CONVERSION TEST CASES

### 2.1 Dimension Parsing

| Input String | Expected Output | Notes |
|--------------|-----------------|-------|
| `"10'6\""` | `{ value: 10.5, unit: 'ft' }` | Feet and inches |
| `"10' 6\""` | `{ value: 10.5, unit: 'ft' }` | Space separator |
| `"126 inches"` | `{ value: 126, unit: 'in' }` | Inches |
| `"126\""` | `{ value: 126, unit: 'in' }` | Quote notation |
| `"10.5 ft"` | `{ value: 10.5, unit: 'ft' }` | Decimal feet |
| `"10.5'"` | `{ value: 10.5, unit: 'ft' }` | Prime notation |
| `"3.2m"` | `{ value: 3.2, unit: 'm' }` | Meters |
| `"3.2 meters"` | `{ value: 3.2, unit: 'm' }` | Full word |
| `"320cm"` | `{ value: 320, unit: 'cm' }` | Centimeters |
| `"10-6"` | `{ value: 10.5, unit: 'ft' }` | Dash notation |
| `"10ft 6in"` | `{ value: 10.5, unit: 'ft' }` | Spelled out |

### 2.2 Weight Parsing

| Input String | Expected Output | Notes |
|--------------|-----------------|-------|
| `"45,000 lbs"` | `{ value: 45000, unit: 'lbs' }` | With comma |
| `"45000 lbs"` | `{ value: 45000, unit: 'lbs' }` | No comma |
| `"45000lbs"` | `{ value: 45000, unit: 'lbs' }` | No space |
| `"22.5 tons"` | `{ value: 22.5, unit: 'tons' }` | US tons |
| `"20 MT"` | `{ value: 20, unit: 'mt' }` | Metric tons |
| `"20,000 kg"` | `{ value: 20000, unit: 'kg' }` | Kilograms |
| `"45K lbs"` | `{ value: 45000, unit: 'lbs' }` | K notation |
| `"45k"` | `{ value: 45000, unit: 'lbs' }` | Assume lbs |

### 2.3 Unit Conversions

| From | To | Input | Expected |
|------|-----|-------|----------|
| inches | feet | 126 | 10.5 |
| feet | inches | 10.5 | 126 |
| meters | feet | 3 | 9.84 |
| feet | meters | 10 | 3.05 |
| cm | feet | 320 | 10.5 |
| tons | lbs | 22.5 | 45000 |
| lbs | tons | 45000 | 22.5 |
| kg | lbs | 20000 | 44092 |
| mt | lbs | 20 | 44092 |

---

## 3. TRUCK SELECTION TEST CASES

### 3.1 Height-Based Selection

| Cargo Height | Deck Height | Total | Legal? | Truck |
|--------------|-------------|-------|--------|-------|
| 8' | 5.0' (Flatbed) | 13' | ✅ | Flatbed OK |
| 9' | 5.0' (Flatbed) | 14' | ❌ | Need Step Deck |
| 9' | 3.5' (Step Deck) | 12.5' | ✅ | Step Deck OK |
| 10.5' | 3.5' (Step Deck) | 14' | ❌ | Need RGN |
| 10.5' | 2.0' (RGN) | 12.5' | ✅ | RGN OK |
| 11.5' | 2.0' (RGN) | 13.5' | ✅ | RGN OK (tight) |
| 12' | 2.0' (RGN) | 14' | ❌ | Need Lowboy |
| 12' | 1.5' (Lowboy) | 13.5' | ✅ | Lowboy OK |
| 13' | 1.5' (Lowboy) | 14.5' | ❌ | Permit Required |

### 3.2 Weight-Based Selection

| Cargo Weight | Tare | GVW | Legal? | Action |
|--------------|------|-----|--------|--------|
| 40,000 | 35,000 | 75,000 | ✅ | Standard |
| 48,000 | 35,000 | 83,000 | ❌ | OW Permit |
| 55,000 | 45,000 | 100,000 | ❌ | OW Permit + 3-axle |
| 80,000 | 45,000 | 125,000 | ❌ | Superload |

### 3.3 Width-Based Selection

| Cargo Width | Legal? | Action |
|-------------|--------|--------|
| 8' | ✅ | Standard |
| 8.5' | ✅ | Legal limit |
| 10' | ❌ | OS Permit, 1 escort |
| 12' | ❌ | OS Permit, 1-2 escorts |
| 14' | ❌ | OS Permit, 2 escorts |
| 16' | ❌ | OS Permit, police escort |

---

## 4. PERMIT CALCULATION TEST CASES

### 4.1 Texas Single Trip

**Input:**
- Width: 12 ft
- Height: 14 ft  
- Length: 80 ft
- GVW: 95,000 lbs
- Miles: 250

**Expected:**
```json
{
  "oversizePermit": {
    "baseFee": 60,
    "widthSurcharge": 30,
    "heightSurcharge": 0,
    "lengthSurcharge": 0,
    "total": 90
  },
  "overweightPermit": {
    "baseFee": 75,
    "total": 75
  },
  "escorts": {
    "leadCar": { "required": true, "cost": 437.50 },
    "chaseCar": { "required": false, "cost": 0 },
    "poleCar": { "required": false, "cost": 0 }
  },
  "totalPermitCost": 165,
  "totalEscortCost": 437.50,
  "grandTotal": 602.50
}
```

### 4.2 Multi-State Route (TX → OK → KS)

**Input:**
- Width: 14 ft
- Height: 15 ft
- GVW: 100,000 lbs
- Miles: TX 200, OK 180, KS 150

**Expected:**
```json
{
  "byState": {
    "TX": {
      "oversizePermit": 120,
      "overweightPermit": 75,
      "escorts": 350,
      "total": 545
    },
    "OK": {
      "oversizePermit": 35,
      "overweightPermit": 96,
      "escorts": 315,
      "total": 446
    },
    "KS": {
      "oversizePermit": 25,
      "overweightPermit": 40,
      "escorts": 262.50,
      "total": 327.50
    }
  },
  "totalPermits": 391,
  "totalEscorts": 927.50,
  "grandTotal": 1318.50
}
```

---

## 5. ROUTE TEST CASES

### 5.1 Houston to Dallas (In-State)

**Input:**
- Origin: Houston, TX
- Destination: Dallas, TX

**Expected:**
```json
{
  "totalMiles": 243,
  "estimatedTime": "3h 45m",
  "states": [
    { "state": "TX", "stateCode": "TX", "miles": 243 }
  ],
  "tollsOnRoute": true
}
```

### 5.2 Los Angeles to Phoenix (Multi-State)

**Input:**
- Origin: Los Angeles, CA
- Destination: Phoenix, AZ

**Expected:**
```json
{
  "totalMiles": 372,
  "estimatedTime": "5h 30m",
  "states": [
    { "state": "California", "stateCode": "CA", "miles": 190 },
    { "state": "Arizona", "stateCode": "AZ", "miles": 182 }
  ]
}
```

### 5.3 Chicago to Atlanta (Many States)

**Input:**
- Origin: Chicago, IL
- Destination: Atlanta, GA

**Expected:**
```json
{
  "totalMiles": 720,
  "estimatedTime": "10h 45m",
  "states": [
    { "state": "Illinois", "stateCode": "IL", "miles": 180 },
    { "state": "Indiana", "stateCode": "IN", "miles": 150 },
    { "state": "Kentucky", "stateCode": "KY", "miles": 175 },
    { "state": "Tennessee", "stateCode": "TN", "miles": 120 },
    { "state": "Georgia", "stateCode": "GA", "miles": 95 }
  ]
}
```

---

## 6. QUOTE GENERATION TEST CASES

### 6.1 Standard Quote

**Input:**
```json
{
  "miles": 250,
  "ratePerMile": 3.50,
  "fuelSurchargePercent": 15,
  "permitCosts": 165,
  "escortCosts": 437.50,
  "additionalFees": [
    { "name": "Tarping", "amount": 150 }
  ],
  "discount": 0
}
```

**Expected:**
```json
{
  "quoteNumber": "Q-2024-00001",
  "lineItems": [
    { "type": "LINE_HAUL", "description": "Line Haul (250 mi @ $3.50/mi)", "amount": 875.00 },
    { "type": "FUEL_SURCHARGE", "description": "Fuel Surcharge (15%)", "amount": 131.25 },
    { "type": "PERMIT_OVERSIZE", "description": "TX Oversize Permit", "amount": 90.00 },
    { "type": "PERMIT_OVERWEIGHT", "description": "TX Overweight Permit", "amount": 75.00 },
    { "type": "ESCORT_LEAD", "description": "Lead Car Escort (250 mi)", "amount": 437.50 },
    { "type": "ADDITIONAL", "description": "Tarping", "amount": 150.00 }
  ],
  "subtotal": 1758.75,
  "discount": 0,
  "total": 1758.75
}
```

---

## 7. EDGE CASES

### 7.1 Parse Edge Cases

| Scenario | Input | Expected Behavior |
|----------|-------|-------------------|
| Empty email | "" | Return error, confidence 0 |
| Non-freight email | "Meeting at 3pm" | Return error, no load detected |
| Mixed units | "10ft x 3m x 8'" | Parse all, normalize to feet |
| European decimals | "10,5 meters" | Parse as 10.5 |
| Spelled numbers | "twenty feet" | Try to parse as 20 |
| Ranges | "10-12 feet" | Use higher value (12) |
| Approximate | "~45,000 lbs" | Parse as 45000, note approximate |

### 7.2 Calculation Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Zero miles | Return error |
| Same origin/destination | Return error |
| Weight > 500,000 lbs | Flag as impossible |
| Height > 20' | Flag as likely error |
| Width > 20' | Flag as multi-piece likely |

---

*End of Part 9: Sample Data & Test Cases*
