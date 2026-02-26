"use client"

import type React from "react"

import { useRef, useState, useEffect } from "react"
import { SkipBack, SkipForward } from "lucide-react"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"

interface ClickWheelProps {
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
  /** Lower = more sensitive (e.g. 0.15 for snake game). Default 0.3 */
  scrollThreshold?: number
  /** When true (e.g. in snake game), positive rotation = scroll up, negative = scroll down (iPod-style). */
  invertScrollDirection?: boolean
}

export function ClickWheel({
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
}: ClickWheelProps) {
  const wheelRef = useRef<HTMLDivElement>(null)
  const [isRotating, setIsRotating] = useState(false)
  const [lastAngle, setLastAngle] = useState(0)
  const [rotationDelta, setRotationDelta] = useState(0)
  const { playClick } = useClickWheelSound()
  const lastMoveTimeRef = useRef<number>(0)

  const getAngle = (e: MouseEvent | TouchEvent) => {
    if (!wheelRef.current) return 0
    const rect = wheelRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    const angle = Math.atan2(clientY - centerY, clientX - centerX)
    return angle
  }

  const handleWheelStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ("touches" in e.nativeEvent) {
      e.preventDefault()
    }
    const nativeEvent = e.nativeEvent as MouseEvent | TouchEvent
    setIsRotating(true)
    setLastAngle(getAngle(nativeEvent))
    setRotationDelta(0)
  }

  const handleWheelMove = (e: MouseEvent | TouchEvent) => {
    if (!isRotating) return

    if ("touches" in e) {
      e.preventDefault()
    }

    const currentAngle = getAngle(e)
    const diff = currentAngle - lastAngle

    // Normalize the difference to handle wrap-around
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
      // Scroll when rotation exceeds threshold
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
      // Volume control in increments of 10
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
      {/* Outer shadow for depth */}
      <div className="absolute inset-0 rounded-full bg-black/30 blur-md"></div>

      {/* Outer Ring - Touch sensitive area with raised bevel effect */}
      <div
        ref={wheelRef}
        className="absolute inset-0 rounded-full bg-gradient-to-br from-[#3a3a42] via-[#2a2a32] to-[#1a1a22] shadow-[0_8px_24px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_-2px_4px_rgba(255,255,255,0.1)_inset] cursor-pointer select-none touch-none"
        onMouseDown={handleWheelStart}
        onTouchStart={handleWheelStart}
      >
        {/* Top highlight for glossy raised effect */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

        {/* Inner ring with recessed effect */}
        <div className="absolute inset-[10px] rounded-full bg-gradient-to-br from-[#1a1a22] via-[#2a2a32] to-[#1a1a22] shadow-[0_4px_12px_rgba(0,0,0,0.8)_inset,0_1px_0_rgba(255,255,255,0.03)]">
          {/* Menu Button - Top with embossed text */}
          <button
            onClick={onMenu}
            className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-xs font-semibold hover:text-gray-300 transition-colors z-20 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
          >
            MENU
          </button>

          {/* Previous Button - Left with raised icon effect */}
          <button
            onClick={onPrevious}
            className="absolute left-6 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          >
            <SkipBack size={20} fill="white" />
          </button>

          {/* Next Button - Right with raised icon effect */}
          <button
            onClick={onNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          >
            <SkipForward size={20} fill="white" />
          </button>

          <button
            onClick={onPlayPause}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white hover:text-gray-300 transition-colors z-20 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              {/* Play triangle */}
              <path d="M8 5v14l11-7z" />
              {/* Pause bars */}
              <rect x="20" y="5" width="2" height="14" />
              <rect x="23" y="5" width="2" height="14" />
            </svg>
          </button>

          {/* Center Select Button with multi-layer depth */}
          <button
            onClick={onSelect}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-full bg-gradient-to-br from-[#4a4a52] via-[#3a3a42] to-[#2a2a32] shadow-[0_4px_12px_rgba(0,0,0,0.5),0_-1px_2px_rgba(255,255,255,0.1)_inset] transition-all active:scale-95 active:shadow-[0_2px_8px_rgba(0,0,0,0.6)_inset] z-10"
          >
            {/* Button top highlight */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/8 to-transparent pointer-events-none"></div>

            {/* Inner recessed circle */}
            <div className="w-full h-full rounded-full flex items-center justify-center">
              <div className="w-[70px] h-[70px] rounded-full bg-gradient-to-br from-[#2a2a32] via-[#3a3a42] to-[#2a2a32] shadow-[0_3px_8px_rgba(0,0,0,0.6)_inset,0_1px_0_rgba(255,255,255,0.05)]"></div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
