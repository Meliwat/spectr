export type LegacyProjectStatus =
  | 'analyzing_frontend'
  | 'analyzing_backend'
  | 'stitching'

export type MobileProjectStatus =
  | 'pending'
  | 'extracting'
  | 'analyzing_screens'
  | 'analyzing_transitions'
  | 'synthesizing_schema'
  | 'generating_backend'
  | 'generating_frontend'
  | 'validating'
  | 'repairing'
  | 'bundling'
  | 'complete'
  | 'failed'
  | 'awaiting_manual_processing'

export type ProcessingMode = 'auto' | 'manual'

export type ProjectStatus = MobileProjectStatus | LegacyProjectStatus

export interface Project {
  id: string
  status: ProjectStatus
  reference_app: string
  your_app_name: string | null
  brand_colors: Record<string, string> | null
  logo_s3_key: string | null
  bundle_id: string | null
  bundle_s3_key?: string | null
  frame_count: number | null
  frontend_spec?: string | null
  spec_md_text: string | null
  error_text: string | null
  repair_attempts?: number | null
  total_retries?: number | null
  processing_mode?: ProcessingMode
  created_at: string
  updated_at: string
}

export const STAGE_LABELS: Record<ProjectStatus, string> = {
  pending: 'Getting everything ready...',
  extracting: 'Gathering the moments that matter...',
  analyzing_screens: 'Reading the screens and their visual rhythm...',
  analyzing_transitions: 'Following how the experience moves...',
  synthesizing_schema: 'Connecting the ideas behind the scenes...',
  generating_backend: 'Shaping the structure underneath the product...',
  generating_frontend: 'Turning the experience into something tangible...',
  validating: 'Giving everything a careful once-over...',
  repairing: 'Smoothing out the rough edges...',
  bundling: 'Wrapping everything up...',
  analyzing_frontend: 'Reading the screens and the feel of the product...',
  analyzing_backend: 'Tracing how the experience is put together...',
  stitching: 'Writing your product spec...',
  complete: 'Your spec is ready.',
  failed: 'This run hit a snag.',
  awaiting_manual_processing: 'Queued for free-sample review',
}

export const STAGE_PROGRESS: Record<ProjectStatus, number> = {
  pending: 0,
  extracting: 8,
  analyzing_screens: 18,
  analyzing_transitions: 34,
  synthesizing_schema: 48,
  generating_backend: 58,
  generating_frontend: 72,
  validating: 86,
  repairing: 90,
  bundling: 95,
  analyzing_frontend: 40,
  analyzing_backend: 65,
  stitching: 85,
  complete: 100,
  failed: 0,
  awaiting_manual_processing: 0,
}

export const STAGE_CEILINGS: Record<ProjectStatus, number> = {
  pending: 10,
  extracting: 16,
  analyzing_screens: 36,
  analyzing_transitions: 50,
  synthesizing_schema: 62,
  generating_backend: 76,
  generating_frontend: 88,
  validating: 95,
  repairing: 97,
  bundling: 99,
  analyzing_frontend: 58,
  analyzing_backend: 80,
  stitching: 96,
  complete: 100,
  failed: 0,
  awaiting_manual_processing: 0,
}

export const STAGE_ETA_SECONDS: Partial<Record<ProjectStatus, number>> = {
  extracting: 40,
  analyzing_screens: 130,
  analyzing_transitions: 120,
  synthesizing_schema: 35,
  generating_backend: 55,
  generating_frontend: 180,
  validating: 90,
  repairing: 80,
  bundling: 25,
  analyzing_frontend: 180,
  analyzing_backend: 120,
  stitching: 100,
}

export const STAGE_SUBSTEPS: Partial<Record<ProjectStatus, string[]>> = {
  analyzing_frontend: [
    'Picking out the moments that define the app...',
    'Noticing repeated layouts, patterns, and states...',
    'Capturing the look, feel, and design language...',
  ],
  stitching: [
    'Bringing every screen into one clear story...',
    'Weaving the visual language into the spec...',
    'Shaping the final document you can share...',
  ],
  analyzing_screens: [
    'Finding the key moments across the recording...',
    'Spotting the pieces that repeat...',
    'Reading hierarchy, spacing, and visual tone...',
    'Following how each screen leads to the next...',
  ],
  analyzing_transitions: [
    'Comparing one moment to the next...',
    'Following taps, swipes, and transitions...',
    'Noticing what changes along the way...',
    'Connecting the full journey...',
  ],
  synthesizing_schema: [
    'Grouping recurring ideas across the app...',
    'Finding the shape of the information...',
    'Linking related details together...',
  ],
  generating_backend: [
    'Laying down the product foundations...',
    'Keeping the details consistent...',
    'Writing the structures that support the experience...',
  ],
  generating_frontend: [
    'Shaping the shared pieces of the experience...',
    'Bringing the visual language into the interface...',
    'Fitting the screens into one coherent flow...',
    'Polishing the details so it all feels intentional...',
  ],
  validating: [
    'Checking the work with fresh eyes...',
    'Looking for anything that feels off...',
    'Making sure everything hangs together cleanly...',
  ],
  repairing: [
    'Revisiting only the parts that need attention...',
    'Giving the pass another careful look...',
    'Keeping the rest of the work intact...',
  ],
  bundling: [
    'Gathering everything into one handoff...',
    'Adding the final guidance...',
    'Preparing the finished package...',
  ],
}

export const PIPELINE_STAGES: { key: ProjectStatus; label: string }[] = [
  { key: 'extracting', label: 'Moments' },
  { key: 'analyzing_screens', label: 'Screens' },
  { key: 'analyzing_transitions', label: 'Flow' },
  { key: 'synthesizing_schema', label: 'Connections' },
  { key: 'generating_backend', label: 'Foundations' },
  { key: 'generating_frontend', label: 'Experience' },
  { key: 'validating', label: 'Polish' },
  { key: 'bundling', label: 'Finish' },
  { key: 'complete', label: 'Ready' },
]
