'use client'
import { useRef, useState } from 'react'

const MAX_MB = 50
const toMB = (bytes: number) => bytes / 1024 / 1024

interface Props { file: File | null; onFile: (f: File) => void }

export default function UploadZone({ file, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sizeError, setSizeError] = useState('')
  const [isHovered, setIsHovered] = useState(false)

  function isAcceptedVideo(f: File) {
    const name = f.name.toLowerCase()
    return (
      f.type === 'video/mp4' ||
      f.type === 'video/quicktime' ||
      name.endsWith('.mp4') ||
      name.endsWith('.mov')
    )
  }

  function accept(f: File) {
    if (!isAcceptedVideo(f)) {
      setSizeError('Only MP4 or MOV files accepted')
      return
    }
    if (toMB(f.size) > MAX_MB) {
      setSizeError(`File is ${toMB(f.size).toFixed(0)} MB — max is ${MAX_MB} MB. Try trimming or exporting at lower resolution.`)
      return
    }
    setSizeError('')
    onFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) accept(f)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) accept(f) }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="w-full cursor-pointer text-center transition-colors"
        style={{
          borderRadius: 20,
          border: `1px dashed ${
            file
              ? 'rgba(113,112,255,0.42)'
              : isHovered
                ? 'rgba(113,112,255,0.3)'
                : 'rgba(255,255,255,0.10)'
          }`,
          background: file
            ? 'linear-gradient(180deg, rgba(113,112,255,0.10), rgba(255,255,255,0.03))'
            : isHovered
              ? 'rgba(113,112,255,0.04)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
          padding: '32px 20px',
          boxShadow: file
            ? '0 16px 40px rgba(94,106,210,0.12)'
            : isHovered
              ? 'var(--ghost-glow)'
              : 'inset 0 1px 0 rgba(255,255,255,0.03)',
          transition: 'all 0.25s ease',
        }}
      >
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: file ? 'rgba(113,112,255,0.14)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${file ? 'rgba(113,112,255,0.24)' : 'rgba(255,255,255,0.08)'}`,
            color: file ? 'var(--violet)' : 'var(--text-2)',
            fontSize: 20,
            animation: !file && isHovered ? 'ghost-float 3s ease-in-out infinite' : undefined,
          }}
        >
          {file ? '✓' : '↑'}
        </div>
        {file ? (
          <div className="mt-5">
            <p className="text-base" style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.01em' }}>{file.name}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              {toMB(file.size).toFixed(1)} MB · click to replace
            </p>
          </div>
        ) : (
          <div className="mt-5">
            <p
              className="text-base"
              style={{
                color: 'var(--text-2)',
                fontWeight: 510,
                letterSpacing: '-0.01em',
                animation: isHovered ? 'ghost-float 3s ease-in-out infinite' : undefined,
              }}
            >
              Drop your recording here
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              MP4 or QuickTime · capped at {MAX_MB} MB
            </p>
            <p className="mt-3 text-xs uppercase" style={{ color: 'var(--subdued)', letterSpacing: '0.1em' }}>
              Click to browse
            </p>
          </div>
        )}
      </button>
      {sizeError && (
        <p className="mt-3 text-xs" style={{ color: 'var(--error)' }}>{sizeError}</p>
      )}
    </>
  )
}
