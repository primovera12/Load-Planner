'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ParsedLoadDisplay } from './parsed-load-display'
import { TruckRecommendationList } from './truck-recommendation'
import { AnalyzeResponse } from '@/types'
import { sampleEmails } from '@/data/sample-emails'
import { Loader2, Send, Sparkles, FileText } from 'lucide-react'

export function LoadAnalyzer() {
  const [emailText, setEmailText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      )}
    </div>
  )
}
