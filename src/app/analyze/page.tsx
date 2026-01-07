import { LoadAnalyzer } from '@/components/load-analyzer'
import { ScanSearch, Zap, Shield, Clock } from 'lucide-react'

export default function AnalyzePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-6xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ScanSearch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Load Analyzer</h1>
              <p className="text-sm text-muted-foreground">
                AI-powered freight email parsing and truck recommendations
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Zap className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">90%+</div>
              <div className="text-xs text-muted-foreground">Parse Accuracy</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">&lt;3s</div>
              <div className="text-xs text-muted-foreground">Response Time</div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border bg-white p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Shield className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">10</div>
              <div className="text-xs text-muted-foreground">Trailer Types</div>
            </div>
          </div>
        </div>

        {/* Analyzer Component */}
        <LoadAnalyzer />

        {/* Footer Info */}
        <div className="mt-8 rounded-lg border bg-white/50 p-4">
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium">Height Limit:</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">13.5&apos;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Width Limit:</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">8.5&apos;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">GVW Limit:</span>
              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono">80,000 lbs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
