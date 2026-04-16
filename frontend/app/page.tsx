import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Spectr — See an app. Ship an app.',
  description: 'Record any app. Get a UI blueprint inspired by it — ready for your agent to design.',
}

export default function HomePage() {
  return <HomeClient />
}
