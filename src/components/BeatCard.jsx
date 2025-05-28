// src/components/BeatPlayer.jsx
import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo
} from 'react'
import { usePlayer }       from '@/context/PlayerContext'
import { useBeatQueue }    from '@/context/BeatQueueContext'
import BeatQueuePanel      from './BeatQueuePanel'
import { useLicenseModal } from '@/context/LicenseModalContext'
// … your Heroicons imports …

// … shuffleArray, CoverInfo, Controls as before …

export default function BeatPlayer() {
  const {
    currentBeat,
    shouldAutoPlay,
    setShouldAutoPlay,
    playbackTime,
    setPlaybackTime,
    playBeat,
  } = usePlayer()
  const { queue } = useBeatQueue()
  const { openLicenseModal } = useLicenseModal()
  const audioRef = useRef(null)

  // … all your existing state, refs, effects, handlers …

  // derive activeBeat
  const currentQueue = useMemo(
    () => (isShuffled ? localShuffledQueue : queue),
    [isShuffled, queue, localShuffledQueue]
  )
  const activeBeat = useMemo(
    () => currentBeat || currentQueue[currentIndex],
    [currentBeat, currentQueue, currentIndex]
  )

  // … metadata calculations …
  const title      = activeBeat?.name   || 'Untitled'
  const artist     = activeBeat?.artist || 'Unknown'
  const coverImage = activeBeat?.cover  || '/images/beats/default-cover.png'
  const audioUrl   = activeBeat?.audioUrl || ''
  const basePrice  = useMemo(
    () => activeBeat?.price ?? 24.99,
    [activeBeat]
  )

  // ── NEW: guard + log before opening modal ───────────────────────────
  const handleOpenLicense = useCallback(() => {
    console.log('BeatPlayer: opening license for activeBeat:', activeBeat)
    if (!activeBeat || !activeBeat.id) {
      console.error('BeatPlayer: activeBeat.id is missing!', activeBeat)
      return
    }
    openLicenseModal(activeBeat)
  }, [activeBeat, openLicenseModal])

  // … the rest of your handlers (togglePlay, skipNext, skipBack, etc.) …

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white z-50 shadow-xl">
      <audio ref={audioRef} />

      {/* progress bar */} 
      {/* … */}

      {/* main controls */} 
      <div className="relative flex flex-col sm:flex-row items-center sm:justify-between px-4 sm:px-6 py-2 space-y-2 sm:space-y-0">
        <CoverInfo
          coverImage={coverImage}
          title={title}
          artist={artist}
          basePrice={basePrice}
          // ← use our guarded handler here:
          openLicenseModal={handleOpenLicense}
          isExpanded={isExpanded}
          toggleExpand={() => setIsExpanded(exp => !exp)}
        />

        <div className="flex flex-col items-center
                        sm:absolute sm:left-1/2 sm:top-1/2
                        sm:transform sm:-translate-x-1/2 sm:-translate-y-1/2">
          <Controls
            // … your controls props …
          />
          {/* playtime display */}
        </div>

        {/* volume & expand button */}
      </div>

      {isExpanded && (
        <BeatQueuePanel
          queue={currentQueue}
          currentIndex={currentIndex}
          onSelect={i => {
            setCurrentIndex(i)
            playBeat(currentQueue[i])
            setShouldAutoPlay(true)
          }}
        />
      )}
    </div>
  )
}
