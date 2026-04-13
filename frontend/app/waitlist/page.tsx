import type { Metadata } from 'next'
import WaitlistClient from './WaitlistClient'

export const metadata: Metadata = {
  title: 'Spectr — Get early access',
  description: 'Record any app. Get a UI blueprint inspired by it — ready for your agent to design.',
}

export default function WaitlistPage() {
  return <WaitlistClient />
}
