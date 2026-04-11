import Link from 'next/link'

export default function Landing() {
  return (
    <main className="flex flex-col items-center justify-center px-6 py-36 text-center">
      <div className="max-w-3xl mx-auto">
        <h1
          className="text-6xl mb-6"
          style={{
            color: 'var(--text)',
            fontWeight: 510,
            letterSpacing: '-1.056px',
            lineHeight: 1.0,
          }}
        >
          See an app.<br />Ship an app.
        </h1>
        <p
          className="text-xl mb-4"
          style={{ color: 'var(--text-2)', fontWeight: 400, letterSpacing: '-0.165px', lineHeight: 1.6 }}
        >
          Upload a screen recording. Get a full-stack Claude Code spec in 60 seconds.
        </p>
        <p className="text-sm mb-14" style={{ color: 'var(--subdued)', letterSpacing: '-0.165px' }}>
          Frontend spec from Claude Vision · Backend spec from live web research · One file, ready for Claude Code
        </p>
        <Link href="/app" className="btn-primary text-base px-6 py-3">
          Upload your recording →
        </Link>
      </div>
    </main>
  )
}
