import React from 'react'
import { Composition, registerRoot } from 'remotion'
import { SpectrePromo } from './SpectrePromo'
import { SpectreSignal } from './SpectreSignal'
import { SpectreIdentity } from './SpectreIdentity'

const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="SpectreIdentity"
        component={SpectreIdentity}
        durationInFrames={360}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="SpectrePromo"
        component={SpectrePromo}
        durationInFrames={480}
        fps={60}
        width={1920}
        height={1080}
      />
      <Composition
        id="SpectreSignal"
        component={SpectreSignal}
        durationInFrames={360}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  )
}

registerRoot(RemotionRoot)
