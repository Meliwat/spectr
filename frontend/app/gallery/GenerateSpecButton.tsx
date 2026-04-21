'use client'

import { useState } from 'react'
import GenerateSpecModal from './GenerateSpecModal'

export default function GenerateSpecButton({
  defaultReferenceApp,
  className,
  children,
}: {
  defaultReferenceApp?: string
  className?: string
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children ?? 'Generate your own spec ↗'}
      </button>
      <GenerateSpecModal
        open={open}
        onClose={() => setOpen(false)}
        defaultReferenceApp={defaultReferenceApp}
      />
    </>
  )
}
