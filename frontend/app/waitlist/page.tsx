import { redirect } from 'next/navigation'

// Legacy path — the waitlist has been merged into the main landing at /.
export default function WaitlistRedirect() {
  redirect('/')
}
