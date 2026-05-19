/**
 * One-off, idempotent sync: awesome-ios-design-md repo -> private Supabase
 * `specs` bucket. Run this BEFORE making the gallery repo private, then
 * re-run any time specs are regenerated/added (it upserts).
 *
 * Usage (Node 20+, run from the spectr repo root):
 *   node --env-file=frontend/.env.local frontend/scripts/sync-specs.mjs [repoPath]
 *
 *   repoPath  Optional path to a local clone of awesome-ios-design-md.
 *             If omitted, a shallow clone is made into a temp dir (works
 *             only while the repo is still public / your git is authed).
 *
 * Flags:
 *   --dry-run  List exactly what would be uploaded and exit. No Supabase
 *              connection, no credentials needed. Use to preview/verify.
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment
 * (unless --dry-run). Uploads only DESIGN*.md; skips README.md / preview.md.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'specs'
const GALLERY_REPO = 'https://github.com/Meliwat/awesome-ios-design-md'
const SPEC_FILE_RE = /^DESIGN.*\.md$/i

const DRY_RUN = process.argv.includes('--dry-run')
const SUPABASE_URL = (process.env.SUPABASE_URL ?? '').trim()
const SUPABASE_SERVICE_KEY = (process.env.SUPABASE_SERVICE_KEY ?? '').trim()

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_SERVICE_KEY.\n' +
      'Run with: node --env-file=frontend/.env.local frontend/scripts/sync-specs.mjs',
  )
  process.exit(1)
}

function resolveRepo() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'))
  if (arg) {
    const p = path.resolve(arg)
    if (!fs.existsSync(path.join(p, 'design-md'))) {
      console.error(`No design-md/ under ${p} — is that the gallery repo?`)
      process.exit(1)
    }
    console.log(`Using local clone: ${p}`)
    return p
  }
  const tmp = path.join(os.tmpdir(), `awesome-ios-design-md-${Date.now()}`)
  console.log(`Cloning ${GALLERY_REPO} -> ${tmp} ...`)
  execSync(`git clone --depth 1 ${GALLERY_REPO} ${tmp}`, { stdio: 'inherit' })
  return tmp
}

async function ensureBucket(supabase) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: false })
  if (error && !/exists/i.test(error.message)) {
    console.error(`Could not create bucket "${BUCKET}":`, error.message)
    process.exit(1)
  }
  console.log(`Bucket "${BUCKET}" ready (private).`)
}

async function main() {
  if (DRY_RUN) console.log('— DRY RUN: no Supabase connection, nothing uploaded —\n')
  const repo = resolveRepo()
  const designRoot = path.join(repo, 'design-md')
  const supabase = DRY_RUN ? null : createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (!DRY_RUN) await ensureBucket(supabase)

  const slugs = fs
    .readdirSync(designRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()

  let uploaded = 0
  let failed = 0
  const appsWithNoSpec = []

  for (const slug of slugs) {
    const dir = path.join(designRoot, slug)
    const specFiles = fs.readdirSync(dir).filter((f) => SPEC_FILE_RE.test(f))
    if (specFiles.length === 0) {
      appsWithNoSpec.push(slug)
      continue
    }
    for (const file of specFiles) {
      const dest = `${slug}/${file}`
      if (DRY_RUN) {
        uploaded++
        continue
      }
      const buf = fs.readFileSync(path.join(dir, file))
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(dest, buf, {
          upsert: true,
          contentType: 'text/markdown; charset=utf-8',
        })
      if (error) {
        failed++
        console.error(`  ✗ ${dest}: ${error.message}`)
      } else {
        uploaded++
      }
    }
    console.log(`  ✓ ${slug} (${specFiles.length} file${specFiles.length === 1 ? '' : 's'})`)
  }

  console.log(
    `\nDone. ${uploaded} ${DRY_RUN ? 'would upload' : 'uploaded'}, ` +
      `${failed} failed, ${slugs.length} app folders scanned.`,
  )
  if (appsWithNoSpec.length) {
    console.warn(
      `\n${appsWithNoSpec.length} folder(s) had no DESIGN*.md (skipped): ` +
        appsWithNoSpec.join(', '),
    )
  }
  if (failed > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
