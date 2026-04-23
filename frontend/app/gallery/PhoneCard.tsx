type Props = {
  doc: string | null
  name: string
  ariaHidden?: boolean
}

export default function PhoneCard({ doc, name, ariaHidden = true }: Props) {
  return (
    <div className="phone-frame">
      <div className="phone-glow" aria-hidden="true" />
      <div className="phone-viewport">
        {doc ? (
          <iframe
            className="phone-iframe"
            srcDoc={doc}
            sandbox="allow-same-origin"
            scrolling="no"
            title={`${name} phone preview`}
            loading="lazy"
            aria-hidden={ariaHidden}
          />
        ) : (
          <div className="phone-skeleton">Preview unavailable</div>
        )}
      </div>
    </div>
  )
}

export const PHONE_CARD_CSS = `
  .phone-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 390 / 844;
    border-radius: 38px;
    padding: 6px;
    background: linear-gradient(160deg,
      rgba(255,255,255,0.10) 0%,
      rgba(255,255,255,0.02) 40%,
      rgba(113,112,255,0.12) 100%);
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.55),
      0 14px 36px rgba(0,0,0,0.45),
      0 32px 80px rgba(0,0,0,0.55),
      0 0 56px rgba(113,112,255,0.08),
      inset 0 1px 0 rgba(255,255,255,0.09);
    transition: box-shadow 0.35s ease;
  }
  .phone-glow {
    position: absolute;
    inset: -22px;
    background: radial-gradient(ellipse 70% 60% at 50% 50%,
      rgba(113,112,255,0.12) 0%, transparent 70%);
    pointer-events: none;
    z-index: -1;
  }
  .phone-viewport {
    container-type: inline-size;
    position: relative;
    width: 100%;
    height: 100%;
    border-radius: 32px;
    overflow: hidden;
    background: #000;
  }
  .phone-iframe {
    position: absolute;
    top: 0; left: 0;
    width: 390px;
    height: 844px;
    border: 0;
    transform: scale(calc(100cqw / 390px));
    transform-origin: top left;
    pointer-events: none;
    background: #000;
    color-scheme: dark;
  }
  .phone-skeleton {
    position: absolute; inset: 0;
    background: linear-gradient(180deg, #0a0b10 0%, #050506 100%);
    display: flex; align-items: center; justify-content: center;
    color: rgba(160,170,255,0.45);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
`
