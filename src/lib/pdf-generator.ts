import jsPDF from 'jspdf'

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
