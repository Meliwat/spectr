import { createSupabaseServerClient } from './supabase-ssr'
import { makeSupabaseServer } from './supabase-server'

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
