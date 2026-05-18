import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Spectr — Connect Spectr to Claude in one command'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background:
            'radial-gradient(120% 90% at 50% 0%, #2a1f66 0%, #14132b 48%, #07080f 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -200,
            left: '50%',
            width: 900,
            height: 900,
            marginLeft: -450,
            borderRadius: 9999,
            background:
              'radial-gradient(circle at center, rgba(170, 140, 255, 0.35) 0%, rgba(90, 70, 220, 0.18) 35%, rgba(0,0,0,0) 70%)',
            display: 'flex',
          }}
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 28,
            padding: 64,
            zIndex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              letterSpacing: 8,
              color: '#b8a9ff',
              textTransform: 'uppercase',
            }}
          >
            From recording to blueprint
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 220,
              fontWeight: 900,
              letterSpacing: -6,
              color: '#ffffff',
              textShadow:
                '0 0 40px rgba(170, 140, 255, 0.55), 0 0 80px rgba(90, 70, 220, 0.35)',
            }}
          >
            Spectr
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 40,
              fontWeight: 400,
              color: '#e8e4ff',
              marginTop: -10,
            }}
          >
            Connect Spectr to Claude in one command.
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 56,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 22px',
            border: '1px solid rgba(184, 169, 255, 0.35)',
            borderRadius: 999,
            background: 'rgba(20, 19, 43, 0.6)',
            fontSize: 24,
            color: '#d6cdff',
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 999,
              background: '#a88bff',
              display: 'flex',
            }}
          />
          spectr.to
        </div>
      </div>
    ),
    { ...size },
  )
}
