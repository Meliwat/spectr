import { createSupabaseServerClient } from './supabase-ssr'
import { makeSupabaseServer } from './supabase-server'
import { timingSafeEqualStr } from './access-token'

type Project = { id: string; user_id: string | null; access_token: string | null }

/**
 * Ownership guard for any project-scoped operation.
 *
 * Returns either:
 *   - { ok: true, userId, project } when the current session owns the project
 *   - { ok: false, status, error } when the caller is unauth'd or non-owner
 *
 * Service-role is used for the ownership lookup so legacy rows (pre-auth,
 * user_id = NULL) are visible for the check; but a NULL owner is rejected
 * for new access since there's no way to prove the caller owns them.
 */
export async function requireProjectOwner(projectId: string): Promise<
  | { ok: true; userId: string; project: { id: string; user_id: string | null } }
  | { ok: false; status: number; error: string }
> {
  const sessionClient = createSupabaseServerClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return { ok: false, status: 401, error: 'Not authenticated' }
  }

  const admin = makeSupabaseServer()
  const { data: project, error } = await admin
    .from('projects')
    .select('id, user_id')
    .eq('id', projectId)
    .single()

  if (error || !project) {
    return { ok: false, status: 404, error: 'Not found' }
  }

  if (project.user_id !== user.id) {
    // Includes null-owner legacy rows and rows belonging to other users.
    return { ok: false, status: 404, error: 'Not found' }
  }

  return { ok: true, userId: user.id, project }
}

/**
 * Relaxed access guard: allows either the signed-in owner OR a caller holding
 * a valid access token. Used on endpoints that the public progress page at
 * /p/[id]?t=[token] hits while the user is still anonymous (paid flow before
 * magic-link click, or free-demo flow that never creates a user).
 */
export async function requireProjectAccess(
  projectId: string,
  token: string | null | undefined,
): Promise<
  | { ok: true; mode: 'owner' | 'token'; userId: string | null; project: Project }
  | { ok: false; status: number; error: string }
> {
  const admin = makeSupabaseServer()
  const { data: project, error } = await admin
    .from('projects')
    .select('id, user_id, access_token')
    .eq('id', projectId)
    .single<Project>()

  if (error || !project) {
    return { ok: false, status: 404, error: 'Not found' }
  }

  // Token path — valid if the stored token is non-null and matches.
  if (token && project.access_token && timingSafeEqualStr(project.access_token, token)) {
    return { ok: true, mode: 'token', userId: project.user_id, project }
  }

  // Owner path.
  const sessionClient = createSupabaseServerClient()
  const { data: { user } } = await sessionClient.auth.getUser()
  if (user && project.user_id === user.id) {
    return { ok: true, mode: 'owner', userId: user.id, project }
  }

  return { ok: false, status: 404, error: 'Not found' }
}
