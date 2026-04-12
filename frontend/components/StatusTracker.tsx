'use client'
import { Project, STAGE_LABELS, STAGE_PROGRESS, PIPELINE_STAGES } from '@/lib/types'

export default function StatusTracker({ project }: { project: Project }) {
  const progress = STAGE_PROGRESS[project.status] ?? 0
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === project.status)
  const failed = project.status === 'failed'

  return (
    <div className="panel space-y-5 p-5" style={{ borderRadius: 16 }}>
      <div className="flex items-center justify-between gap-3">
        <p className="section-title">Progress</p>
        <span
          className="mono text-xs"
          style={{
            color: failed ? 'var(--error)' : 'var(--violet)',
            padding: '6px 10px',
            borderRadius: 9999,
            border: `1px solid ${failed ? 'rgba(239,68,68,0.24)' : 'rgba(113,112,255,0.24)'}`,
            background: failed ? 'rgba(239,68,68,0.08)' : 'rgba(113,112,255,0.08)',
          }}
        >
          {progress}%
        </span>
      </div>

      <div
        className="w-full overflow-hidden rounded-full"
        style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="transition-all duration-700"
          style={{
            width: `${progress}%`,
            height: 6,
            background: failed ? 'var(--error)' : 'linear-gradient(90deg, var(--indigo), var(--violet))',
          }}
        />
      </div>

      <p className="text-sm" style={{ color: failed ? 'var(--error)' : 'var(--muted)', letterSpacing: '-0.165px', lineHeight: 1.6 }}>
        {STAGE_LABELS[project.status]}
      </p>

      <div className="flex gap-2 flex-wrap">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx && !failed
          const highlighted = done || active
          return (
            <div
              key={stage.key}
              className="text-xs px-3 py-1"
              style={{
                borderRadius: 9999,
                border: '1px solid',
                borderColor: highlighted ? 'rgba(113,112,255,0.4)' : 'rgba(255,255,255,0.08)',
                background: highlighted ? 'rgba(113,112,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: highlighted ? 'var(--violet)' : 'var(--muted)',
                fontWeight: highlighted ? 510 : 400,
                boxShadow: active ? '0 0 12px rgba(113,112,255,0.35)' : undefined,
                animation: active ? 'ghost-pulse 2s ease-in-out infinite' : undefined,
              }}
            >
              {done ? '✓ ' : active ? '◉ ' : '○ '}{stage.label}
            </div>
          )
        })}
      </div>

      {project.frame_count && (
        <p className="mono text-xs" style={{ color: 'var(--subdued)' }}>
          {project.frame_count} unique screens extracted
        </p>
      )}
    </div>
  )
}
