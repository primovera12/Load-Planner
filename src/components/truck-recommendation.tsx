'use client'

import { TruckRecommendation } from '@/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDimension, formatWeight } from '@/lib/unit-converter'
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileWarning,
} from 'lucide-react'

interface TruckRecommendationCardProps {
  recommendation: TruckRecommendation
  rank: number
}

export function TruckRecommendationCard({
  recommendation,
  rank,
}: TruckRecommendationCardProps) {
  const { truck, score, fit, permitsRequired, reason, warnings, isBestChoice } =
    recommendation

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBg = () => {
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <Card className={isBestChoice ? 'border-2 border-green-500' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full ${getScoreBg()}`}
            >
              <span className={`text-sm font-bold ${getScoreColor()}`}>
                {rank}
              </span>
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                {truck.name}
                {isBestChoice && (
                  <Badge variant="success" className="ml-2">
                    Best Choice
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{truck.category.replace('_', ' ')}</CardDescription>
            </div>
          </div>
          <div className={`text-2xl font-bold ${getScoreColor()}`}>
            {score}
            <span className="text-sm font-normal text-muted-foreground">/100</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fit Analysis */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="space-y-1">
            <div className="text-muted-foreground">Deck Height</div>
            <div className="font-medium">{formatDimension(truck.deckHeight)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Total Height</div>
            <div className="flex items-center gap-1 font-medium">
              {formatDimension(fit.totalHeight)}
              {fit.exceedsHeight ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Max Cargo Weight</div>
            <div className="font-medium">{formatWeight(truck.maxCargoWeight)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground">Legal Status</div>
            <div className="flex items-center gap-1 font-medium">
              {fit.isLegal ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Legal
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Permits Required
                </>
              )}
            </div>
          </div>
        </div>

        {/* Reason */}
        <p className="text-sm text-muted-foreground">{reason}</p>

        {/* Permits Required */}
        {permitsRequired.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileWarning className="h-4 w-4 text-yellow-500" />
              Permits Required ({permitsRequired.length})
            </div>
            <div className="space-y-1">
              {permitsRequired.map((permit, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded bg-yellow-50 px-2 py-1 text-sm"
                >
                  <span>{permit.type.replace(/_/g, ' ')}</span>
                  {permit.estimatedCost && (
                    <span className="text-muted-foreground">
                      ~${permit.estimatedCost}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((warning, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-sm text-yellow-700"
              >
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                {warning}
              </div>
            ))}
          </div>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-1">
          {truck.features.slice(0, 3).map((feature, index) => (
            <Badge key={index} variant="secondary" className="text-xs">
              {feature}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface TruckRecommendationListProps {
  recommendations: TruckRecommendation[]
  showAll?: boolean
}

export function TruckRecommendationList({
  recommendations,
  showAll = false,
}: TruckRecommendationListProps) {
  const displayRecommendations = showAll
    ? recommendations
    : recommendations.slice(0, 5)

  if (recommendations.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No truck recommendations available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {displayRecommendations.map((recommendation, index) => (
        <TruckRecommendationCard
          key={recommendation.truck.id}
          recommendation={recommendation}
          rank={index + 1}
        />
      ))}
      {!showAll && recommendations.length > 5 && (
        <p className="text-center text-sm text-muted-foreground">
          +{recommendations.length - 5} more options available
        </p>
      )}
    </div>
  )
}
