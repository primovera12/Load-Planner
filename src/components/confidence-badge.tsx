'use client'

import { Badge } from '@/components/ui/badge'

interface ConfidenceBadgeProps {
  confidence: number
  showLabel?: boolean
}

export function ConfidenceBadge({
  confidence,
  showLabel = true,
}: ConfidenceBadgeProps) {
  const getVariant = () => {
    if (confidence >= 80) return 'success'
    if (confidence >= 50) return 'warning'
    return 'destructive'
  }

  const getLabel = () => {
    if (confidence >= 80) return 'High'
    if (confidence >= 50) return 'Medium'
    return 'Low'
  }

  return (
    <Badge variant={getVariant()}>
      {showLabel && `${getLabel()} Confidence: `}
      {confidence}%
    </Badge>
  )
}
