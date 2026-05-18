import { permanentRedirect } from 'next/navigation'

// The install page now lives at the site root (/). Preserve old /installation
// URLs (in the sitemap, shared links, crawler index) with a 308.
export default function InstallationRedirect(): never {
  permanentRedirect('/')
}
