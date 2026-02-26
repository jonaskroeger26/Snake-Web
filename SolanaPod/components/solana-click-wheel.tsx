"use client"

import type React from "react"
import { useRef, useState, useEffect } from "react"
import { SkipBack, SkipForward } from "lucide-react"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"

const LONG_PRESS_MS = 3000

interface SolanaClickWheelProps {
  onNext: () => void
  onPrevious: () => void
  onPlayPause: () => void
  onMenu: () => void
  onSelect: () => void
  onVolumeChange: (volume: number) => void
  onScrollUp: () => void
  onScrollDown: () => void
  volume: number
  showPlaylist: boolean
  isPlaying: boolean
  scrollThreshold?: number
  invertScrollDirection?: boolean
  /** When set, play/pause button requires long-press (e.g. 3s) to fire this instead of onPlayPause */
  onPlayPauseLongPress?: () => void
}

export function SolanaClickWheel({
  onNext,
  onPrevious,
  onPlayPause,
  onMenu,
  onSelect,
  onVolumeChange,
  onScrollUp,
  onScrollDown,
  volume,
  showPlaylist,
  isPlaying,
  scrollThreshold = 0.3,
  invertScrollDirection = false,
  onPlayPauseLongPress,
}: SolanaClickWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [lastAngle, setLastAngle] = useState(0)
  const [rotationDelta, setRotationDelta] = useState(0)
  const { playClick } = useClickWheelSound()
  const lastMoveTimeRef = useRef<number>(0)
  const playLongPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playLongPressHandledRef = useRef(false)

  const getAngle = (e: MouseEvent | TouchEvent) => {
    if (!wheelRef.current) return 0
    const rect = wheelRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY
    return Math.atan2(clientY - centerY, clientX - centerX)
  }

  const handleWheelStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e.nativeEvent) e.preventDefault()
    const nativeEvent = e.nativeEvent as MouseEvent | TouchEvent
    setIsRotating(true)
    setLastAngle(getAngle(nativeEvent))
    setRotationDelta(0)
  }

  const handleWheelMove = (e: MouseEvent | TouchEvent) => {
    if (!isRotating) return
    if ("touches" in e) e.preventDefault()

    const currentAngle = getAngle(e)
    const diff = currentAngle - lastAngle
    let normalizedDiff = diff
    if (diff > Math.PI) normalizedDiff = diff - 2 * Math.PI
    if (diff < -Math.PI) normalizedDiff = diff + 2 * Math.PI

    const newDelta = rotationDelta + normalizedDiff
    setRotationDelta(newDelta)

    const now = performance.now()
    const timeDelta = now - lastMoveTimeRef.current
    const velocity = timeDelta > 0 ? Math.abs(normalizedDiff) / (timeDelta / 1000) : 0
    lastMoveTimeRef.current = now

    const threshold = scrollThreshold

    if (showPlaylist) {
      const scrollDown = invertScrollDirection ? onScrollUp : onScrollDown
      const scrollUp = invertScrollDirection ? onScrollDown : onScrollUp
      if (newDelta > threshold) {
        scrollDown()
        playClick(Math.min(1, velocity / 5))
        setRotationDelta(0)
      } else if (newDelta < -threshold) {
        scrollUp()
        playClick(Math.min(1, velocity / 5))
        setRotationDelta(0)
      }
    } else {
      if (newDelta > threshold) {
        onVolumeChange(Math.min(100, volume + 10))
        playClick(Math.min(1, velocity / 5))
        setRotationDelta(0)
      } else if (newDelta < -threshold) {
        onVolumeChange(Math.max(0, volume - 10))
        playClick(Math.min(1, velocity / 5))
        setRotationDelta(0)
      }
    }

    setLastAngle(currentAngle)
  }

  const handleWheelEnd = () => {
    setIsRotating(false)
    setRotationDelta(0)
  }

  const handlePlayPausePointerDown = () => {
    if (!onPlayPauseLongPress) return
    playLongPressHandledRef.current = false
    playLongPressTimerRef.current = setTimeout(() => {
      playLongPressTimerRef.current = null
      playLongPressHandledRef.current = true
      onPlayPauseLongPress()
    }, LONG_PRESS_MS)
  }

  const handlePlayPausePointerUp = () => {
    if (playLongPressTimerRef.current) {
      clearTimeout(playLongPressTimerRef.current)
      playLongPressTimerRef.current = null
    }
  }

  const handlePlayPauseClick = () => {
    if (playLongPressHandledRef.current) {
      playLongPressHandledRef.current = false
      return
    }
    if (onPlayPauseLongPress) return
    onPlayPause()
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => handleWheelMove(e)
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      handleWheelMove(e)
    }
    const handleMouseUp = () => handleWheelEnd()
    const handleTouchEnd = () => handleWheelEnd()

    if (isRotating) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("touchmove", handleTouchMove, { passive: false })
      window.addEventListener("mouseup", handleMouseUp)
      window.addEventListener("touchend", handleTouchEnd)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [isRotating, lastAngle, volume, showPlaylist, rotationDelta, scrollThreshold, invertScrollDirection])

  return (
    <div className="relative w-[240px] h-[240px]">
      {/* Neon glow ring behind the wheel */}
      <div
        className="absolute -inset-2 rounded-full solana-wheel-glow"
        style={{
          background: "conic-gradient(from 0deg, rgba(153,69,255,0.5), rgba(20,241,149,0.35), rgba(153,69,255,0.5), rgba(20,241,149,0.35), rgba(153,69,255,0.5))",
          filter: "blur(10px)",
        }}
      />

      {/* Outer neon border ring */}
      <div
        className="absolute -inset-[2px] rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #9945FF, #14F195, #9945FF, #14F195, #9945FF)",
          opacity: 0.5,
          filter: "drop-shadow(0 0 8px rgba(153, 69, 255, 0.5)) drop-shadow(0 0 16px rgba(20, 241, 149, 0.3))",
        }}
      />

      {/* Outer Ring */}
      <div
        ref={wheelRef}
        className="absolute inset-0 rounded-full cursor-pointer select-none touch-none"
        style={{
          background: "linear-gradient(145deg, #16161e, #0c0c12, #16161e)",
          boxShadow: `
            0 8px 24px rgba(153, 69, 255, 0.2),
            0 0 0 1px rgba(153, 69, 255, 0.15) inset,
            0 -2px 4px rgba(20, 241, 149, 0.1) inset
          `,
        }}
        onMouseDown={handleWheelStart}
        onTouchStart={handleWheelStart}
      >
        {/* Subtle ring grooves */}
        <div
          className="absolute inset-[2px] rounded-full pointer-events-none"
          style={{
            background: `
              conic-gradient(
                from 0deg,
                rgba(255,255,255,0.01) 0deg,
                rgba(255,255,255,0.03) 5deg,
                rgba(255,255,255,0.01) 10deg,
                rgba(255,255,255,0.02) 15deg,
                rgba(255,255,255,0.01) 20deg
              )
            `,
          }}
        />

        {/* Inner concentric ring */}
        <div
          className="absolute inset-[10px] rounded-full"
          style={{
            background: "linear-gradient(145deg, #0e0e14, #08080c, #0e0e14)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.8) inset, 0 1px 0 rgba(153,69,255,0.04)",
          }}
        >
          {/* Menu Button */}
          <button
            onClick={onMenu}
            className="absolute top-4 left-1/2 -translate-x-1/2 text-xs font-semibold hover:opacity-80 transition-opacity z-20"
            style={{
              color: "#14F195",
              textShadow: "0 0 8px rgba(20, 241, 149, 0.4)",
            }}
          >
            MENU
          </button>

          {/* Previous Button */}
          <button
            onClick={onPrevious}
            className="absolute left-6 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity z-20"
            style={{ filter: "drop-shadow(0 0 4px rgba(20, 241, 149, 0.3))" }}
          >
            <SkipBack size={20} fill="#14F195" color="#14F195" />
          </button>

          {/* Next Button */}
          <button
            onClick={onNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 hover:opacity-80 transition-opacity z-20"
            style={{ filter: "drop-shadow(0 0 4px rgba(20, 241, 149, 0.3))" }}
          >
            <SkipForward size={20} fill="#14F195" color="#14F195" />
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={onPlayPauseLongPress ? handlePlayPauseClick : onPlayPause}
            onPointerDown={onPlayPauseLongPress ? handlePlayPausePointerDown : undefined}
            onPointerUp={onPlayPauseLongPress ? handlePlayPausePointerUp : undefined}
            onPointerLeave={onPlayPauseLongPress ? handlePlayPausePointerUp : undefined}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 hover:opacity-80 transition-opacity z-20"
            style={{ filter: "drop-shadow(0 0 4px rgba(20, 241, 149, 0.3))" }}
            title={onPlayPauseLongPress ? "Hold 3s to turn on" : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#14F195" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7z" />
              <rect x="20" y="5" width="2" height="14" />
              <rect x="23" y="5" width="2" height="14" />
            </svg>
          </button>

          {/* Center Select Button */}
          <button
            onClick={onSelect}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-full transition-all active:scale-95 z-10"
            style={{
              background: "linear-gradient(145deg, #1a1a24, #0e0e16, #1a1a24)",
              boxShadow: `
                0 4px 12px rgba(0,0,0,0.5),
                0 -1px 2px rgba(153, 69, 255, 0.12) inset,
                0 0 20px rgba(153, 69, 255, 0.1) inset,
                0 0 0 1px rgba(153, 69, 255, 0.15),
                0 0 12px rgba(153, 69, 255, 0.12),
                0 0 24px rgba(20, 241, 149, 0.06)
              `,
            }}
          >
            {/* Center button inner ring */}
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div
                className="w-[70px] h-[70px] rounded-full"
                style={{
                  background: "linear-gradient(145deg, #0e0e16, #08080c, #0e0e16)",
                  boxShadow: "0 3px 8px rgba(0,0,0,0.6) inset, 0 1px 0 rgba(255,255,255,0.02)",
                }}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
