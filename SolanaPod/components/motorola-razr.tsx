"use client"

import { useState } from "react"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"

export function MotorolaRazr({ isActive = true }: { isActive?: boolean }) {
  const { isPlaying, setIsPlaying } = useMusicPlayback()
  const { playClick } = useClickWheelSound()
  const [isOpen, setIsOpen] = useState(true)

  const handleToggleFlip = () => {
    playClick()
    setIsOpen(!isOpen)
  }

  const handlePlayPause = () => {
    playClick()
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="relative z-10 flex items-center justify-center gap-8">
      {/* Closed view */}
      {!isOpen && (
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute w-[165px] h-[330px] bg-black/20 rounded-[30px] blur-lg"></div>

          {/* Closed Razr body */}
          <div className="relative w-[150px] h-[315px] bg-gradient-to-br from-[#c0c0c8] via-[#a0a0a8] to-[#808088] rounded-[27px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.2)_inset] border-[1px] border-[#606068]">
            {/* Top highlight */}
            <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-white/20 to-transparent rounded-t-[27px] pointer-events-none"></div>

            {/* Motorola logo */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-[#d0d0d8] to-[#b0b0b8] shadow-[0_2px_4px_rgba(0,0,0,0.3)_inset] flex items-center justify-center">
              <div className="text-[12px] font-bold text-[#606068]">M</div>
            </div>

            {/* External display */}
            <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[105px] h-[60px] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1e] rounded-lg shadow-[0_2px_6px_rgba(0,0,0,0.6)_inset] overflow-hidden">
              {isActive ? (
                <div className="absolute inset-[3px] bg-gradient-to-br from-[#2a4a6a] via-[#1a3a5a] to-[#0a2a4a] rounded-[9px] flex flex-col items-center justify-center p-3">
                  <div className="text-white text-[15px] font-sans mb-1.5">12:30</div>
                  {isPlaying && (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                    </svg>
                  )}
                </div>
              ) : (
                <div className="absolute inset-[3px] bg-[#0a1a2a] rounded-[9px]"></div>
              )}
            </div>

            {/* Camera lens */}
            <div className="absolute top-[248px] left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-gradient-to-br from-[#2a2a3a] to-[#1a1a2a] shadow-[0_2px_4px_rgba(0,0,0,0.4)_inset] flex items-center justify-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a3a5a] to-[#0a2a4a]"></div>
            </div>

            {/* Open button indicator */}
            <button
              onClick={handleToggleFlip}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-[12px] hover:text-white/80"
            >
              Open
            </button>
          </div>
        </div>
      )}

      {/* Open view */}
      {isOpen && (
        <div className="relative">
          {/* Outer glow */}
          <div className="absolute w-[165px] h-[630px] bg-black/20 rounded-[30px] blur-lg"></div>

          {/* Open Razr body */}
          <div className="relative w-[150px] h-[615px]">
            {/* Top half (screen) */}
            <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-br from-[#c0c0c8] via-[#a0a0a8] to-[#808088] rounded-t-[27px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.2)_inset] border-[1px] border-[#606068]">
              {/* Top highlight */}
              <div className="absolute top-0 left-0 right-0 h-[150px] bg-gradient-to-b from-white/20 to-transparent rounded-t-[27px] pointer-events-none"></div>

              {/* Speaker grille */}
              <div className="absolute top-5 left-1/2 -translate-x-1/2 w-[75px] h-[5px] flex gap-[1.5px]">
                {[...Array(15)].map((_, i) => (
                  <div key={i} className="flex-1 h-full bg-[#606068] rounded-full"></div>
                ))}
              </div>

              {/* Main display */}
              <div className="absolute top-15 left-1/2 -translate-x-1/2 w-[128px] h-[225px] bg-black rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.6)_inset] overflow-hidden">
                {isActive ? (
                  <div className="absolute inset-[3px] bg-gradient-to-br from-[#1a3a5a] via-[#0a2a4a] to-[#1a3a5a] rounded-[9px]">
                    <div className="p-3 h-full flex flex-col text-white">
                      {/* Status bar */}
                      <div className="flex justify-between items-center text-[9px] mb-3">
                        <div className="flex gap-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M5 13h14v-2H5m0-4h14V5H5m0 14h14v-2H5z" />
                          </svg>
                        </div>
                        <span>12:30</span>
                        <div className="flex gap-[1.5px]">
                          <div className="w-[3px] h-[6px] bg-current"></div>
                          <div className="w-[3px] h-[7.5px] bg-current"></div>
                          <div className="w-[3px] h-[9px] bg-current"></div>
                        </div>
                      </div>

                      {/* Main content */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        {isPlaying ? (
                          <>
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor" className="mb-3">
                              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                            </svg>
                            <div className="text-[13.5px] text-center mb-3">Now Playing</div>
                            <div className="text-[10.5px] text-white/60 text-center">Music Track</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[15px] font-bold mb-1.5">MOTOROLA</div>
                            <div className="text-[12px] text-white/60">Menu</div>
                          </>
                        )}
                      </div>

                      {/* Bottom menu */}
                      <div className="flex justify-between text-[9px] text-white/80">
                        <span>Menu</span>
                        <span>Select</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-[3px] bg-[#0a0a0a] rounded-[9px]"></div>
                )}
              </div>

              {/* Motorola logo */}
              <div className="absolute top-[255px] left-1/2 -translate-x-1/2 text-[12px] font-bold text-[#606068]">
                MOTOROLA
              </div>
            </div>

            {/* Bottom half (keypad) */}
            <div className="absolute bottom-0 left-0 w-full h-[300px] bg-gradient-to-br from-[#2a2a32] via-[#1a1a22] to-[#0a0a12] rounded-b-[27px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset] border-[1px] border-[#000000]">
              {/* Circular navigation pad */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[68px] h-[68px]">
                <div className="relative w-full h-full">
                  {/* Outer ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></div>

                  {/* Center select button */}
                  <button
                    onClick={handlePlayPause}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24px] h-[24px] rounded-full bg-gradient-to-b from-[#4a4a52] to-[#3a3a42] shadow-[0_2px_4px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset] z-10"
                  ></button>

                  {/* Directional indicators */}
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-[#5a5a62]"></div>
                  <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[12px] h-[12px] rounded-full bg-[#5a5a62]"></div>
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-[#5a5a62]"></div>
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-[12px] h-[12px] rounded-full bg-[#5a5a62]"></div>
                </div>
              </div>

              {/* Soft keys */}
              <div className="absolute top-[90px] left-1/2 -translate-x-1/2 flex gap-12">
                <button className="w-[30px] h-[9px] rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
                <button className="w-[30px] h-[9px] rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
              </div>

              {/* Numeric keypad */}
              <div className="absolute top-[112px] left-1/2 -translate-x-1/2 w-[128px]">
                <div className="grid grid-cols-3 gap-1.5">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"].map((num, i) => (
                    <button
                      key={i}
                      className="h-[18px] rounded-md bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset] flex items-center justify-center"
                    >
                      <span className="text-[13.5px] text-[#c0c0c8] font-bold">{num}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Call and End buttons */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-6">
                <button className="w-[45px] h-[15px] rounded-full bg-gradient-to-b from-[#27ae60] to-[#229954] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
                <button className="w-[45px] h-[15px] rounded-full bg-gradient-to-b from-[#e74c3c] to-[#c0392b] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
              </div>

              {/* Close button indicator */}
              <button
                onClick={handleToggleFlip}
                className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/40 text-[9px] hover:text-white/60"
              >
                Close
              </button>
            </div>

            {/* Hinge in the middle */}
            <div className="absolute top-[297px] left-0 w-full h-[6px] bg-gradient-to-r from-[#606068] via-[#808088] to-[#606068] shadow-[0_2px_4px_rgba(0,0,0,0.6)]"></div>
          </div>
        </div>
      )}
    </div>
  )
}
