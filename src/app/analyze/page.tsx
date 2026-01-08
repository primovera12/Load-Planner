import { UniversalAnalyzer } from '@/components/universal-analyzer'
import { Sparkles, Upload, FileSpreadsheet, FileText, Image } from 'lucide-react'

export default function AnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Hero Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-gradient-to-r from-primary/20 to-primary/5 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Universal Load Analyzer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload any file or paste text - we&apos;ll extract cargo dimensions and recommend the perfect truck.
          </p>

          {/* Supported Formats */}
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              Excel & CSV
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-sm">
              <FileText className="h-4 w-4" />
              PDF Documents
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm">
              <Image className="h-4 w-4" />
              Images
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm">
              <Upload className="h-4 w-4" />
              Text & Emails
            </div>
          </div>
        </div>

        {/* Analyzer Component */}
        <UniversalAnalyzer />

        {/* Footer Info */}
        <div className="mt-10 rounded-xl border bg-muted/30 p-5">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Height Limit:</span>
              <span className="rounded-md bg-white px-2.5 py-1 font-mono shadow-sm border">13.5&apos;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Width Limit:</span>
              <span className="rounded-md bg-white px-2.5 py-1 font-mono shadow-sm border">8.5&apos;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">GVW Limit:</span>
              <span className="rounded-md bg-white px-2.5 py-1 font-mono shadow-sm border">80,000 lbs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
