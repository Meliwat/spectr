import { notFound, redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase-ssr'
import { makeSupabaseServer } from '@/lib/supabase-server'
import { PROJECT_BASE_SELECT } from '@/lib/project-columns'
import { Project } from '@/lib/types'
import ProjectClient from './ProjectClient'

export const dynamic = 'force-dynamic'

export default async function ProjectPage({ params }: { params: { id: string } }) {
  const session = createSupabaseServerClient()
  const {
    data: { user },
  } = await session.auth.getUser()

  if (!user) {
    redirect(`/login?next=/app/projects/${params.id}`)
  }

  // Service-role lookup to enforce ownership (legacy null-owner rows are
  // rejected). Once verified, we pass the initial project to the client for
  // realtime hydration.
  const admin = makeSupabaseServer()
  const { data: project } = await admin
    .from('projects')
    .select(PROJECT_BASE_SELECT + ', user_id')
    .eq('id', params.id)
    .single()

  const row = project as unknown as (Project & { user_id: string | null }) | null
  if (!row || row.user_id !== user.id) {
    notFound()
  }

  return <ProjectClient id={params.id} initialProject={row} />
}
