'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginClient({
  next,
  sent,
  error,
}: {
  next?: string
  sent: boolean
  error?: string
}) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(sent ? 'sent' : 'idle')
  const [errMsg, setErrMsg] = useState<string>(error || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('sending')
    setErrMsg('')

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const params = new URLSearchParams()
    if (next) params.set('next', next)
    const redirectTo = `${origin}/auth/callback${params.toString() ? `?${params}` : ''}`

    const { error: signInErr } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: redirectTo },
    })

    if (signInErr) {
      setStatus('error')
      setErrMsg(signInErr.message || 'Could not send magic link')
      return
    }
    setStatus('sent')
  }

  return (
    <main className="page-frame">
      <section className="page-shell" style={{ maxWidth: 480 }}>
        <span className="eyebrow">Sign in</span>
        <h1
          className="mt-5 text-4xl"
          style={{ color: 'var(--text)', fontWeight: 510, letterSpacing: '-0.704px', lineHeight: 1.08 }}
        >
          One link, and you&apos;re in.
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
          Enter your email and we&apos;ll send a magic sign-in link. No passwords.
        </p>

        {status === 'sent' ? (
          <div
            className="panel mt-8 p-6"
            style={{ borderRadius: 16 }}
          >
            <p style={{ color: 'var(--text)', fontWeight: 510 }}>Check your email.</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>
              We sent a sign-in link to <span className="mono">{email || 'your inbox'}</span>. Click it to continue.
            </p>
            <button
              type="button"
              onClick={() => setStatus('idle')}
              className="mono text-xs mt-5"
              style={{ color: 'var(--subdued)', textDecoration: 'underline' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="panel mt-8 p-6 space-y-4" style={{ borderRadius: 16 }}>
            <label className="block">
              <span className="helper-copy block mb-2">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              />
            </label>

            {errMsg && (
              <p className="text-sm" style={{ color: 'var(--error)' }}>
                {errMsg}
              </p>
            )}

            <button
              type="submit"
              className="btn-primary w-full"
              style={{ justifyContent: 'center' }}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
