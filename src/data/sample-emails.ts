/**
 * Sample freight request emails for testing the parser
 * Based on realistic scenarios from the Load Planner documentation
 */

export const sampleEmails = [
  {
    id: 'cat-320-excavator',
    name: 'CAT 320 Excavator',
    description: 'Standard excavator transport - should recommend RGN',
    email: `Subject: Quote Request - CAT 320 Excavator Houston to Dallas

Hi,

We need a quote to move a CAT 320 Excavator from Houston, TX to Dallas, TX.

Equipment Details:
- CAT 320 Excavator
- Dimensions: 32' L x 10' W x 10'6" H
- Weight: 52,000 lbs

Pickup: Houston, TX 77001
Delivery: Dallas, TX 75201
Date: Flexible, sometime next week

Please provide your best rate.

Thanks,
Mike Johnson
ABC Construction`,
  },
  {
    id: 'steel-coils',
    name: 'Steel Coils (3 pieces)',
    description: 'Multiple steel coils - should recommend Flatbed',
    email: `Quote needed for steel coils

Cargo: 3 steel coils
Each coil: 6' L x 4' W x 6' H
Total weight: 66,000 lbs

From: Chicago, IL
To: Detroit, MI

Need picked up Monday.

John Smith
Steel Solutions Inc.`,
  },
  {
    id: 'transformer',
    name: '500kVA Transformer (Superload)',
    description: 'Large transformer - will exceed legal limits',
    email: `URGENT: Transformer Move Required

We have a 500kVA transformer that needs to move from Los Angeles to Phoenix.

Specifications:
Length: 18 feet
Width: 12 feet
Height: 14 feet
Weight: 85,000 lbs

This is a critical piece of equipment for a power substation project. We need careful handling and all necessary permits.

Origin: Los Angeles, CA 90001
Destination: Phoenix, AZ 85001

Timeline: Within 2 weeks

Please advise on permits required and provide a detailed quote.

Best regards,
Sarah Williams
Power Grid Solutions`,
  },
  {
    id: 'forklift',
    name: 'Forklift',
    description: 'Small forklift - should recommend Step Deck or Flatbed',
    email: `Need to ship a forklift

Toyota 8FGU25 Forklift
8' long, 4' wide, 7' tall
5,500 lbs

Going from Miami FL to Atlanta GA

Thanks`,
  },
  {
    id: 'wind-turbine',
    name: 'Wind Turbine Blade',
    description: 'Very long blade - will need permits',
    email: `RE: Wind Turbine Blade Transport Quote

Hello,

We're looking for a carrier to transport a wind turbine blade.

Blade specifications:
- Length: 165 feet
- Width: 8 feet
- Height: 12 feet
- Weight: 35,000 lbs

Route: Amarillo, TX to Oklahoma City, OK

This will require oversize permits and likely pilot cars. Please include all costs in your quote.

Mark Thompson
Wind Energy Partners`,
  },
  {
    id: 'generator',
    name: 'Industrial Generator',
    description: 'Generator - should recommend Double Drop or RGN',
    email: `Generator Transport Quote Request

Industrial generator specs:
20'L x 9'W x 11'H
Weight: 38,000 pounds

Ship from: Denver, CO
Ship to: Salt Lake City, UT

Available for pickup anytime this month.

Contact: Jim at 555-1234`,
  },
  {
    id: 'metric-units',
    name: 'European Equipment (Metric)',
    description: 'Metric units test - parser should convert correctly',
    email: `Need quote for equipment from European manufacturer

Machine dimensions:
- 8 meters long
- 2.5 meters wide
- 3.2 meters high
- 18,000 kg

From: Port of Long Beach, CA
To: Phoenix, AZ

Please confirm you can handle metric specs.

Hans Mueller
Euro Machinery GmbH`,
  },
  {
    id: 'multiple-items',
    name: 'Multiple Items',
    description: 'Multiple pieces on one load',
    email: `We have 2 pieces to ship on the same truck:

Piece 1:
- Compressor unit
- 10' x 6' x 8'
- 15,000 lbs

Piece 2:
- Control panel
- 8' x 4' x 6'
- 3,000 lbs

Total: 18,000 lbs

Pickup: St. Louis, MO
Delivery: Kansas City, MO

Both pieces going to same location.`,
  },
]

/**
 * Get a sample email by ID
 */
export function getSampleEmailById(id: string) {
  return sampleEmails.find(email => email.id === id)
}

/**
 * Get a random sample email
 */
export function getRandomSampleEmail() {
  return sampleEmails[Math.floor(Math.random() * sampleEmails.length)]
}
