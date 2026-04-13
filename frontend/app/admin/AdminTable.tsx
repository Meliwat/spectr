'use client'

import { useState } from 'react'

export type AdminRow = {
  id:             string
  email:          string
  video_filename: string | null
  downloadUrl:    string | null
  status:         string
  created_at:     string
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60)  return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const S = {
  page:   { minHeight: '100vh', background: '#07080f', color: '#c8cef0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '32px' },
  inner:  { maxWidth: 920, margin: '0 auto' },
  bar:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  h1:     { margin: 0, fontSize: 20, fontWeight: 600, color: '#e0e4ff' } as React.CSSProperties,
  count:  { margin: '4px 0 0', fontSize: 13, color: '#6b7280' } as React.CSSProperties,
  btn:    { background: 'transparent', border: '1px solid #3a3b6e', color: '#a0a4d0', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13 } as React.CSSProperties,
  wrap:   { background: '#0d0e18', border: '1px solid #1e1f38', borderRadius: 10, overflow: 'hidden' },
  table:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 } as React.CSSProperties,
  th:     { padding: '10px 16px', textAlign: 'left', color: '#4b5180', fontWeight: 500, fontSize: 11, letterSpacing: '0.5px', textTransform: 'uppercase' } as React.CSSProperties,
  thead:  { background: '#0a0b15', borderBottom: '1px solid #1a1b2e' },
} as const

export default function AdminTable({ rows, adminKey }: { rows: AdminRow[]; adminKey: string }) {
  const [fulfilling, setFulfilling] = useState<string | null>(null)

  async function markFulfilled(id: string) {
    setFulfilling(id)
    try {
      await fetch(`/api/admin/fulfill?key=${encodeURIComponent(adminKey)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
    } finally {
      window.location.reload()
    }
  }

  function exportCsv() {
    const header = ['Email', 'File', 'Signed Up', 'Status']
    const body   = rows.map(r => [
      r.email,
      r.video_filename ?? '',
      new Date(r.created_at).toISOString(),
      r.status,
    ])
    const csv  = [header, ...body].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = Object.assign(document.createElement('a'), {
      href: url,
      download: `waitlist-${new Date().toISOString().slice(0, 10)}.csv`,
    })
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={S.page}>
      <div style={S.inner}>
        <div style={S.bar}>
          <div>
            <h1 style={S.h1}>spectr · waitlist</h1>
            <p style={S.count}>Showing {rows.length} entr{rows.length === 1 ? 'y' : 'ies'}</p>
          </div>
          <button onClick={exportCsv} style={S.btn}>Export CSV ↓</button>
        </div>

        <div style={S.wrap}>
          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                {['Email', 'File', 'Signed up', 'Status', ''].map(h => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#3a3b6e' }}>
                    No signups yet.
                  </td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.id} style={{ borderTop: '1px solid #1a1b2e', background: i % 2 ? '#0a0b14' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', color: '#c8cef0' }}>{row.email}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {row.downloadUrl
                      ? <a href={row.downloadUrl} style={{ color: '#7170ff', textDecoration: 'none', fontSize: 12 }}>{row.video_filename ?? 'download'}</a>
                      : <span style={{ color: '#3a3b6e', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#6b7280' }}>{timeAgo(row.created_at)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      background: row.status === 'fulfilled' ? '#1a2e1a' : '#1e1a2e',
                      color:      row.status === 'fulfilled' ? '#4ade80' : '#a78bfa',
                      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    {row.status === 'pending' && (
                      <button
                        onClick={() => markFulfilled(row.id)}
                        disabled={fulfilling === row.id}
                        style={{ ...S.btn, fontSize: 11, padding: '5px 12px', opacity: fulfilling === row.id ? 0.5 : 1 }}
                      >
                        {fulfilling === row.id ? 'Saving...' : 'Mark fulfilled'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
