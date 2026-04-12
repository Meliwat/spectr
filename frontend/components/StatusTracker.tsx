'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PIPELINE_STAGES,
  Project,
  STAGE_CEILINGS,
  STAGE_ETA_SECONDS,
  STAGE_LABELS,
  STAGE_PROGRESS,
  STAGE_SUBSTEPS,
} from '@/lib/types'

type TrackerStage = {
  key: string
  label: string
  start: number
  end: number
  stageLabel: string
}

const LEGACY_PIPELINE_STAGES: TrackerStage[] = [
  { key: 'downloading', label: 'Download', start: 0, end: 10, stageLabel: 'Downloading your recording...' },
  { key: 'extracting_frames', label: 'Frames', start: 10, end: 20, stageLabel: 'Breaking the recording into frames...' },
  { key: 'selecting_moments', label: 'Selection', start: 20, end: 28, stageLabel: 'Keeping the clearest distinct moments...' },
  { key: 'analyzing_screens', label: 'Screens', start: 28, end: 48, stageLabel: 'Reading screen layouts and repeated patterns...' },
  { key: 'analyzing_design', label: 'Style', start: 48, end: 64, stageLabel: 'Capturing color, type, spacing, and components...' },
  { key: 'preparing_brief', label: 'Prep', start: 64, end: 70, stageLabel: 'Organizing the spec before writing...' },
  { key: 'writing_brief', label: 'Writing', start: 70, end: 97, stageLabel: 'Writing the spec section by section...' },
  { key: 'saving', label: 'Saving', start: 97, end: 100, stageLabel: 'Saving your spec...' },
] as const

const SECTION_TITLES: Record<string, string> = {
  '01-app-overview.md': 'app overview',
  '02-navigation-structure.md': 'navigation structure',
  '03-screen-specifications.md': 'screen specifications',
  '04-shared-components.md': 'shared components',
  '05-design-system.md': 'design system',
  '06-frontend-implementation-notes.md': 'implementation notes',
  '07-claude-code-prompt.md': 'Claude Code prompt',
}

type TrackerMetrics = {
  progress?: number
  etaSeconds?: number
  substep?: string | null
  stageKey?: string | null
  stageLabel?: string | null
}

function formatEta(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function extractProgress(line: string, pattern: RegExp) {
  const match = line.match(pattern)
  if (!match) return null
  const current = Number(match[1])
  const total = Number(match[2])
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null
  return { current, total }
}

function extractSectionStart(line: string) {
  const match = line.match(/writing section (\d+)\/(\d+): ([^\s]+)/)
  if (!match) return null
  const current = Number(match[1])
  const total = Number(match[2])
  const filename = match[3]
  if (!Number.isFinite(current) || !Number.isFinite(total) || total <= 0) return null
  return { current, total, filename }
}

function sectionTitle(filename: string | null | undefined) {
  if (!filename) return 'next section'
  return SECTION_TITLES[filename] ?? filename.replace(/^\d+-/, '').replace(/\.md$/, '').replace(/-/g, ' ')
}

function estimateRemainingSeconds(
  avgSecondsPerUnit: number,
  current: number,
  total: number,
  elapsedSeconds: number | null,
) {
  if (current <= 0 || total <= 0) return Math.max(0, Math.round(avgSecondsPerUnit * total))
  const inferredPerUnit = elapsedSeconds && elapsedSeconds > 0 ? elapsedSeconds / current : avgSecondsPerUnit
  return Math.max(0, Math.round((total - current) * inferredPerUnit))
}

function parseClock(line: string) {
  const match = line.match(/^(\d{2}):(\d{2}):(\d{2})/)
  if (!match) return null
  return Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3])
}

function getLegacyStage(key: string) {
  return LEGACY_PIPELINE_STAGES.find(stage => stage.key === key) ?? LEGACY_PIPELINE_STAGES[0]
}

function getLegacyStageForProgress(progress: number) {
  return (
    LEGACY_PIPELINE_STAGES.find(stage => progress < stage.end) ??
    LEGACY_PIPELINE_STAGES[LEGACY_PIPELINE_STAGES.length - 1]
  )
}

function scaleStageProgress(stageKey: string, ratio: number) {
  const stage = getLegacyStage(stageKey)
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  return stage.start + (stage.end - stage.start) * clampedRatio
}

function scaleRange(start: number, end: number, ratio: number) {
  const clampedRatio = Math.max(0, Math.min(1, ratio))
  return start + (end - start) * clampedRatio
}

function buildBatchProgress(
  lines: string[],
  {
    startedPattern,
    donePattern,
    avgSecondsPerUnit,
  }: {
    startedPattern: RegExp
    donePattern: RegExp
    avgSecondsPerUnit: number
  },
) {
  const doneMatches = lines
    .map(line => extractProgress(line, donePattern))
    .filter((value): value is NonNullable<typeof value> => Boolean(value))
  const startedMatches = lines
    .map(line => extractProgress(line, startedPattern))
    .filter((value): value is NonNullable<typeof value> => Boolean(value))

  if (doneMatches.length === 0 && startedMatches.length === 0) {
    return null
  }

  const total = doneMatches.at(-1)?.total ?? startedMatches.at(-1)?.total ?? 1
  const doneSet = new Set(doneMatches.map(match => match.current))
  const inflightMatch = [...startedMatches].reverse().find(match => !doneSet.has(match.current))
  const inflightLine = inflightMatch
    ? [...lines].reverse().find(line => {
        const extracted = extractProgress(line, startedPattern)
        return extracted?.current === inflightMatch.current && extracted.total === inflightMatch.total
      })
    : null
  const startedAt = inflightLine ? parseClock(inflightLine) : null
  const nowAt = parseClock(lines.at(-1) ?? '')
  const elapsed = startedAt != null && nowAt != null ? Math.max(0, nowAt - startedAt) : null
  const inflightFraction = inflightMatch ? Math.min(0.9, elapsed ? elapsed / avgSecondsPerUnit : 0.25) : 0
  const completedUnits = Math.min(total, doneSet.size + inflightFraction)

  return {
    total,
    completedUnits,
    etaSeconds: estimateRemainingSeconds(avgSecondsPerUnit, Math.max(0.1, completedUnits), total, elapsed),
  }
}

function buildLiveMetrics(
  status: Project['status'],
  currentProgress: number,
  currentCeiling: number,
  debugLines: string[],
): TrackerMetrics {
  const lines = debugLines ?? []
  const latestLine = lines.at(-1) ?? ''

  if (status === 'analyzing_screens') {
    const lastStructuredDone = [...lines]
      .reverse()
      .map(line => extractProgress(line, /structured screen batch (\d+)\/(\d+) done/))
      .find(Boolean)
    if (lastStructuredDone) {
      const progress = currentProgress + ((currentCeiling - currentProgress) * lastStructuredDone.current) / lastStructuredDone.total
      return {
        progress,
        etaSeconds: estimateRemainingSeconds(42, lastStructuredDone.current, lastStructuredDone.total, null),
        substep: `Refining the screen story ${lastStructuredDone.current} of ${lastStructuredDone.total}`,
      }
    }

    const lastDesignDone = [...lines]
      .reverse()
      .map(line => extractProgress(line, /design token extraction batch (\d+)\/(\d+) done/))
      .find(Boolean)
    if (lastDesignDone) {
      const stageSpan = currentCeiling - currentProgress
      const designBase = currentProgress + stageSpan * 0.42
      const progress = designBase + (stageSpan * 0.33 * lastDesignDone.current) / lastDesignDone.total
      return {
        progress,
        etaSeconds: estimateRemainingSeconds(48, lastDesignDone.current, lastDesignDone.total, null) + 180,
        substep: `Capturing the look and feel ${lastDesignDone.current} of ${lastDesignDone.total}`,
      }
    }

    const lastScreenDone = [...lines]
      .reverse()
      .map(line => extractProgress(line, /screen analysis batch (\d+)\/(\d+) done/))
      .find(Boolean)
    if (lastScreenDone) {
      const stageSpan = currentCeiling - currentProgress
      const progress = currentProgress + (stageSpan * 0.42 * lastScreenDone.current) / lastScreenDone.total
      return {
        progress,
        etaSeconds: estimateRemainingSeconds(35, lastScreenDone.current, lastScreenDone.total, null) + 300,
        substep: `Reading the key moments ${lastScreenDone.current} of ${lastScreenDone.total}`,
      }
    }
  }

  if (status === 'analyzing_transitions') {
    const lastTransitionDone = [...lines]
      .reverse()
      .map(line => extractProgress(line, /transition (\d+)\/(\d+) done/))
      .find(Boolean)
    const startLine = lines.find(line => line.includes('[3/8] Analyzing transitions'))
    if (lastTransitionDone) {
      const startedAt = startLine ? parseClock(startLine) : null
      const nowAt = latestLine ? parseClock(latestLine) : null
      const elapsed = startedAt != null && nowAt != null ? Math.max(0, nowAt - startedAt) : null
      return {
        progress: currentProgress + ((currentCeiling - currentProgress) * lastTransitionDone.current) / lastTransitionDone.total,
        etaSeconds: estimateRemainingSeconds(5.2, lastTransitionDone.current, lastTransitionDone.total, elapsed),
        substep: `Following the flow ${lastTransitionDone.current} of ${lastTransitionDone.total}`,
      }
    }
  }

  if (status === 'generating_frontend') {
    if (latestLine.includes('repair attempt')) {
      return {
        progress: Math.min(currentCeiling, currentProgress + (currentCeiling - currentProgress) * 0.94),
        etaSeconds: STAGE_ETA_SECONDS.repairing ?? 0,
        substep: 'Giving the details one more careful pass',
      }
    }

    return {
      progress: currentProgress,
      etaSeconds: STAGE_ETA_SECONDS.generating_frontend ?? 0,
      substep: 'Shaping the experience into its final form',
    }
  }

  if (status === 'repairing') {
    const repairLine = [...lines].reverse().find(line => line.includes('repair attempt'))
    const match = repairLine?.match(/repair attempt (\d+)\/(\d+)/)
    if (match) {
      const current = Number(match[1])
      const total = Number(match[2])
      return {
        progress: currentProgress + ((currentCeiling - currentProgress) * current) / total,
        etaSeconds: estimateRemainingSeconds(240, current - 1, total, null),
        substep: `Polishing pass ${current} of ${total}`,
      }
    }
  }

  if (status === 'validating') {
    if (latestLine.includes('repair attempt')) {
      return {
        progress: currentProgress + (currentCeiling - currentProgress) * 0.35,
        etaSeconds: STAGE_ETA_SECONDS.repairing ?? 0,
        substep: 'Giving everything another careful look',
      }
    }
  }

  return {}
}

function buildLegacyLiveMetrics(
  status: Project['status'],
  debugLines: string[],
): TrackerMetrics {
  const lines = debugLines ?? []
  const latestLine = lines.at(-1) ?? ''

  if (status === 'pending') {
    return {
      progress: 2,
      etaSeconds: STAGE_ETA_SECONDS.extracting ?? 0,
      substep: 'Getting everything ready to begin',
      stageKey: 'downloading',
      stageLabel: getLegacyStage('downloading').stageLabel,
    }
  }

  if (status === 'extracting') {
    const extractionDone = lines.find(line => line.includes('unique frames'))
    const downloadStarted = lines.some(line => line.includes('Downloading MP4 from Supabase Storage'))
    if (extractionDone) {
      const match = extractionDone.match(/(\d+) total → (\d+) unique frames/)
      const kept = match ? Number(match[2]) : null
      return {
        progress: getLegacyStage('selecting_moments').end,
        etaSeconds: 0,
        substep: kept ? `${kept} distinct moments are ready to study` : 'Distinct moments are ready to study',
        stageKey: 'selecting_moments',
        stageLabel: getLegacyStage('selecting_moments').stageLabel,
      }
    }

    return {
      progress: downloadStarted ? 16 : 6,
      etaSeconds: STAGE_ETA_SECONDS.extracting ?? 0,
      substep: downloadStarted ? 'Separating the recording into frames' : 'Downloading the source recording',
      stageKey: downloadStarted ? 'extracting_frames' : 'downloading',
      stageLabel: getLegacyStage(downloadStarted ? 'extracting_frames' : 'downloading').stageLabel,
    }
  }

  if (status === 'analyzing_frontend') {
    const screenPass = buildBatchProgress(lines, {
      startedPattern: /screen analysis batch (\d+)\/(\d+) started/,
      donePattern: /screen analysis batch (\d+)\/(\d+) done/,
      avgSecondsPerUnit: 40,
    })
    const designPass = buildBatchProgress(lines, {
      startedPattern: /design token extraction batch (\d+)\/(\d+) started/,
      donePattern: /design token extraction batch (\d+)\/(\d+) done/,
      avgSecondsPerUnit: 55,
    })

    if (screenPass || designPass) {
      const screenRatio = screenPass ? screenPass.completedUnits / screenPass.total : 0
      const designRatio = designPass ? designPass.completedUnits / designPass.total : 0
      const progress =
        getLegacyStage('analyzing_screens').start +
        (getLegacyStage('analyzing_screens').end - getLegacyStage('analyzing_screens').start) * screenRatio +
        (getLegacyStage('analyzing_design').end - getLegacyStage('analyzing_design').start) * designRatio
      const latestScreenLine = [...lines].reverse().find(line => line.includes('screen analysis batch'))
      const latestDesignLine = [...lines].reverse().find(line => line.includes('design token extraction batch'))
      const latestRelevantLine = (() => {
        const screenTime = latestScreenLine ? parseClock(latestScreenLine) : null
        const designTime = latestDesignLine ? parseClock(latestDesignLine) : null
        if (screenTime == null) return latestDesignLine
        if (designTime == null) return latestScreenLine
        return designTime >= screenTime ? latestDesignLine : latestScreenLine
      })()

      if (latestRelevantLine?.includes('design token extraction batch')) {
        const match = extractProgress(latestRelevantLine, /design token extraction batch (\d+)\/(\d+) (?:started|done)/)
        return {
          progress,
          etaSeconds: Math.max(screenPass?.etaSeconds ?? 0, designPass?.etaSeconds ?? 0),
          substep: match
            ? `Capturing the visual language in batch ${match.current} of ${match.total}`
            : 'Capturing color, typography, spacing, and component details',
          stageKey: 'analyzing_design',
          stageLabel: getLegacyStage('analyzing_design').stageLabel,
        }
      }

      if (latestRelevantLine?.includes('screen analysis batch')) {
        const match = extractProgress(latestRelevantLine, /screen analysis batch (\d+)\/(\d+) (?:started|done)/)
        return {
          progress,
          etaSeconds: Math.max(screenPass?.etaSeconds ?? 0, designPass?.etaSeconds ?? 0),
          substep: match
            ? `Reading screen batch ${match.current} of ${match.total}`
            : 'Reading layouts, repeated patterns, and screen hierarchy',
          stageKey: 'analyzing_screens',
          stageLabel: getLegacyStage('analyzing_screens').stageLabel,
        }
      }
    }

    if (latestLine.includes('running screen analysis and design-token extraction')) {
      return {
        progress: getLegacyStage('analyzing_screens').start + 2,
        etaSeconds: STAGE_ETA_SECONDS.analyzing_frontend ?? 0,
        substep: 'Starting the screen and visual-language passes',
        stageKey: 'analyzing_screens',
        stageLabel: getLegacyStage('analyzing_screens').stageLabel,
      }
    }

    return {
      progress: getLegacyStage('analyzing_screens').start,
      etaSeconds: STAGE_ETA_SECONDS.analyzing_frontend ?? 0,
      substep: 'Preparing the UI analysis',
      stageKey: 'analyzing_screens',
      stageLabel: getLegacyStage('analyzing_screens').stageLabel,
    }
  }

  if (status === 'stitching') {
    const doneMatches = lines
      .map(line => extractProgress(line, /section (\d+)\/(\d+) done/))
      .filter((value): value is NonNullable<typeof value> => Boolean(value))
    const startedMatches = lines
      .map(extractSectionStart)
      .filter((value): value is NonNullable<typeof value> => Boolean(value))

    if (latestLine.includes('running spec sections in')) {
      return {
        progress: getLegacyStage('preparing_brief').end,
        etaSeconds: STAGE_ETA_SECONDS.stitching ?? 0,
        substep: 'Setting up the spec structure for section-by-section writing',
        stageKey: 'preparing_brief',
        stageLabel: getLegacyStage('preparing_brief').stageLabel,
      }
    }

    if (doneMatches.length > 0 || startedMatches.length > 0) {
      const total = doneMatches.at(-1)?.total ?? startedMatches.at(-1)?.total ?? 1
      const doneSet = new Set(doneMatches.map(match => match.current))
      const startedSet = new Set(startedMatches.map(match => match.current))
      const inFlightCount = Math.max(0, startedSet.size - doneSet.size)
      const completedUnits = Math.min(total, doneSet.size + Math.min(0.35, inFlightCount * 0.35))
      const latestStarted = startedMatches.at(-1)
      const latestStartedIndex = latestStarted?.current ?? doneMatches.at(-1)?.current ?? 0
      const startedAt = parseClock(lines.find(line => line.includes('[3/3] Writing spec.md')) ?? '')
      const nowAt = parseClock(lines.at(-1) ?? '')
      const elapsed = startedAt != null && nowAt != null ? Math.max(0, nowAt - startedAt) : null
      const latestSectionName = sectionTitle(latestStarted?.filename)

      if (doneSet.size >= total) {
        return {
          progress: 98.5,
          etaSeconds: 4,
          substep: 'Saving the spec to storage',
          stageKey: 'saving',
          stageLabel: getLegacyStage('saving').stageLabel,
        }
      }

      return {
        progress: scaleRange(getLegacyStage('writing_brief').start, getLegacyStage('writing_brief').end, completedUnits / total),
        etaSeconds: estimateRemainingSeconds(26, Math.max(0.1, completedUnits), total, elapsed),
        substep: latestStarted
          ? `Writing the ${latestSectionName}`
          : `Writing section ${Math.min(latestStartedIndex, total)} of ${total}`,
        stageKey: 'writing_brief',
        stageLabel: getLegacyStage('writing_brief').stageLabel,
      }
    }

    return {
      progress: getLegacyStage('preparing_brief').start + 2,
      etaSeconds: STAGE_ETA_SECONDS.stitching ?? 0,
      substep: 'Preparing the spec for writing',
      stageKey: 'preparing_brief',
      stageLabel: getLegacyStage('preparing_brief').stageLabel,
    }
  }

  return {}
}

export default function StatusTracker({
  project,
  debugLines = [],
}: {
  project: Project
  debugLines?: string[]
}) {
  const failed = project.status === 'failed'
  const complete = project.status === 'complete'
  const debugSuggestsSpecFlow = debugLines.some(line => line.includes('[spec] Starting project'))
  const pendingSpecRun =
    (project.status === 'pending' || project.status === 'extracting') &&
    project.bundle_id == null &&
    !project.bundle_s3_key
  const isLegacySpecFlow =
    debugSuggestsSpecFlow ||
    pendingSpecRun ||
    project.status === 'analyzing_frontend' ||
    project.status === 'analyzing_backend' ||
    project.status === 'stitching' ||
    (project.status === 'complete' && !!project.spec_md_text && !project.bundle_s3_key)
  const currentProgress = STAGE_PROGRESS[project.status] ?? 0
  const currentCeiling = STAGE_CEILINGS[project.status] ?? currentProgress
  const substeps = STAGE_SUBSTEPS[project.status] ?? []
  const liveMetrics = useMemo(
    () =>
      isLegacySpecFlow
        ? buildLegacyLiveMetrics(project.status, debugLines)
        : buildLiveMetrics(project.status, currentProgress, currentCeiling, debugLines),
    [currentCeiling, currentProgress, debugLines, isLegacySpecFlow, project.status],
  )

  const [displayProgress, setDisplayProgress] = useState(liveMetrics.progress ?? currentProgress)
  const [substepIdx, setSubstepIdx] = useState(0)
  const [etaSeconds, setEtaSeconds] = useState(() => {
    return liveMetrics.etaSeconds ?? STAGE_ETA_SECONDS[project.status] ?? 0
  })

  const currentSubstep = liveMetrics.substep ?? (substeps.length > 0 ? substeps[substepIdx % substeps.length] : null)
  const pipelineStages: Array<{ key: string; label: string }> = isLegacySpecFlow ? LEGACY_PIPELINE_STAGES : PIPELINE_STAGES
  const currentStageKey = isLegacySpecFlow
    ? (complete
      ? 'saving'
      : liveMetrics.stageKey ?? getLegacyStageForProgress(displayProgress).key)
    : project.status
  const currentIdx = pipelineStages.findIndex(s => s.key === currentStageKey)
  const stageLabel = isLegacySpecFlow
    ? (complete
      ? STAGE_LABELS.complete
      : liveMetrics.stageLabel ?? getLegacyStageForProgress(displayProgress).stageLabel)
    : STAGE_LABELS[project.status]

  const trailingEta = useMemo(() => {
    const currentStageEta = STAGE_ETA_SECONDS[project.status] ?? 0
    const progressSpan = Math.max(1, currentCeiling - currentProgress)
    const completedInStage = Math.max(0, displayProgress - currentProgress)
    const stageFraction = Math.min(1, completedInStage / progressSpan)
    const remainingCurrent = Math.max(0, Math.round(currentStageEta * (1 - stageFraction)))

    const remainingFuture = isLegacySpecFlow
      ? 0
      : pipelineStages
          .slice(Math.max(currentIdx + 1, 0))
          .reduce((sum, stage) => sum + (STAGE_ETA_SECONDS[stage.key as Project['status']] ?? 0), 0)

    return remainingCurrent + remainingFuture
  }, [currentCeiling, currentIdx, currentProgress, displayProgress, isLegacySpecFlow, pipelineStages, project.status])

  useEffect(() => {
    const nextProgress = liveMetrics.progress ?? STAGE_PROGRESS[project.status] ?? 0
    setDisplayProgress(nextProgress)
    setSubstepIdx(0)
    setEtaSeconds(liveMetrics.etaSeconds ?? STAGE_ETA_SECONDS[project.status] ?? 0)

    if (complete || failed) {
      return
    }

    let ticks = 0
    const interval = window.setInterval(() => {
      ticks += 1
      setDisplayProgress(value => {
        const liveProgress = liveMetrics.progress
        if (typeof liveProgress === 'number') {
          const target = Math.min(currentCeiling, liveProgress)
          if (value >= target) {
            return target
          }
          return Math.min(target, value + Math.max(0.15, (target - value) * 0.45))
        }

        const ceiling = STAGE_CEILINGS[project.status] ?? value
        if (value >= ceiling) {
          return ceiling
        }
        const delta = 0.15 + Math.random() * 0.3
        return Math.min(ceiling, value + delta)
      })
      setEtaSeconds(value => {
        if (typeof liveMetrics.etaSeconds === 'number') {
          return liveMetrics.etaSeconds
        }
        return Math.max(0, value - 1)
      })
      if (!liveMetrics.substep && substeps.length > 0 && ticks % 4 === 0) {
        setSubstepIdx(value => (value + 1) % substeps.length)
      }
    }, 1200)

    return () => window.clearInterval(interval)
  }, [complete, currentCeiling, failed, liveMetrics.etaSeconds, liveMetrics.progress, liveMetrics.substep, project.status, substeps.length])

  return (
    <div className="panel space-y-5 p-5" style={{ borderRadius: 16 }}>
      <div className="flex items-center justify-between gap-3">
        <p className="section-title">Taking shape</p>
        <div className="flex items-center gap-2">
          {!failed && !complete && (
            <span
              className="mono text-[11px]"
              style={{
                color: 'var(--subdued)',
                padding: '6px 10px',
                borderRadius: 9999,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              About {formatEta(Math.max(0, etaSeconds || trailingEta))}
            </span>
          )}
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
            {Math.round(displayProgress)}%
          </span>
        </div>
      </div>

      <div
        className="relative w-full overflow-hidden rounded-full"
        style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="transition-all duration-1000"
          style={{
            width: `${displayProgress}%`,
            height: 6,
            background: failed ? 'var(--error)' : 'linear-gradient(90deg, var(--indigo), var(--violet))',
          }}
        />
        {!failed && !complete && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `max(0px, calc(${Math.min(displayProgress, 99.2)}% - 12px))`,
              width: 12,
              height: 6,
              borderRadius: 9999,
              background: 'var(--violet)',
              boxShadow: '0 0 8px rgba(113,112,255,0.7)',
            }}
          />
        )}
      </div>

      <div className="space-y-1">
        <p className="text-sm" style={{ color: failed ? 'var(--error)' : 'var(--muted)', letterSpacing: '-0.165px', lineHeight: 1.6 }}>
          {failed ? STAGE_LABELS[project.status] : stageLabel}
        </p>
        {currentSubstep && !failed && !complete && (
          <p
            key={`${project.status}-${substepIdx}`}
            className="mono"
            style={{
              color: 'var(--subdued)',
              fontSize: 12,
              animation: 'ghost-fade-in 0.25s ease',
            }}
          >
            {currentSubstep}
          </p>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {pipelineStages.map((stage, idx) => {
          const done = idx < currentIdx || complete
          const active = idx === currentIdx && !failed && !complete
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
              {done ? '✓ ' : active ? '◉ ' : '○ '}
              {stage.label}
            </div>
          )
        })}
      </div>

      {project.frame_count && (
        <p className="mono text-xs" style={{ color: 'var(--subdued)' }}>
          {project.frame_count} distinct moments captured
        </p>
      )}
    </div>
  )
}
