'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ToastContext, type ToastType } from '@/hooks/useToast'

interface ToastItem {
  id: string
  message: string
  type: ToastType
  exiting: boolean
}

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem
  onDismiss: (id: string) => void
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDismiss(item.id)
    }, 4000)

    return () => window.clearTimeout(timeoutId)
  }, [item.id, onDismiss])

  const accents: Record<ToastType, { border: string; glow: string }> = {
    success: {
      border: 'rgba(0,230,130,0.6)',
      glow: '0 0 20px rgba(0,230,130,0.1)',
    },
    error: {
      border: 'rgba(255,80,80,0.6)',
      glow: '0 0 20px rgba(255,80,80,0.1)',
    },
    info: {
      border: 'rgba(113,112,255,0.6)',
      glow: 'var(--ghost-glow)',
    },
  }

  return (
    <div
      style={{
        minWidth: 280,
        maxWidth: 360,
        padding: '14px 16px',
        borderLeft: `2px solid ${accents[item.type].border}`,
        borderRadius: 10,
        background: 'rgba(15,16,17,0.92)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid var(--ghost-border)',
        borderRight: '1px solid var(--ghost-border)',
        borderBottom: '1px solid var(--ghost-border)',
        boxShadow: `${accents[item.type].glow}, 0 18px 48px rgba(0,0,0,0.28)`,
        color: 'var(--text-2)',
        fontSize: 14,
        lineHeight: 1.55,
        opacity: item.exiting ? 0 : 1,
        transform: item.exiting ? 'translateY(10px)' : 'translateY(0)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        animation: item.exiting ? undefined : 'ghost-fade-in 0.3s ease',
      }}
    >
      {item.message}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismissToast = useCallback((id: string) => {
    setToasts(current => current.map(item => (
      item.id === id ? { ...item, exiting: true } : item
    )))

    window.setTimeout(() => {
      setToasts(current => current.filter(item => item.id !== id))
    }, 200)
  }, [])

  const contextValue = useMemo(() => ({
    toast: (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      setToasts(current => [...current.slice(-2), { id, message, type, exiting: false }])
    },
  }), [])

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div
        style={{
          position: 'fixed',
          right: 24,
          bottom: 24,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          pointerEvents: 'none',
        }}
      >
        {toasts.map(item => (
          <ToastCard key={item.id} item={item} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
