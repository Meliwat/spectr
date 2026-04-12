import Link from 'next/link'

export default function Landing() {
  return (
    <main className="page-frame">
      <section className="page-shell">
        <div className="panel-strong overflow-hidden px-6 py-8 sm:px-10 sm:py-10">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <span className="eyebrow">Dark-mode-native spec generator</span>
            <span className="metric-chip"><strong>Claude Vision</strong> for UI analysis</span>
            <span className="metric-chip"><strong>Web research</strong> for backend architecture</span>
          </div>

          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] lg:items-end">
            <div className="max-w-3xl">
              <h1
                className="mb-5 text-5xl sm:text-6xl lg:text-7xl"
                style={{
                  color: 'var(--text)',
                  fontWeight: 510,
                  letterSpacing: '-1.408px',
                  lineHeight: 1,
                }}
              >
                Reverse engineer
                <br />
                the product layer.
              </h1>
              <p
                className="max-w-2xl text-lg sm:text-xl"
                style={{ color: 'var(--text-2)', fontWeight: 400, letterSpacing: '-0.165px', lineHeight: 1.6 }}
              >
                Spectr turns a screen recording into a precise frontend breakdown, a researched backend plan,
                and a developer-ready spec that can go straight into Claude Code.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/app" className="btn-primary">
                  Start a new spec
                </Link>
                <Link href="/app/projects" className="btn">
                  View recent projects
                </Link>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                <div className="stat-card">
                  <p className="stat-card-label">Pipeline</p>
                  <p className="stat-card-value">4 stages</p>
                  <p className="stat-card-copy">Extraction, UI analysis, backend research, stitched output.</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Output</p>
                  <p className="stat-card-value">1 bundle</p>
                  <p className="stat-card-copy">`spec.md`, `.env.example`, and `setup.sh` in one download.</p>
                </div>
                <div className="stat-card">
                  <p className="stat-card-label">Look and feel</p>
                  <p className="stat-card-value">Linear-like</p>
                  <p className="stat-card-copy">Cool dark surfaces, tight typography, indigo accents.</p>
                </div>
              </div>
            </div>

            <div className="panel p-4 sm:p-5">
              <div
                className="rounded-2xl p-4"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="section-title">Pipeline preview</p>
                    <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                      What drops out of a single recording upload.
                    </p>
                  </div>
                  <span
                    className="mono text-xs"
                    style={{
                      color: 'var(--violet)',
                      padding: '6px 10px',
                      borderRadius: 9999,
                      border: '1px solid rgba(113,112,255,0.25)',
                      background: 'rgba(113,112,255,0.08)',
                    }}
                  >
                    spec.md
                  </span>
                </div>

                <div className="space-y-3">
                  {[
                    ['01', 'Analyze every visible screen state'],
                    ['02', 'Research the real stack behind the app'],
                    ['03', 'Unify UI, data, and implementation details'],
                    ['04', 'Hand off a polished build prompt'],
                  ].map(([step, label]) => (
                    <div
                      key={step}
                      className="flex items-center gap-4 rounded-xl px-4 py-3"
                      style={{
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
                  className="mt-5 rounded-xl px-4 py-4"
                  style={{
                    background: 'rgba(94,106,210,0.08)',
                    border: '1px solid rgba(113,112,255,0.18)',
                  }}
                >
                  <p className="section-title" style={{ color: 'var(--lavender)' }}>Result</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-2)', lineHeight: 1.6 }}>
                    A single artifact that reads like a product teardown and builds like an implementation brief.
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
