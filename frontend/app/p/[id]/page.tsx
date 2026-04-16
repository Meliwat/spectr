import { notFound } from 'next/navigation'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { timingSafeEqualStr } from '@/lib/access-token'
import { PROJECT_BASE_SELECT } from '@/lib/project-columns'
import { Project } from '@/lib/types'
import ProjectClient from '@/app/app/projects/[id]/ProjectClient'

export const dynamic = 'force-dynamic'

/**
 * Public progress view — the destination URL we hand back from the
 * landing page's upload flow (`/p/[id]?t=[token]`).
 *
 * Access: either the caller is the signed-in project owner OR they hold
 * a valid access token in the `?t=` query param. Tokens are random 32-byte
 * strings stored in `projects.access_token` and verified by a direct DB
 * lookup (no HMAC secret).
 */
export default async function PublicProjectPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { t?: string }
}) {
  const token = (searchParams.t ?? '').trim() || null

  const admin = makeSupabaseServer()
  const { data } = await admin
    .from('projects')
    .select(PROJECT_BASE_SELECT + ', user_id, access_token')
    .eq('id', params.id)
    .single()

  const row = data as unknown as (Project & { user_id: string | null; access_token: string | null }) | null
  if (!row) notFound()

  // Token path
  let accessOk = false
  let passToken: string | undefined
  if (token && row.access_token && timingSafeEqualStr(row.access_token, token)) {
    accessOk = true
    passToken = token
  }

  // Owner path (fallback)
  if (!accessOk) {
    const session = createSupabaseServerClient()
    const { data: { user } } = await session.auth.getUser()
    if (user && row.user_id === user.id) {
      accessOk = true
    }
  }

  if (!accessOk) notFound()

  // Strip the derived-only columns before handing to the client.
  const { access_token: _discard, ...publicProject } = row
  void _discard

  return <ProjectClient id={params.id} initialProject={publicProject as Project} accessToken={passToken} />
}
