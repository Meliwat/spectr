export type ProjectStatus =
  | 'pending'
  | 'extracting'
  | 'analyzing_frontend'
  | 'analyzing_backend'
  | 'stitching'
  | 'complete'
  | 'failed'

export interface Project {
  id: string
  status: ProjectStatus
  reference_app: string
  your_app_name: string | null
  brand_colors: Record<string, string> | null
  logo_s3_key: string | null
  bundle_id: string | null
  frame_count: number | null
  spec_md_text: string | null
  error_text: string | null
  created_at: string
  updated_at: string
}

export const STAGE_LABELS: Record<ProjectStatus, string> = {
  pending:             'Queued...',
  extracting:          'Extracting screens from your recording...',
  analyzing_frontend:  'Analyzing UI with Claude Vision...',
  analyzing_backend:   'Researching backend architecture...',
  stitching:           'Writing your spec...',
  complete:            'Your spec.md is ready.',
  failed:              'Something went wrong.',
}

export const STAGE_PROGRESS: Record<ProjectStatus, number> = {
  pending: 0,
  extracting: 15,
  analyzing_frontend: 40,
  analyzing_backend: 65,
  stitching: 85,
  complete: 100,
  failed: 0,
}

export const PIPELINE_STAGES: { key: ProjectStatus; label: string }[] = [
  { key: 'extracting',         label: 'Extract' },
  { key: 'analyzing_frontend', label: 'Analyze UI' },
  { key: 'analyzing_backend',  label: 'Research Backend' },
  { key: 'stitching',          label: 'Write Spec' },
  { key: 'complete',           label: 'Done' },
]
