'use client'
import { useRef } from 'react'

interface Props { file: File | null; onFile: (f: File) => void }

export default function UploadZone({ file, onFile }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f && (f.type === 'video/mp4' || f.type === 'video/quicktime')) onFile(f)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className="w-full p-12 text-center cursor-pointer transition-colors"
      style={{
        borderRadius: 8,
        border: `1px dashed ${file ? 'rgba(113,112,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
        background: file ? 'rgba(113,112,255,0.05)' : 'rgba(255,255,255,0.02)',
      }}
    >
      <input ref={inputRef} type="file" accept="video/mp4,video/quicktime" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }} />
      {file ? (
        <div>
          <p className="text-sm" style={{ color: 'var(--violet)', fontWeight: 510 }}>{file.name}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB · Click to change
          </p>
        </div>
      ) : (
        <div>
          <p className="text-sm" style={{ color: 'var(--text-2)' }}>Drop your MP4 here or click to browse</p>
          <p className="text-xs mt-2" style={{ color: 'var(--subdued)' }}>Max 500 MB</p>
        </div>
      )}
    </div>
  )
}
