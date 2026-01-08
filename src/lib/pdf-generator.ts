import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { LoadPlan, PlannedLoad } from './load-planner'
import { LoadItem } from '@/types/load'

// Extend jsPDF type for autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF
    lastAutoTable: { finalY: number }
  }
}

interface AutoTableOptions {
  head?: string[][]
  body?: (string | number)[][]
  startY?: number
  theme?: string
  headStyles?: Record<string, unknown>
  styles?: Record<string, unknown>
  columnStyles?: Record<number, Record<string, unknown>>
  margin?: { left?: number; right?: number }
}

// Color palette for cargo items (matching Cargo-Planner style)
const ITEM_COLORS = [
  '#9B59B6', // Purple
  '#1ABC9C', // Teal
  '#3498DB', // Blue
  '#E74C3C', // Red
  '#F39C12', // Orange
  '#2ECC71', // Green
  '#E91E63', // Pink
  '#00BCD4', // Cyan
  '#FF5722', // Deep Orange
  '#795548', // Brown
]

interface Quote {
  quoteNumber: string
  status: string
  validUntil: string | null
  notes: string | null
  terms: string | null
  subtotal: number
  taxRate: number
  taxAmount: number
  total: number
  createdAt: string
  customer: {
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
  } | null
  lineItems: Array<{
    description: string
    category: string
    quantity: number
    unitPrice: number
    total: number
    notes: string | null
  }>
}

const CATEGORY_LABELS: Record<string, string> = {
  line_haul: 'Line Haul',
  permit: 'Permits',
  escort: 'Escorts',
  fuel: 'Fuel',
  toll: 'Tolls',
  other: 'Other',
}

export function generateQuotePDF(quote: Quote): void {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  let y = 20

  // Helper functions
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  // Header - Company Logo/Name
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text('Load Planner', margin, y)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('AI-Powered Freight Solutions', margin, y + 7)
  doc.setTextColor(0, 0, 0)

  // Quote Number - Right aligned
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(quote.quoteNumber, pageWidth - margin, y, { align: 'right' })
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('QUOTE', pageWidth - margin, y + 7, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  y += 25

  // Horizontal line
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // Quote details and customer info
  const leftCol = margin
  const rightCol = pageWidth / 2 + 10

  // Left column - Quote details
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Quote Date:', leftCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatDate(quote.createdAt), leftCol + 35, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Valid Until:', leftCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(quote.validUntil ? formatDate(quote.validUntil) : 'N/A', leftCol + 35, y)

  y += 7
  doc.setFont('helvetica', 'bold')
  doc.text('Status:', leftCol, y)
  doc.setFont('helvetica', 'normal')
  doc.text(quote.status, leftCol + 35, y)

  // Right column - Customer info
  let customerY = y - 14
  if (quote.customer) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Bill To:', rightCol, customerY)
    doc.setFont('helvetica', 'normal')

    customerY += 7
    doc.text(quote.customer.name, rightCol, customerY)

    if (quote.customer.email) {
      customerY += 5
      doc.text(quote.customer.email, rightCol, customerY)
    }

    if (quote.customer.phone) {
      customerY += 5
      doc.text(quote.customer.phone, rightCol, customerY)
    }

    if (quote.customer.address) {
      customerY += 5
      doc.text(quote.customer.address, rightCol, customerY)
    }

    if (quote.customer.city || quote.customer.state) {
      customerY += 5
      const cityState = [
        quote.customer.city,
        quote.customer.state,
        quote.customer.zipCode,
      ]
        .filter(Boolean)
        .join(', ')
      doc.text(cityState, rightCol, customerY)
    }
  }

  y = Math.max(y, customerY) + 20

  // Line Items Table Header
  doc.setFillColor(245, 245, 245)
  doc.rect(margin, y, pageWidth - margin * 2, 10, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  y += 7
  doc.text('Description', margin + 3, y)
  doc.text('Category', margin + 85, y)
  doc.text('Qty', margin + 115, y, { align: 'center' })
  doc.text('Unit Price', margin + 135, y, { align: 'right' })
  doc.text('Total', pageWidth - margin - 3, y, { align: 'right' })

  y += 8

  // Line Items
  doc.setFont('helvetica', 'normal')
  quote.lineItems.forEach((item) => {
    // Check if we need a new page
    if (y > 260) {
      doc.addPage()
      y = 20
    }

    doc.text(item.description.substring(0, 40), margin + 3, y)
    doc.text(CATEGORY_LABELS[item.category] || item.category, margin + 85, y)
    doc.text(String(item.quantity), margin + 115, y, { align: 'center' })
    doc.text(formatCurrency(item.unitPrice), margin + 135, y, { align: 'right' })
    doc.text(formatCurrency(item.total), pageWidth - margin - 3, y, { align: 'right' })

    if (item.notes) {
      y += 5
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      doc.text(item.notes.substring(0, 60), margin + 5, y)
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(9)
    }

    y += 8

    // Light separator line
    doc.setDrawColor(230, 230, 230)
    doc.line(margin, y - 3, pageWidth - margin, y - 3)
  })

  y += 5

  // Totals section
  const totalsX = pageWidth - margin - 60

  doc.setDrawColor(200, 200, 200)
  doc.line(totalsX - 10, y, pageWidth - margin, y)
  y += 8

  doc.setFontSize(10)
  doc.text('Subtotal:', totalsX, y)
  doc.text(formatCurrency(quote.subtotal), pageWidth - margin - 3, y, { align: 'right' })

  if (quote.taxAmount > 0) {
    y += 7
    doc.text(`Tax (${quote.taxRate}%):`, totalsX, y)
    doc.text(formatCurrency(quote.taxAmount), pageWidth - margin - 3, y, { align: 'right' })
  }

  y += 10
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Total:', totalsX, y)
  doc.text(formatCurrency(quote.total), pageWidth - margin - 3, y, { align: 'right' })

  y += 15

  // Notes
  if (quote.notes) {
    if (y > 240) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Notes', margin, y)
    y += 7
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')

    const noteLines = doc.splitTextToSize(quote.notes, pageWidth - margin * 2)
    doc.text(noteLines, margin, y)
    y += noteLines.length * 5 + 10
  }

  // Terms
  if (quote.terms) {
    if (y > 240) {
      doc.addPage()
      y = 20
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('Terms & Conditions', margin, y)
    y += 7
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)

    const termLines = doc.splitTextToSize(quote.terms, pageWidth - margin * 2)
    doc.text(termLines, margin, y)
    doc.setTextColor(0, 0, 0)
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  doc.text(
    'Generated by Load Planner - AI-Powered Freight Solutions',
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Save the PDF
  doc.save(`${quote.quoteNumber}.pdf`)
}

// =============================================================================
// LOAD PLAN PDF GENERATION
// =============================================================================

interface LoadPlanPDFOptions {
  title?: string
  reference?: string
  companyName?: string
  date?: string
}

/**
 * Generate a complete load plan PDF (similar to Cargo-Planner)
 */
export async function generateLoadPlanPDF(
  loadPlan: LoadPlan,
  options: LoadPlanPDFOptions = {}
): Promise<Uint8Array> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40

  const title = options.title || 'Load Plan'
  const reference = options.reference || `LP-${Date.now()}`
  const date = options.date || new Date().toLocaleDateString()

  // Page 1: Summary
  drawLoadPlanSummary(doc, loadPlan, { title, reference, date, pageWidth, pageHeight, margin })

  // Subsequent pages: Per-trailer details
  loadPlan.loads.forEach((load, index) => {
    doc.addPage()
    drawTrailerDetailPage(doc, load, index + 1, loadPlan.loads.length, { pageWidth, pageHeight, margin })
  })

  return doc.output('arraybuffer') as unknown as Uint8Array
}

/**
 * Draw the summary page
 */
function drawLoadPlanSummary(
  doc: jsPDF,
  loadPlan: LoadPlan,
  opts: { title: string; reference: string; date: string; pageWidth: number; pageHeight: number; margin: number }
) {
  const { title, reference, date, pageWidth, margin } = opts
  let y = margin

  // Header
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y + 20)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Reference: ${reference}`, margin, y + 40)
  doc.text(`Date: ${date}`, margin, y + 55)
  doc.setTextColor(0)

  y += 80

  // Summary box
  doc.setDrawColor(200)
  doc.setFillColor(248, 249, 250)
  doc.roundedRect(margin, y, pageWidth - 2 * margin, 100, 5, 5, 'FD')

  // Count OoG (out of gauge) trailers
  const oogCount = loadPlan.loads.filter(l => !l.isLegal).length

  // Summary stats - left side
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(`${loadPlan.totalTrucks} trailer${loadPlan.totalTrucks > 1 ? 's' : ''} used${oogCount > 0 ? ` (${oogCount} OoG)` : ''}`, margin + 20, y + 25)

  // Trailer type breakdown
  const truckTypes = countTrailerTypes(loadPlan.loads)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  let typeY = y + 45
  truckTypes.forEach(({ type, count }) => {
    doc.text(`${count} x ${type}`, margin + 20, typeY)
    typeY += 15
  })

  // Right side stats
  const rightX = pageWidth / 2 + 20
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 150, 0)
  doc.text(`${loadPlan.totalItems} items loaded`, rightX, y + 25)
  doc.setTextColor(0)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text(`${loadPlan.totalWeight.toLocaleString()} LB total weight`, rightX, y + 45)

  // Calculate total volume
  const totalVolume = loadPlan.loads.reduce((sum, load) => {
    const vol = load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
    return sum + vol
  }, 0)
  doc.text(`${totalVolume.toFixed(1)} FT³ volume`, rightX, y + 60)

  y += 120

  // Trailer summary table with mini views
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Trailer Summary', margin, y)
  y += 20

  // Table headers
  const colWidths = [30, 80, 40, 80, 80, 120, 80]
  const headers = ['#', 'Type', 'Pcs', 'Weight', 'Volume', 'Used Space', 'View']

  doc.setFillColor(52, 73, 94)
  doc.rect(margin, y, pageWidth - 2 * margin, 25, 'F')
  doc.setTextColor(255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')

  let headerX = margin + 5
  headers.forEach((header, i) => {
    doc.text(header, headerX, y + 17)
    headerX += colWidths[i]
  })
  doc.setTextColor(0)
  y += 25

  // Table rows with mini trailer views
  doc.setFont('helvetica', 'normal')
  loadPlan.loads.forEach((load, idx) => {
    const rowHeight = 60
    const volume = load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
    const oogStatus = load.isLegal ? '' : 'OoG'
    const utilizationPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)

    // Alternating row background
    if (idx % 2 === 0) {
      doc.setFillColor(248, 249, 250)
      doc.rect(margin, y, pageWidth - 2 * margin, rowHeight, 'F')
    }

    let cellX = margin + 5
    const cellY = y + 15

    // Row number
    doc.setFontSize(10)
    doc.text((idx + 1).toString(), cellX, cellY)
    cellX += colWidths[0]

    // Type
    doc.text(load.recommendedTruck.name.substring(0, 12), cellX, cellY)
    cellX += colWidths[1]

    // Pcs
    doc.text(load.items.length.toString(), cellX, cellY)
    cellX += colWidths[2]

    // Weight
    doc.text(`${load.weight.toLocaleString()} LB`, cellX, cellY)
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text(`(${utilizationPct}%)`, cellX, cellY + 12)
    doc.setTextColor(0)
    doc.setFontSize(10)
    cellX += colWidths[3]

    // Volume
    doc.text(`${volume.toFixed(1)} FT³`, cellX, cellY)
    cellX += colWidths[4]

    // Used Space with OoG indicator
    if (!load.isLegal) {
      doc.setFillColor(255, 193, 7)
      doc.roundedRect(cellX, cellY - 10, 30, 14, 2, 2, 'F')
      doc.setFontSize(8)
      doc.text('OoG', cellX + 5, cellY)
      doc.setFontSize(10)
    }
    doc.text(`L: ${(load.length * 12).toFixed(0)} IN`, cellX, cellY + 15)
    doc.text(`W: ${(load.width * 12).toFixed(0)} IN`, cellX, cellY + 27)
    doc.text(`H: ${(load.height * 12).toFixed(0)} IN`, cellX, cellY + 39)
    cellX += colWidths[5]

    // Mini trailer view
    drawMiniTrailerView(doc, load, cellX, y + 5, 70, 50)

    y += rowHeight

    // Add page break if needed
    if (y > 700 && idx < loadPlan.loads.length - 1) {
      doc.addPage()
      y = margin
    }
  })

  // Warnings section
  y += 20
  if (loadPlan.warnings.length > 0 || loadPlan.unassignedItems.length > 0) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(200, 50, 50)
    doc.text('Warnings', margin, y)
    doc.setTextColor(0)
    y += 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    loadPlan.warnings.forEach(warning => {
      doc.text(`• ${warning}`, margin + 10, y)
      y += 12
    })
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Generated by Load Planner', margin, pageHeight - 20)
  doc.text('Page 1', pageWidth - margin - 30, pageHeight - 20)
  doc.setTextColor(0)
}

/**
 * Draw a per-trailer detail page
 */
function drawTrailerDetailPage(
  doc: jsPDF,
  load: PlannedLoad,
  loadNumber: number,
  totalLoads: number,
  opts: { pageWidth: number; pageHeight: number; margin: number }
) {
  const { pageWidth, pageHeight, margin } = opts
  let y = margin

  // Header
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text(`${loadNumber} : ${load.recommendedTruck.name}`, margin, y + 15)

  // OoG badge if applicable
  if (!load.isLegal) {
    doc.setFillColor(255, 193, 7)
    doc.roundedRect(margin + 200, y + 2, 40, 18, 3, 3, 'F')
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('OoG', margin + 210, y + 14)
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`Trailer ${loadNumber} of ${totalLoads}`, pageWidth - margin - 80, y + 15)
  doc.setTextColor(0)

  y += 40

  // Main trailer visualization (isometric)
  const vizHeight = 180
  drawTrailerVisualization(doc, load, margin, y, pageWidth - 2 * margin, vizHeight)
  y += vizHeight + 20

  // Three views (top, side, front)
  const viewWidth = (pageWidth - 2 * margin - 40) / 3
  const viewHeight = 70

  drawTopView(doc, load, margin, y, viewWidth, viewHeight)
  drawSideView(doc, load, margin + viewWidth + 20, y, viewWidth, viewHeight)
  drawFrontView(doc, load, margin + 2 * (viewWidth + 20), y, viewWidth, viewHeight)

  y += viewHeight + 25

  // Specs section - 4 columns
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  const colWidth = (pageWidth - 2 * margin) / 4

  // Column 1: Trailer specs
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(load.recommendedTruck.name, margin, y)
  y += 15
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(`Inside Length: ${(load.recommendedTruck.deckLength * 12).toFixed(0)} IN`, margin, y)
  doc.text(`Inside Width: ${(load.recommendedTruck.deckWidth * 12).toFixed(0)} IN`, margin, y + 12)
  doc.text(`Deck Height: ${(load.recommendedTruck.deckHeight * 12).toFixed(0)} IN`, margin, y + 24)
  doc.text(`Payload: ${load.recommendedTruck.maxCargoWeight.toLocaleString()} LB`, margin, y + 36)

  // Column 2: Utilization
  const col2X = margin + colWidth
  doc.setFont('helvetica', 'bold')
  doc.text('Utilization', col2X, y - 15)
  doc.setFont('helvetica', 'normal')
  doc.text(`Length: ${(load.length * 12).toFixed(1)} IN`, col2X, y)
  doc.text(`Width: ${(load.width * 12).toFixed(1)} IN`, col2X, y + 12)
  doc.text(`Height: ${(load.height * 12).toFixed(1)} IN`, col2X, y + 24)
  const weightPct = Math.round((load.weight / load.recommendedTruck.maxCargoWeight) * 100)
  doc.text(`Net Wt: ${load.weight.toLocaleString()} LB (${weightPct}%)`, col2X, y + 36)
  const volume = load.items.reduce((v, item) => v + (item.length * item.width * item.height), 0)
  doc.text(`Volume: ${volume.toFixed(1)} FT³`, col2X, y + 48)

  // Column 3: Total dimensions
  const col3X = margin + 2 * colWidth
  doc.setFont('helvetica', 'bold')
  doc.text('Total', col3X, y - 15)
  doc.setFont('helvetica', 'normal')
  const totalHeight = load.height + load.recommendedTruck.deckHeight
  doc.text(`Length: ${(load.recommendedTruck.deckLength * 12).toFixed(0)} IN`, col3X, y)
  doc.text(`Width: ${(load.width * 12).toFixed(1)} IN`, col3X, y + 12)
  doc.text(`Height: ${(totalHeight * 12).toFixed(1)} IN`, col3X, y + 24)

  // Overhang
  const widthOverhang = Math.max(0, load.width - load.recommendedTruck.deckWidth)
  if (widthOverhang > 0) {
    doc.text(`Overhang Side 1: ${(widthOverhang * 12 / 2).toFixed(1)} IN`, col3X, y + 36)
    doc.text(`Overhang Side 2: ${(widthOverhang * 12 / 2).toFixed(1)} IN`, col3X, y + 48)
  }

  // Column 4: Axle Weights (estimated)
  const col4X = margin + 3 * colWidth
  doc.setFont('helvetica', 'bold')
  doc.text('Axle Weights (Est.)', col4X, y - 15)
  doc.setFont('helvetica', 'normal')
  // Simple 45/55 front/rear distribution estimate
  const frontAxle = Math.round(load.weight * 0.45)
  const rearAxle = Math.round(load.weight * 0.55)
  doc.text(`Front: ${frontAxle.toLocaleString()} LB`, col4X, y)
  doc.text(`Rear: ${rearAxle.toLocaleString()} LB`, col4X, y + 12)

  // Status
  y += 30
  if (!load.isLegal && load.permitsRequired.length > 0) {
    doc.setTextColor(200, 100, 0)
    doc.text('Permits Required:', col4X, y)
    doc.setTextColor(0)
    load.permitsRequired.slice(0, 3).forEach((permit, idx) => {
      const shortPermit = permit.length > 30 ? permit.substring(0, 30) + '...' : permit
      doc.text(`• ${shortPermit}`, col4X, y + 12 + idx * 10)
    })
  }

  y += 70

  // Items table
  doc.setDrawColor(220)
  doc.line(margin, y, pageWidth - margin, y)
  y += 15

  // Table with color indicators
  const tableHeaders = [['', 'SKU', 'Name', 'Qty', 'L (IN)', 'W (IN)', 'H (IN)', 'Weight', 'Stackable']]
  const tableData = load.items.map((item, idx) => [
    '', // Color indicator column
    item.sku || (idx + 1).toString(),
    (item.description || `Item ${idx + 1}`).substring(0, 20),
    item.quantity.toString(),
    (item.length * 12).toFixed(1),
    (item.width * 12).toFixed(1),
    (item.height * 12).toFixed(1),
    item.weight.toLocaleString(),
    item.stackable ? 'Yes' : 'No',
  ])

  // Add totals row
  const totalQty = load.items.reduce((sum, item) => sum + item.quantity, 0)
  const totalWt = load.items.reduce((sum, item) => sum + item.weight, 0)
  tableData.push(['', '', 'TOTAL', totalQty.toString(), '', '', '', totalWt.toLocaleString(), ''])

  doc.autoTable({
    head: tableHeaders,
    body: tableData,
    startY: y,
    theme: 'striped',
    headStyles: { fillColor: [52, 73, 94], textColor: 255, fontSize: 8 },
    styles: { fontSize: 8, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 15 },
    },
    margin: { left: margin, right: margin },
  })

  // Draw color indicators after table is drawn
  const tableStartY = y
  load.items.forEach((item, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    doc.setFillColor(r, g, b)
    doc.rect(margin + 3, tableStartY + 25 + idx * 20, 10, 10, 'F')
  })

  // Footer
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Generated by Load Planner', margin, pageHeight - 20)
  doc.text(`Page ${loadNumber + 1}`, pageWidth - margin - 30, pageHeight - 20)
  doc.setTextColor(0)
}

/**
 * Draw mini trailer view for summary table
 */
function drawMiniTrailerView(doc: jsPDF, load: PlannedLoad, x: number, y: number, width: number, height: number) {
  // Trailer bed
  doc.setFillColor(200, 200, 200)
  doc.setDrawColor(150)
  doc.rect(x, y + height - 12, width, 10, 'FD')

  // Wheels
  doc.setFillColor(60, 60, 60)
  doc.circle(x + width - 8, y + height - 2, 5, 'F')
  doc.circle(x + width - 20, y + height - 2, 5, 'F')

  // Gooseneck
  doc.setFillColor(150, 150, 150)
  doc.rect(x - 10, y + height - 15, 15, 8, 'F')

  // Items
  const scale = (width - 10) / (load.recommendedTruck.deckLength * 12)
  let itemX = x + 3
  load.items.slice(0, 5).forEach((item, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const itemW = Math.min(item.length * 12 * scale, width / 3)
    const itemH = Math.min(item.height * 2, height - 15)

    doc.setFillColor(r, g, b)
    doc.rect(itemX, y + height - 12 - itemH, itemW, itemH, 'F')
    itemX += itemW + 2
  })

  // "..." if more items
  if (load.items.length > 5) {
    doc.setFontSize(8)
    doc.text('...', itemX, y + height - 15)
  }
}

/**
 * Draw isometric trailer visualization
 */
function drawTrailerVisualization(
  doc: jsPDF,
  load: PlannedLoad,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const centerX = x + width / 2
  const centerY = y + height / 2 + 20

  // Trailer dimensions
  const trailerLength = Math.min(width * 0.65, 320)
  const trailerWidth = 55
  const trailerX = centerX - trailerLength / 2

  // Draw trailer deck (gray platform)
  doc.setFillColor(190, 190, 190)
  doc.setDrawColor(120)
  doc.rect(trailerX, centerY - trailerWidth / 2, trailerLength, trailerWidth, 'FD')

  // Gooseneck
  doc.setFillColor(150, 150, 150)
  doc.rect(trailerX - 45, centerY - 12, 50, 24, 'FD')
  doc.setFillColor(80, 80, 80)
  doc.circle(trailerX - 45, centerY, 7, 'F')

  // Wheels (rear axles)
  doc.setFillColor(50, 50, 50)
  const wheelsX = trailerX + trailerLength - 25
  for (let i = 0; i < 3; i++) {
    doc.circle(wheelsX + i * 18, centerY + trailerWidth / 2 + 12, 9, 'F')
    doc.circle(wheelsX + i * 18, centerY - trailerWidth / 2 - 12, 9, 'F')
  }

  // Draw cargo items
  const maxItemLength = Math.max(...load.items.map(i => i.length), 1)
  const scale = (trailerLength * 0.75) / (maxItemLength * 12)

  let cargoX = trailerX + 15
  load.items.forEach((item, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const itemLengthPx = Math.max(item.length * 12 * scale * 0.7, 30)
    const itemWidthPx = Math.min(item.width * 12 * scale * 0.4, trailerWidth * 0.85)
    const itemHeightPx = Math.min(item.height * 2.5, 55)

    // Draw 3D box
    draw3DCargoBox(doc, cargoX, centerY - itemHeightPx / 2, itemLengthPx, itemWidthPx, itemHeightPx, color)

    // Item label
    doc.setFontSize(7)
    doc.setTextColor(255)
    const label = `${item.sku || idx + 1}`
    const dimLabel = `${(item.length * 12).toFixed(0)}x${(item.width * 12).toFixed(0)}x${(item.height * 12).toFixed(0)}`
    doc.text(label, cargoX + itemLengthPx / 2, centerY - 5, { align: 'center' })
    doc.text(dimLabel, cargoX + itemLengthPx / 2, centerY + 5, { align: 'center' })
    doc.setTextColor(0)

    cargoX += itemLengthPx + 8
  })
}

/**
 * Draw a 3D cargo box
 */
function draw3DCargoBox(doc: jsPDF, x: number, y: number, length: number, width: number, height: number, color: string) {
  const r = parseInt(color.slice(1, 3), 16)
  const g = parseInt(color.slice(3, 5), 16)
  const b = parseInt(color.slice(5, 7), 16)

  const topOffset = width * 0.35

  // Front face
  doc.setFillColor(r, g, b)
  doc.setDrawColor(r * 0.6, g * 0.6, b * 0.6)
  doc.rect(x, y, length, height, 'FD')

  // Top face (lighter)
  doc.setFillColor(Math.min(r + 40, 255), Math.min(g + 40, 255), Math.min(b + 40, 255))
  doc.moveTo(x, y)
  doc.lineTo(x + topOffset, y - topOffset)
  doc.lineTo(x + length + topOffset, y - topOffset)
  doc.lineTo(x + length, y)
  doc.close()
  doc.fill()

  // Right face (darker)
  doc.setFillColor(r * 0.75, g * 0.75, b * 0.75)
  doc.moveTo(x + length, y)
  doc.lineTo(x + length + topOffset, y - topOffset)
  doc.lineTo(x + length + topOffset, y + height - topOffset)
  doc.lineTo(x + length, y + height)
  doc.close()
  doc.fill()
}

/**
 * Draw top view
 */
function drawTopView(doc: jsPDF, load: PlannedLoad, x: number, y: number, width: number, height: number) {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Top View', x + width / 2, y - 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  doc.setFillColor(210, 210, 210)
  doc.setDrawColor(150)
  doc.rect(x, y, width, height, 'FD')

  const scale = (width - 8) / (load.recommendedTruck.deckLength * 12)
  let itemX = x + 4
  load.items.forEach((item, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const itemW = Math.min(item.length * 12 * scale, width / 2)
    const itemH = Math.min(item.width * 12 * scale * (height / (width * 0.3)), height - 8)

    doc.setFillColor(r, g, b)
    doc.rect(itemX, y + (height - itemH) / 2, itemW, itemH, 'F')
    itemX += itemW + 2
  })
}

/**
 * Draw side view
 */
function drawSideView(doc: jsPDF, load: PlannedLoad, x: number, y: number, width: number, height: number) {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Side View', x + width / 2, y - 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  const deckH = 8
  doc.setFillColor(180, 180, 180)
  doc.rect(x, y + height - deckH, width, deckH, 'F')

  doc.setFillColor(60, 60, 60)
  doc.circle(x + width - 15, y + height, 6, 'F')
  doc.circle(x + width - 30, y + height, 6, 'F')

  const scale = (width - 8) / (load.recommendedTruck.deckLength * 12)
  let itemX = x + 4
  load.items.forEach((item, idx) => {
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const itemW = Math.min(item.length * 12 * scale, width / 2)
    const itemH = Math.min(item.height * 3, height - deckH - 4)

    doc.setFillColor(r, g, b)
    doc.rect(itemX, y + height - deckH - itemH, itemW, itemH, 'F')
    itemX += itemW + 2
  })
}

/**
 * Draw front view
 */
function drawFrontView(doc: jsPDF, load: PlannedLoad, x: number, y: number, width: number, height: number) {
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('Front View', x + width / 2, y - 5, { align: 'center' })
  doc.setFont('helvetica', 'normal')

  const deckH = 8
  doc.setFillColor(180, 180, 180)
  doc.rect(x, y + height - deckH, width, deckH, 'F')

  doc.setFillColor(60, 60, 60)
  doc.circle(x + 12, y + height, 6, 'F')
  doc.circle(x + width - 12, y + height, 6, 'F')

  // Show widest item in front view
  const widestItem = load.items.reduce((max, item) => item.width > max.width ? item : max, load.items[0])
  if (widestItem) {
    const idx = load.items.indexOf(widestItem)
    const color = ITEM_COLORS[idx % ITEM_COLORS.length]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)

    const itemW = Math.min(widestItem.width * 4, width - 10)
    const itemH = Math.min(widestItem.height * 3, height - deckH - 4)

    doc.setFillColor(r, g, b)
    doc.rect(x + (width - itemW) / 2, y + height - deckH - itemH, itemW, itemH, 'F')
  }
}

/**
 * Count trailer types
 */
function countTrailerTypes(loads: PlannedLoad[]): { type: string; count: number }[] {
  const counts: Record<string, number> = {}
  loads.forEach(load => {
    const type = load.recommendedTruck.name
    counts[type] = (counts[type] || 0) + 1
  })
  return Object.entries(counts).map(([type, count]) => ({ type, count }))
}
