import { NextRequest, NextResponse } from 'next/server'
import { generateLoadPlanPDF } from '@/lib/pdf-generator'
import { LoadPlan } from '@/lib/load-planner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { loadPlan, options } = body as {
      loadPlan: LoadPlan
      options?: {
        title?: string
        reference?: string
        date?: string
      }
    }

    if (!loadPlan || !loadPlan.loads || loadPlan.loads.length === 0) {
      return NextResponse.json(
        { error: 'Invalid load plan data' },
        { status: 400 }
      )
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
