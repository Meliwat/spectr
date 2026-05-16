'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS: { href: string; label: string }[] = [
  { href: '/', label: 'Home' },
  { href: '/installation', label: 'Installation' },
  { href: '/gallery', label: 'Gallery' },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function SiteNav() {
  const pathname = usePathname() || '/'

  return (
    <nav className="site-nav">
      <div className="page-shell site-nav-inner">
        <Link href="/" className="brand-lockup" aria-label="Spectr home">
          <Image
            src="/brand/spectr-symbol.png"
            alt=""
            aria-hidden="true"
            width={720}
            height={893}
            priority
            className="brand-symbol"
          />
          <span className="brand-neon-text" aria-hidden="true">Spectr</span>
        </Link>

        <div className="site-nav-links">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`nav-text-link${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            )
          })}

          <span className="nav-icon-sep" aria-hidden="true" />
          <a
            href="https://github.com/Meliwat/spectr"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-icon-link"
            aria-label="GitHub"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </a>
          <span className="nav-icon-sep" aria-hidden="true" />
          <a
            href="#"
            className="nav-icon-link"
            aria-label="X / Twitter"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  )
}
