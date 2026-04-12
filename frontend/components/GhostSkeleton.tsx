'use client'

import type { CSSProperties } from 'react'

interface GhostSkeletonProps {
  className?: string
  style?: CSSProperties
}

export default function GhostSkeleton({ className, style }: GhostSkeletonProps) {
  return (
    <div
      className={className}
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.03), rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
        backgroundSize: '200% 100%',
        animation: 'ghost-shimmer 2s linear infinite',
        ...style,
      }}
    />
  )
}
