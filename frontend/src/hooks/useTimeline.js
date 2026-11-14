import { useCallback, useEffect, useMemo, useState } from 'react'

function clampIndex(index, length) {
  if (length === 0) {
    return 0
  }

  return Math.min(Math.max(index, 0), length - 1)
}

function resolveInitialIndex(records, { initialIndex, initialYear, initialMonth }) {
  if (Number.isInteger(initialIndex)) {
    return clampIndex(initialIndex, records.length)
  }

  if (Number.isInteger(initialYear)) {
    const month = Number.isInteger(initialMonth) ? initialMonth : 1
    const exact = records.findIndex(
      (record) => record.year === initialYear && record.month === month,
    )

    if (exact >= 0) {
      return exact
    }

    const firstInYear = records.findIndex((record) => record.year === initialYear)
    if (firstInYear >= 0) {
      return firstInYear
    }
  }

  return 0
}

/**
 * TIMELINE INTEGRATION CONTRACT
 *
 * currentIndex, setCurrentIndex, isPlaying, play, pause, stop,
 * playbackSpeed, setPlaybackSpeed
 *
 * The parent owns one instance of this hook. Pass currentRecord to the chart,
 * summary, information panel and audio layer so the selected month stays the
 * single source of truth.
 */
export default function useTimeline(records, options = {}) {
  const {
    initialIndex,
    initialYear,
    initialMonth,
    intervalMs = 700,
  } = options

  const length = records?.length ?? 0
  const [currentIndex, setCurrentIndexState] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [playbackSpeed, setPlaybackSpeedState] = useState(1)

  const effectiveIntervalMs = Math.max(80, Math.round(intervalMs / playbackSpeed))

  useEffect(() => {
    if (length === 0) {
      // The dataset can arrive asynchronously, so reset the cursor when it is empty.
      // oxlint-disable-next-line react/set-state-in-effect
      setCurrentIndexState(0)
      setIsPlaying(false)
      setHasInitialized(false)
      return
    }

    if (!hasInitialized) {
      setCurrentIndexState(resolveInitialIndex(records, { initialIndex, initialYear, initialMonth }))
      setHasInitialized(true)
      return
    }

    setCurrentIndexState((previousIndex) => clampIndex(previousIndex, length))
  }, [hasInitialized, initialIndex, initialMonth, initialYear, length, records])

  // A single interval is created only while the timeline is playing.
  useEffect(() => {
    if (!isPlaying || length < 2) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setCurrentIndexState((previousIndex) => clampIndex(previousIndex + 1, length))
    }, effectiveIntervalMs)

    return () => window.clearInterval(intervalId)
  }, [effectiveIntervalMs, isPlaying, length])

  useEffect(() => {
    if (isPlaying && length > 0 && currentIndex >= length - 1) {
      // Stop at the final month instead of letting the interval keep firing.
      // oxlint-disable-next-line react/set-state-in-effect
      setIsPlaying(false)
    }
  }, [currentIndex, isPlaying, length])

  const setCurrentIndex = useCallback(
    (nextIndex) => {
      setIsPlaying(false)
      setCurrentIndexState((previousIndex) => {
        const value = typeof nextIndex === 'function' ? nextIndex(previousIndex) : nextIndex
        return clampIndex(value, length)
      })
    },
    [length],
  )

  const previous = useCallback(() => {
    setCurrentIndexState((previousIndex) => clampIndex(previousIndex - 1, length))
  }, [length])

  const next = useCallback(() => {
    setCurrentIndexState((previousIndex) => clampIndex(previousIndex + 1, length))
  }, [length])

  const play = useCallback(() => {
    if (length === 0) {
      return
    }

    setCurrentIndexState((previousIndex) => (previousIndex >= length - 1 ? 0 : previousIndex))
    setIsPlaying(true)
  }, [length])

  const pause = useCallback(() => {
    setIsPlaying(false)
  }, [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndexState(0)
  }, [])

  const setPlaybackSpeed = useCallback((nextSpeed) => {
    const value = Number(nextSpeed)

    if (!Number.isFinite(value) || value <= 0) {
      return
    }

    setPlaybackSpeedState(Math.min(Math.max(value, 0.25), 8))
  }, [])

  const safeIndex = clampIndex(currentIndex, length)
  const currentRecord = useMemo(() => records?.[safeIndex] ?? null, [records, safeIndex])
  const progress = length <= 1 ? 0 : (safeIndex / (length - 1)) * 100

  return {
    currentIndex: safeIndex,
    setCurrentIndex,
    currentRecord,
    isPlaying,
    play,
    pause,
    stop,
    previous,
    next,
    progress,
    total: length,
    playbackSpeed,
    setPlaybackSpeed,
    effectiveIntervalMs,
  }
}
