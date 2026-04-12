import Link from 'next/link'
import type { CSSProperties } from 'react'

function reveal(delay: number): CSSProperties {
  return { ['--reveal-delay' as any]: `${delay}ms` } as CSSProperties
}

export default function Landing() {
  return (
    <main className="page-frame landing-frame">
      <section className="page-shell landing-shell">
        <div className="panel-strong overflow-hidden px-6 py-7 sm:px-9 sm:py-8">
          <div className="ghost-emerge mb-7 flex flex-wrap items-center gap-3" style={reveal(120)}>
            <span className="eyebrow">From recording to product brief</span>
            <span className="metric-chip"><strong>Screen-by-screen clarity</strong></span>
            <span className="metric-chip"><strong>Design language included</strong></span>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.85fr)] lg:items-end">
            <div className="max-w-3xl">
              <h1
                className="ghost-emerge mb-4 text-5xl sm:text-[3.6rem] lg:text-[5.4rem]"
                style={{
                  ...reveal(260),
                  color: 'var(--text)',
                  fontWeight: 510,
                  letterSpacing: '-1.408px',
                  lineHeight: 1,
                }}
              >
                See an app.
                <br />
                Ship an app.
              </h1>
              <p
                className="ghost-emerge max-w-2xl text-base sm:text-lg"
                style={{ ...reveal(420), color: 'var(--text-2)', fontWeight: 400, letterSpacing: '-0.165px', lineHeight: 1.6 }}
              >
                Spectr turns a mobile app recording into a beautifully structured brief with screens,
                flow, design language, and guidance your team can read, share, and build from.
              </p>

              <div className="ghost-emerge mt-7 flex flex-wrap gap-3" style={reveal(580)}>
                <Link href="/app" className="btn-primary">
                  Start a new brief
                </Link>
                <Link href="/app/projects" className="btn">
                  View recent briefs
                </Link>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="ghost-emerge stat-card" style={reveal(740)}>
                  <p className="stat-card-label">What it reveals</p>
                  <p className="stat-card-value">Key moments</p>
                  <p className="stat-card-copy">The screens, states, and small details people remember.</p>
                </div>
                <div className="ghost-emerge stat-card" style={reveal(920)}>
                  <p className="stat-card-label">What it preserves</p>
                  <p className="stat-card-value">Look & feel</p>
                  <p className="stat-card-copy">Color, type, spacing, tone, and the rhythm of the interface.</p>
                </div>
                <div className="ghost-emerge stat-card" style={reveal(1100)}>
                  <p className="stat-card-label">What you leave with</p>
                  <p className="stat-card-value">One clear brief</p>
                  <p className="stat-card-copy">A single document your team can align on without extra translation.</p>
                </div>
              </div>
            </div>

            <div className="ghost-emerge panel p-4 sm:p-5" style={reveal(520)}>
              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="ghost-emerge mb-5" style={reveal(700)}>
                  <div>
                    <p className="section-title">What unfolds</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                      From one recording to one shareable brief.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    ['01', 'We gather the moments that matter'],
                    ['02', 'We notice recurring patterns, components, and states'],
                    ['03', 'We capture the visual language, from color to spacing to tone'],
                    ['04', 'We shape it all into one brief your team can carry forward'],
                  ].map(([step, label], index) => (
                    <div
                      key={step}
                      className="ghost-emerge flex items-center gap-4 rounded-xl px-4 py-3"
                      style={{
                        ...reveal(900 + index * 180),
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <span className="mono text-xs" style={{ color: 'var(--subdued)', minWidth: 24 }}>
                        {step}
                      </span>
                      <p className="text-sm" style={{ color: 'var(--text-2)', fontWeight: 510 }}>
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className="ghost-emerge mt-5 rounded-xl px-4 py-4"
                  style={{
                    ...reveal(1640),
                    background: 'rgba(94,106,210,0.08)',
                    border: '1px solid rgba(113,112,255,0.18)',
                  }}
                >
                  <p className="section-title" style={{ color: 'var(--lavender)' }}>What you get</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                    A clear, thoughtful brief you can hand to design, product, or engineering without explaining it twice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
