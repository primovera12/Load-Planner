/**
 * Permit summary PDF/Print generator
 */

import type { RoutePermitSummary, PermitRequirement } from '@/types'
import type { SavedRoute } from './route-storage'

interface PermitPdfData {
  origin: string
  destination: string
  cargo: {
    width: number
    height: number
    length: number
    weight: number
  }
  route?: {
    totalDistance: number
    totalDuration: number
    statesTraversed: string[]
  }
  permits: RoutePermitSummary
  costs: {
    permits: number
    escorts: number
    fuel: number
    tolls: number
    total: number
  }
  fuelPrice?: number
}

/**
 * Generate printable HTML for permit summary
 */
export function generatePermitHtml(data: PermitPdfData): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const statesHtml = data.permits.states
    .map((state) => generateStateHtml(state))
    .join('')

  const warningsHtml = data.permits.warnings.length > 0
    ? `
      <div class="section warnings">
        <h3>⚠️ Warnings</h3>
        <ul>
          ${data.permits.warnings.map(w => `<li>${w}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  const restrictionsHtml = data.permits.overallRestrictions.length > 0
    ? `
      <div class="section restrictions">
        <h3>🕐 Travel Restrictions</h3>
        <ul>
          ${data.permits.overallRestrictions.map(r => `<li>${r}</li>`).join('')}
        </ul>
      </div>
    `
    : ''

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Permit Summary - ${data.origin} to ${data.destination}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
            line-height: 1.5;
            color: #333;
          }
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            font-size: 24px;
            color: #1e40af;
            margin-bottom: 5px;
          }
          .header .subtitle {
            color: #64748b;
            font-size: 14px;
          }
          .header .date {
            color: #94a3b8;
            font-size: 12px;
            margin-top: 10px;
          }
          .route-summary {
            background: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .route-summary h2 {
            font-size: 16px;
            color: #475569;
            margin-bottom: 15px;
          }
          .route-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
          }
          .info-item {
            font-size: 14px;
          }
          .info-item label {
            display: block;
            color: #64748b;
            font-size: 11px;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .info-item .value {
            font-weight: 600;
            color: #1e293b;
          }
          .cargo-specs {
            background: #fef3c7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .cargo-specs h2 {
            font-size: 16px;
            color: #92400e;
            margin-bottom: 15px;
          }
          .cargo-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
          }
          .cost-summary {
            background: #dcfce7;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 25px;
          }
          .cost-summary h2 {
            font-size: 16px;
            color: #166534;
            margin-bottom: 15px;
          }
          .cost-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 15px;
          }
          .cost-item.total {
            background: #166534;
            color: white;
            padding: 10px;
            border-radius: 6px;
            text-align: center;
          }
          .cost-item.total label {
            color: #bbf7d0;
          }
          .cost-item.total .value {
            color: white;
            font-size: 20px;
          }
          .section {
            margin-bottom: 25px;
          }
          .section h3 {
            font-size: 14px;
            color: #475569;
            margin-bottom: 10px;
            padding-bottom: 5px;
            border-bottom: 1px solid #e2e8f0;
          }
          .warnings {
            background: #fef9c3;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #eab308;
          }
          .warnings h3 {
            color: #854d0e;
            border-bottom-color: #fde047;
          }
          .warnings ul {
            padding-left: 20px;
            color: #713f12;
          }
          .restrictions {
            background: #f1f5f9;
            padding: 15px;
            border-radius: 8px;
          }
          .restrictions ul {
            padding-left: 20px;
            color: #475569;
          }
          .state-card {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
          }
          .state-header {
            background: #f8fafc;
            padding: 12px 15px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
          }
          .state-name {
            font-weight: 600;
          }
          .state-code {
            background: #64748b;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            margin-right: 10px;
          }
          .state-code.has-issues {
            background: #dc2626;
          }
          .state-fee {
            font-weight: 600;
            color: #166534;
          }
          .state-body {
            padding: 15px;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            margin-right: 5px;
            margin-bottom: 5px;
          }
          .badge.oversize {
            background: #fef3c7;
            color: #92400e;
          }
          .badge.overweight {
            background: #fee2e2;
            color: #991b1b;
          }
          .badge.superload {
            background: #dc2626;
            color: white;
          }
          .badge.ok {
            background: #dcfce7;
            color: #166534;
          }
          .state-details {
            margin-top: 10px;
            font-size: 13px;
          }
          .state-details dt {
            color: #64748b;
            font-size: 11px;
            margin-top: 8px;
          }
          .state-details dd {
            color: #1e293b;
          }
          .state-details ul {
            padding-left: 18px;
            color: #475569;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
          }
          @media print {
            body { padding: 20px; }
            .state-card { break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚛 Permit Requirements Summary</h1>
          <div class="subtitle">${data.origin} → ${data.destination}</div>
          <div class="date">Generated: ${dateStr}</div>
        </div>

        ${data.route ? `
          <div class="route-summary">
            <h2>📍 Route Information</h2>
            <div class="route-info">
              <div class="info-item">
                <label>Total Distance</label>
                <div class="value">${data.route.totalDistance.toLocaleString()} miles</div>
              </div>
              <div class="info-item">
                <label>Estimated Duration</label>
                <div class="value">${Math.floor(data.route.totalDuration / 60)}h ${data.route.totalDuration % 60}m</div>
              </div>
              <div class="info-item" style="grid-column: span 2;">
                <label>Route</label>
                <div class="value">${data.route.statesTraversed.join(' → ')}</div>
              </div>
            </div>
          </div>
        ` : ''}

        <div class="cargo-specs">
          <h2>📦 Cargo Specifications</h2>
          <div class="cargo-grid">
            <div class="info-item">
              <label>Width</label>
              <div class="value">${data.cargo.width} ft</div>
            </div>
            <div class="info-item">
              <label>Height</label>
              <div class="value">${data.cargo.height} ft</div>
            </div>
            <div class="info-item">
              <label>Length</label>
              <div class="value">${data.cargo.length} ft</div>
            </div>
            <div class="info-item">
              <label>Gross Weight</label>
              <div class="value">${data.cargo.weight.toLocaleString()} lbs</div>
            </div>
          </div>
        </div>

        <div class="cost-summary">
          <h2>💰 Cost Breakdown</h2>
          <div class="cost-grid">
            <div class="info-item">
              <label>Permits</label>
              <div class="value">$${data.costs.permits.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <label>Escorts</label>
              <div class="value">$${data.costs.escorts.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <label>Fuel</label>
              <div class="value">$${data.costs.fuel.toLocaleString()}</div>
            </div>
            <div class="info-item">
              <label>Tolls</label>
              <div class="value">$${data.costs.tolls.toLocaleString()}</div>
            </div>
            <div class="cost-item total">
              <label>Total</label>
              <div class="value">$${data.costs.total.toLocaleString()}</div>
            </div>
          </div>
        </div>

        ${warningsHtml}
        ${restrictionsHtml}

        <div class="section">
          <h3>📋 State-by-State Requirements</h3>
          ${statesHtml}
        </div>

        <div class="footer">
          Generated by Load Planner • Estimates are approximate and subject to change<br>
          Always verify current requirements with state DOT before travel
        </div>
      </body>
    </html>
  `
}

function generateStateHtml(state: PermitRequirement): string {
  const hasIssues = state.oversizeRequired || state.overweightRequired || state.escortsRequired > 0

  const badges: string[] = []
  if (state.isSuperload) {
    badges.push('<span class="badge superload">SUPERLOAD</span>')
  }
  if (state.oversizeRequired) {
    badges.push('<span class="badge oversize">Oversize Permit</span>')
  }
  if (state.overweightRequired) {
    badges.push('<span class="badge overweight">Overweight Permit</span>')
  }
  if (!state.oversizeRequired && !state.overweightRequired) {
    badges.push('<span class="badge ok">No Permit Required</span>')
  }

  const escortsInfo = []
  if (state.escortsRequired > 0) {
    escortsInfo.push(`${state.escortsRequired} escort vehicle(s)`)
  }
  if (state.poleCarRequired) {
    escortsInfo.push('Pole car required')
  }
  if (state.policeEscortRequired) {
    escortsInfo.push('Police escort required')
  }

  return `
    <div class="state-card">
      <div class="state-header">
        <div>
          <span class="state-code ${hasIssues ? 'has-issues' : ''}">${state.stateCode}</span>
          <span class="state-name">${state.state}</span>
        </div>
        <span class="state-fee">$${state.estimatedFee.toLocaleString()}</span>
      </div>
      <div class="state-body">
        <div>${badges.join('')}</div>

        <dl class="state-details">
          ${escortsInfo.length > 0 ? `
            <dt>Escort Requirements</dt>
            <dd>${escortsInfo.join(', ')}</dd>
          ` : ''}

          ${state.reasons.length > 0 ? `
            <dt>Reasons</dt>
            <dd>
              <ul>
                ${state.reasons.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </dd>
          ` : ''}

          ${state.travelRestrictions.length > 0 ? `
            <dt>Travel Restrictions</dt>
            <dd>
              <ul>
                ${state.travelRestrictions.map(r => `<li>${r}</li>`).join('')}
              </ul>
            </dd>
          ` : ''}
        </dl>
      </div>
    </div>
  `
}

/**
 * Open print dialog for permit summary
 */
export function printPermitSummary(data: PermitPdfData): void {
  const html = generatePermitHtml(data)
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Please allow popups to print the permit summary')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.print()
}

/**
 * Download permit summary as HTML file
 */
export function downloadPermitSummary(data: PermitPdfData): void {
  const html = generatePermitHtml(data)
  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `permit-summary-${data.origin.replace(/[^a-z0-9]/gi, '-')}-to-${data.destination.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.html`
  link.click()
  URL.revokeObjectURL(url)
}
