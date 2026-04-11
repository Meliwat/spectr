'use client'
import { Project, STAGE_LABELS, STAGE_PROGRESS, PIPELINE_STAGES } from '@/lib/types'

export default function StatusTracker({ project }: { project: Project }) {
  const progress = STAGE_PROGRESS[project.status] ?? 0
  const currentIdx = PIPELINE_STAGES.findIndex(s => s.key === project.status)
  const failed = project.status === 'failed'

  return (
    <div className="space-y-4">
      <div className="w-full h-px" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div
          className="h-px transition-all duration-700"
          style={{ width: `${progress}%`, background: failed ? 'var(--error)' : 'var(--violet)' }}
        />
      </div>

      <p className="text-sm" style={{ color: failed ? 'var(--error)' : 'var(--muted)', letterSpacing: '-0.165px' }}>
        {STAGE_LABELS[project.status]}
      </p>

      <div className="flex gap-2 flex-wrap">
        {PIPELINE_STAGES.map((stage, idx) => {
          const done = idx < currentIdx
          const active = idx === currentIdx && !failed
          return (
            <div
              key={stage.key}
              className="text-xs px-3 py-1"
              style={{
                borderRadius: 9999,
                border: '1px solid',
                borderColor: done || active ? 'rgba(113,112,255,0.4)' : 'rgba(255,255,255,0.08)',
                background: done || active ? 'rgba(113,112,255,0.1)' : 'rgba(255,255,255,0.02)',
                color: done || active ? 'var(--violet)' : 'var(--subdued)',
                fontWeight: done || active ? 510 : 400,
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
