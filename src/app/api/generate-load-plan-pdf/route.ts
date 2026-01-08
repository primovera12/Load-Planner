import { NextRequest, NextResponse } from 'next/server'
import { generateLoadPlanPDF } from '@/lib/pdf-generator'
import { LoadPlan, PlannedLoad } from '@/lib/load-planner'
import { TruckType } from '@/types/truck'

import { LoadItem } from '@/types/load'

interface FrontendItem {
  id?: string
  sku?: string
  description?: string
  length?: number
  width?: number
  height?: number
  weight?: number
  quantity?: number
  stackable?: boolean
  fragile?: boolean
  hazmat?: boolean
}

// Frontend format uses 'truck', load-planner uses 'recommendedTruck'
interface FrontendLoad {
  id: string
  items: FrontendItem[]
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

// Transform frontend item to LoadItem with defaults
function toLoadItem(item: FrontendItem, index: number): LoadItem {
  return {
    id: item.id || `item-${index + 1}`,
    sku: item.sku || `${index + 1}`,
    description: item.description || `Item ${index + 1}`,
    length: item.length || 0,
    width: item.width || 0,
    height: item.height || 0,
    weight: item.weight || 0,
    quantity: item.quantity || 1,
    stackable: item.stackable ?? false,
    fragile: item.fragile ?? false,
    hazmat: item.hazmat ?? false,
  }
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

        if (!truck) {
          throw new Error(`Load ${load.id} has no truck assigned`)
        }

        // Transform items to ensure all required properties exist
        const transformedItems: LoadItem[] = (load.items as FrontendItem[]).map((item, idx) =>
          toLoadItem(item, idx)
        )

        return {
          id: load.id,
          items: transformedItems,
          length: transformedItems.length > 0 ? Math.max(...transformedItems.map(i => i.length)) : 0,
          width: transformedItems.length > 0 ? Math.max(...transformedItems.map(i => i.width)) : 0,
          height: transformedItems.length > 0 ? Math.max(...transformedItems.map(i => i.height)) : 0,
          weight: transformedItems.reduce((sum, i) => sum + (i.weight * i.quantity), 0),
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : ''
    console.error('Error details:', { message: errorMessage, stack: errorStack })
    return NextResponse.json(
      { error: `Failed to generate PDF: ${errorMessage}` },
      { status: 500 }
    )
  }
}
