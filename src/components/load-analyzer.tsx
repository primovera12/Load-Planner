'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ParsedLoadDisplay } from './parsed-load-display'
import { TruckRecommendationList } from './truck-recommendation'
import { AnalyzeResponse } from '@/types'
import { sampleEmails } from '@/data/sample-emails'
import { Loader2, Sparkles, FileText, Box } from 'lucide-react'

export function LoadAnalyzer() {
  const router = useRouter()
  const [emailText, setEmailText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const visualizeLoad = () => {
    if (!result?.parsedLoad || !result.recommendations.length) return

    // Get the best recommendation's trailer type
    const bestRec = result.recommendations.find(r => r.isBestChoice) || result.recommendations[0]
    const trailerType = bestRec.truck.category.toLowerCase().replace('_', '-') as
      'flatbed' | 'step-deck' | 'rgn' | 'lowboy' | 'double-drop'

    // Convert parsed load to cargo items for visualizer
    const cargoItems = result.parsedLoad.items.length > 0
      ? result.parsedLoad.items.map((item, index) => ({
          id: `cargo-${Date.now()}-${index}`,
          name: item.description || `Item ${index + 1}`,
          width: item.width,
          height: item.height,
          length: item.length,
          weight: item.weight,
          color: '#3b82f6',
          position: [0, 0, 0] as [number, number, number],
        }))
      : [{
          id: `cargo-${Date.now()}`,
          name: result.parsedLoad.description || 'Cargo',
          width: result.parsedLoad.width,
          height: result.parsedLoad.height,
          length: result.parsedLoad.length,
          weight: result.parsedLoad.weight,
          color: '#3b82f6',
          position: [0, 0, 0] as [number, number, number],
        }]

    // Store in sessionStorage for the visualize page to pick up
    sessionStorage.setItem('visualize-cargo', JSON.stringify({
      trailerType,
      cargo: cargoItems,
      source: 'analyze',
    }))

    // Navigate to visualize page
    router.push('/visualize')
  }

  const analyzeEmail = async () => {
    if (!emailText.trim()) {
      setError('Please enter or paste an email to analyze')
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailText }),
      })

      const data: AnalyzeResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze email')
      }

      setResult(data)

      if (data.error) {
        setError(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const loadSampleEmail = (index: number) => {
    const sample = sampleEmails[index]
    if (sample) {
      setEmailText(sample.email)
      setResult(null)
      setError(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Load Analyzer
          </CardTitle>
          <CardDescription>
            Paste a freight request email below to automatically extract cargo
            dimensions and get truck recommendations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Paste your freight request email here...

Example:
We need a quote to move a CAT 320 Excavator.
Dimensions: 32' L x 10' W x 10'6&quot; H
Weight: 52,000 lbs
From: Houston, TX
To: Dallas, TX"
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            className="min-h-[200px] font-mono text-sm"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={analyzeEmail} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Analyze Load
                </>
              )}
            </Button>

            <div className="flex-1" />

            <span className="text-sm text-muted-foreground">Try a sample:</span>
            {sampleEmails.slice(0, 4).map((sample, index) => (
              <Button
                key={sample.id}
                variant="outline"
                size="sm"
                onClick={() => loadSampleEmail(index)}
              >
                {sample.name}
              </Button>
            ))}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && result.parsedLoad && (
        <div className="space-y-6">
          {/* Visualize Button */}
          {result.recommendations.length > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Box className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Ready to Visualize</p>
                    <p className="text-sm text-muted-foreground">
                      View your cargo on a {result.recommendations[0]?.truck.name || 'trailer'} in 3D
                    </p>
                  </div>
                </div>
                <Button onClick={visualizeLoad} size="lg">
                  <Box className="mr-2 h-4 w-4" />
                  Visualize in 3D
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Parsed Load */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">Extracted Information</h2>
              <ParsedLoadDisplay parsedLoad={result.parsedLoad} />
            </div>

            {/* Recommendations */}
            <div>
              <h2 className="mb-4 text-lg font-semibold">
                Truck Recommendations
                {result.recommendations.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({result.recommendations.length} options)
                  </span>
                )}
              </h2>
              <TruckRecommendationList recommendations={result.recommendations} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
