import { NextRequest, NextResponse } from 'next/server'
import { generateLoadPlanPDF } from '@/lib/pdf-generator'
import { LoadPlan, PlannedLoad } from '@/lib/load-planner'
import { TruckType } from '@/types/truck'

interface ItemDimensions {
  length?: number
  width?: number
  height?: number
  weight?: number
}

// Frontend format uses 'truck', load-planner uses 'recommendedTruck'
interface FrontendLoad {
  id: string
  items: ItemDimensions[]
  truck: TruckType
  placements?: unknown[]
  utilization?: { weight: number; space: number }
  warnings?: string[]
}

interface FrontendLoadPlan {
  loads: FrontendLoad[]
  totalTrucks: number
  totalWeight: number
  totalItems: number
  warnings?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loadPlan: inputPlan, options } = body as {
      loadPlan: FrontendLoadPlan | LoadPlan
      options?: {
        title?: string
        reference?: string
        date?: string
      }
    }

    if (!inputPlan || !inputPlan.loads || inputPlan.loads.length === 0) {
      return NextResponse.json(
        { error: 'Invalid load plan data' },
        { status: 400 }
      )
    }

    // Transform frontend format to internal format if needed
    const loadPlan: LoadPlan = {
      loads: inputPlan.loads.map(load => {
        // Check if this is frontend format (has 'truck') or internal format (has 'recommendedTruck')
        const frontendLoad = load as FrontendLoad
        const internalLoad = load as PlannedLoad

        const truck = frontendLoad.truck || internalLoad.recommendedTruck
        const items = load.items as ItemDimensions[]

        return {
          id: load.id,
          items: load.items,
          length: items.length > 0 ? Math.max(...items.map(i => i.length || 0)) : 0,
          width: items.length > 0 ? Math.max(...items.map(i => i.width || 0)) : 0,
          height: items.length > 0 ? Math.max(...items.map(i => i.height || 0)) : 0,
          weight: items.reduce((sum, i) => sum + (i.weight || 0), 0),
          recommendedTruck: truck,
          truckScore: internalLoad.truckScore || 100,
          placements: frontendLoad.placements || internalLoad.placements || [],
          permitsRequired: internalLoad.permitsRequired || [],
          warnings: load.warnings || [],
          isLegal: internalLoad.isLegal ?? true,
        } as PlannedLoad
      }),
      totalTrucks: inputPlan.totalTrucks,
      totalWeight: inputPlan.totalWeight,
      totalItems: inputPlan.totalItems,
      unassignedItems: (inputPlan as LoadPlan).unassignedItems || [],
      warnings: inputPlan.warnings || [],
    }

    // Generate the PDF
    const pdfArrayBuffer = await generateLoadPlanPDF(loadPlan, options || {})
    // Convert to Buffer for NextResponse
    const pdfBuffer = Buffer.from(pdfArrayBuffer)

    // Return the PDF as a downloadable file
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="load-plan-${options?.reference || Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
