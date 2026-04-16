import { redirect } from 'next/navigation'

// Uploading moved to the public landing at /. Signed-in users who hit /app
// land on their project dashboard.
export default function AppRedirect() {
  redirect('/app/projects')
}
