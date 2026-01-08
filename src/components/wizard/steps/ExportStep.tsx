'use client'

import { useState } from 'react'
import { Download, Share2, ClipboardList, Check, Copy, Loader2, FileText, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useWizard } from '../WizardProvider'
import { cn } from '@/lib/utils'

// Export card component
function ExportCard({
  title,
  description,
  icon: Icon,
  onClick,
  loading,
  success,
  disabled,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
  loading?: boolean
  success?: boolean
  disabled?: boolean
}) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        success && 'border-green-500 bg-green-50'
      )}
      onClick={disabled ? undefined : onClick}
    >
      <CardContent className="p-6 text-center">
        <div
          className={cn(
            'w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center',
            success ? 'bg-green-100' : 'bg-primary/10'
          )}
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : success ? (
            <Check className="w-6 h-6 text-green-600" />
          ) : (
            <Icon className="w-6 h-6 text-primary" />
          )}
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

export function ExportStep() {
  const { state, dispatch, resetWizard } = useWizard()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isGeneratingInstructions, setIsGeneratingInstructions] = useState(false)
  const [isCreatingShare, setIsCreatingShare] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pdfSuccess, setPdfSuccess] = useState(false)
  const [instructionsSuccess, setInstructionsSuccess] = useState(false)

  // Generate and download PDF
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true)
    setPdfSuccess(false)

    try {
      // Prepare load plan data
      const loadPlanData = {
        items: state.items,
        placements: state.placements,
        trailers: state.selectedTrailers,
        origin: state.origin,
        destination: state.destination,
        description: state.loadDescription,
        instructions: state.loadingInstructions,
      }

      const response = await fetch('/api/generate-load-plan-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loadPlanData),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `load-plan-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setPdfSuccess(true)
      dispatch({ type: 'SET_PDF_GENERATED', payload: true })
    } catch (error) {
      console.error('PDF generation error:', error)
      alert('Failed to generate PDF. Please try again.')
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // Generate and download loading instructions
  const handleDownloadInstructions = async () => {
    setIsGeneratingInstructions(true)
    setInstructionsSuccess(false)

    try {
      // Generate text content
      let content = `LOADING INSTRUCTIONS\n`
      content += `${'='.repeat(50)}\n\n`

      if (state.loadDescription) {
        content += `Load: ${state.loadDescription}\n`
      }
      if (state.origin && state.destination) {
        content += `Route: ${state.origin} → ${state.destination}\n`
      }
      content += `Trailer: ${state.selectedTrailers[0]?.name || 'N/A'}\n`
      content += `Generated: ${new Date().toLocaleString()}\n\n`

      content += `LOADING SEQUENCE\n`
      content += `${'-'.repeat(50)}\n\n`

      state.loadingInstructions.forEach((inst) => {
        content += `Step ${inst.stepNumber}: ${inst.itemName}\n`
        content += `  Position: ${inst.position.description}\n`
        content += `  Orientation: ${inst.rotation}\n`
        if (inst.secureInstructions.length > 0) {
          content += `  Securement:\n`
          inst.secureInstructions.forEach((s) => {
            content += `    - ${s}\n`
          })
        }
        content += `\n`
      })

      content += `\nITEMS SUMMARY\n`
      content += `${'-'.repeat(50)}\n\n`

      state.items.forEach((item, index) => {
        content += `${index + 1}. ${item.description}\n`
        content += `   Dimensions: ${item.length}'L × ${item.width}'W × ${item.height}'H\n`
        content += `   Weight: ${item.weight.toLocaleString()} lbs\n\n`
      })

      const totalWeight = state.items.reduce((sum, i) => sum + i.weight, 0)
      content += `\nTotal Weight: ${totalWeight.toLocaleString()} lbs\n`

      // Download as text file
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `loading-instructions-${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setInstructionsSuccess(true)
    } catch (error) {
      console.error('Instructions generation error:', error)
      alert('Failed to generate instructions. Please try again.')
    } finally {
      setIsGeneratingInstructions(false)
    }
  }

  // Create shareable link
  const handleCreateShareLink = async () => {
    setIsCreatingShare(true)

    try {
      const response = await fetch('/api/load-plan-share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: state.items,
          placements: state.placements,
          trailers: state.selectedTrailers,
          origin: state.origin,
          destination: state.destination,
          description: state.loadDescription,
          instructions: state.loadingInstructions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create share link')
      }

      const data = await response.json()
      const fullUrl = `${window.location.origin}/plan/${data.token}`
      setShareUrl(fullUrl)
      dispatch({ type: 'SET_SHARE_TOKEN', payload: data.token })
    } catch (error) {
      console.error('Share link error:', error)
      alert('Failed to create share link. Please try again.')
    } finally {
      setIsCreatingShare(false)
    }
  }

  // Copy share URL to clipboard
  const handleCopyUrl = async () => {
    if (!shareUrl) return

    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy error:', error)
    }
  }

  // Start new plan
  const handleStartNew = () => {
    if (confirm('Start a new load plan? Current plan will be cleared.')) {
      resetWizard()
    }
  }

  return (
    <div className="space-y-6">
      {/* Step header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold">Load Plan Complete!</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your load plan is ready. Download, share, or start a new plan.
        </p>
      </div>

      {/* Export options */}
      <div className="grid md:grid-cols-3 gap-4">
        <ExportCard
          title="Download PDF"
          description="Complete load plan with diagrams and specs"
          icon={Download}
          onClick={handleDownloadPdf}
          loading={isGeneratingPdf}
          success={pdfSuccess}
        />

        <ExportCard
          title="Loading Instructions"
          description="Step-by-step loading guide for drivers"
          icon={ClipboardList}
          onClick={handleDownloadInstructions}
          loading={isGeneratingInstructions}
          success={instructionsSuccess}
        />

        <ExportCard
          title="Create Share Link"
          description="Shareable link (no login required)"
          icon={Share2}
          onClick={handleCreateShareLink}
          loading={isCreatingShare}
          success={!!shareUrl}
        />
      </div>

      {/* Share URL display */}
      {shareUrl && (
        <Card className="border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share Link Created
            </CardTitle>
            <CardDescription>
              Anyone with this link can view your load plan (no login required)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={shareUrl}
                readOnly
                className="font-mono text-sm"
              />
              <Button variant="outline" onClick={handleCopyUrl}>
                {copied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  Preview Link
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Trailer:</span>{' '}
              <span className="font-medium">{state.selectedTrailers[0]?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Items:</span>{' '}
              <span className="font-medium">{state.items.length}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Weight:</span>{' '}
              <span className="font-medium">
                {state.items.reduce((sum, i) => sum + i.weight, 0).toLocaleString()} lbs
              </span>
            </div>
            {state.origin && state.destination && (
              <div>
                <span className="text-muted-foreground">Route:</span>{' '}
                <span className="font-medium">{state.origin} → {state.destination}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Start new button */}
      <div className="flex justify-center pt-4">
        <Button variant="outline" onClick={handleStartNew} className="px-8">
          Start New Load Plan
        </Button>
      </div>
    </div>
  )
}
