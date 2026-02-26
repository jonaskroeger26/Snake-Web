"use client"

import { useState } from "react"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"

export function SonyEricssonW810i({ isActive = true }: { isActive?: boolean }) {
  const { isPlaying, setIsPlaying } = useMusicPlayback()
  const { playClick } = useClickWheelSound()
  const [selectedMenu, setSelectedMenu] = useState(0)

  const handleUpPress = () => {
    playClick()
    setSelectedMenu((prev) => (prev > 0 ? prev - 1 : 3))
  }

  const handleDownPress = () => {
    playClick()
    setSelectedMenu((prev) => (prev < 3 ? prev + 1 : 0))
  }

  const handlePlayPause = () => {
    playClick()
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="relative z-10 flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute w-[325px] h-[700px] bg-black/20 rounded-[60px] blur-lg"></div>

      {/* Sony Ericsson W810i Body */}
      <div className="relative w-[300px] h-[675px] bg-gradient-to-br from-[#1a1a1a] via-[#0a0a0a] to-[#1a1a1a] rounded-[55px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset] border-[2px] border-[#000000]">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-white/5 to-transparent rounded-t-[55px] pointer-events-none"></div>

        {/* Sony Ericsson branding */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[#808080] text-[20px] font-sans tracking-wide">
          Sony Ericsson
        </div>

        {/* Screen bezel */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[250px] h-[275px] bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.6)_inset] p-[5px]">
          {isActive ? (
            <>
              {/* LCD Screen */}
              <div className="w-full h-full bg-gradient-to-br from-[#1a2a3a] via-[#0a1a2a] to-[#1a2a3a] rounded-[15px] relative overflow-hidden">
                {/* Screen content */}
                <div className="relative z-10 p-5 h-full flex flex-col text-white">
                  {/* Status bar */}
                  <div className="flex justify-between items-center text-[15px] mb-5">
                    <div className="flex items-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 13h14v-2H5m0-4h14V5H5m0 14h14v-2H5z" />
                      </svg>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </div>
                    <span>14:23</span>
                    <div className="flex gap-[1px]">
                      <div className="w-[2px] h-[4px] bg-current"></div>
                      <div className="w-[2px] h-[5px] bg-current"></div>
                      <div className="w-[2px] h-[6px] bg-current"></div>
                      <div className="w-[2px] h-[7px] bg-current"></div>
                    </div>
                  </div>

                  {/* Walkman logo */}
                  <div className="flex items-center justify-center mb-5">
                    <div className="bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] px-8 py-2 rounded-md">
                      <div className="text-white text-[25px] font-bold tracking-wide">WALKMAN</div>
                    </div>
                  </div>

                  {/* Main content */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    {isPlaying ? (
                      <>
                        {/* Album art placeholder */}
                        <div className="w-30 h-30 bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] rounded-md mb-5 flex items-center justify-center">
                          <svg width="50" height="50" viewBox="0 0 24 24" fill="white">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </div>
                        <div className="text-[22px] text-center mb-2">Now Playing</div>
                        <div className="text-[18px] text-white/60 text-center">Track Title</div>
                        <div className="text-[15px] text-white/40 text-center">Artist Name</div>

                        {/* Progress bar */}
                        <div className="w-full mt-5 px-5">
                          <div className="h-[5px] bg-white/20 rounded-full overflow-hidden">
                            <div className="h-full w-1/3 bg-gradient-to-r from-[#ff6b35] to-[#ff8c42] rounded-full"></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#ff6b35" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polygon points="10 8 16 12 10 16 10 8" fill="#ff6b35" />
                        </svg>
                        <div className="text-[20px] text-white/60 mt-5">Music Player</div>
                      </>
                    )}
                  </div>

                  {/* Bottom menu */}
                  <div className="flex justify-between text-[15px] text-[#ff8c42]">
                    <span>Options</span>
                    <span>Select</span>
                  </div>
                </div>

                {/* Screen glass effect */}
                <div className="absolute top-0 left-0 right-0 h-[100px] bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#0a0a0a] rounded-[15px]"></div>
          )}
        </div>

        {/* Navigation joystick */}
        <div className="absolute top-[337px] left-1/2 -translate-x-1/2 w-[137px] h-[137px]">
          {/* Outer ring with orange accent */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] shadow-[0_2px_4px_rgba(0,0,0,0.4)] border-[5px] border-[#ff6b35]"></div>

          {/* Center button - orange play/pause */}
          <button
            onClick={handlePlayPause}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[55px] h-[55px] rounded-full bg-gradient-to-b from-[#ff8c42] to-[#ff6b35] shadow-[0_2px_4px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset] z-10 flex items-center justify-center"
          >
            {isPlaying ? (
              <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Directional buttons */}
          <button
            onClick={handleUpPress}
            className="absolute top-2 left-1/2 -translate-x-1/2 w-[30px] h-[35px] rounded-t-lg bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset]"
          ></button>

          <button
            onClick={handleDownPress}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 w-[30px] h-[35px] rounded-b-lg bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset]"
          ></button>

          <button className="absolute left-2 top-1/2 -translate-y-1/2 w-[35px] h-[30px] rounded-l-lg bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset]"></button>

          <button className="absolute right-2 top-1/2 -translate-y-1/2 w-[35px] h-[30px] rounded-r-lg bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset]"></button>
        </div>

        {/* Soft keys below joystick */}
        <div className="absolute top-[500px] left-1/2 -translate-x-1/2 flex gap-30">
          <button className="w-[50px] h-[15px] rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
          <button className="w-[50px] h-[15px] rounded-full bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
        </div>

        {/* Numeric keypad */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[250px]">
          <div className="grid grid-cols-3 gap-2">
            {[
              ["1", ""],
              ["2", "abc"],
              ["3", "def"],
              ["4", "ghi"],
              ["5", "jkl"],
              ["6", "mno"],
              ["7", "pqrs"],
              ["8", "tuv"],
              ["9", "wxyz"],
              ["*", "+"],
              ["0", " "],
              ["#", ""],
            ].map(([num, letters], i) => (
              <button
                key={i}
                className="h-[30px] rounded-md bg-gradient-to-b from-[#2a2a2a] to-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.4)] active:shadow-[0_1px_2px_rgba(0,0,0,0.4)_inset] flex flex-col items-center justify-center"
              >
                <span className="text-[20px] text-white font-bold leading-none">{num}</span>
                {letters && <span className="text-[12px] text-[#808080] leading-none">{letters}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Call and End buttons */}
        <div className="absolute bottom-[187px] left-1/2 -translate-x-1/2 flex gap-20">
          <button className="w-[70px] h-[25px] rounded-full bg-gradient-to-b from-[#27ae60] to-[#229954] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
          <button className="w-[70px] h-[25px] rounded-full bg-gradient-to-b from-[#e74c3c] to-[#c0392b] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
        </div>

        {/* Speaker grille at top */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[125px] h-[5px] flex gap-[2px]">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="flex-1 h-full bg-[#2a2a2a] rounded-full"></div>
          ))}
        </div>

        {/* Camera lens */}
        <div className="absolute top-[312px] right-5 w-10 h-10 rounded-full bg-gradient-to-br from-[#2a2a3a] to-[#1a1a2a] shadow-[0_2px_4px_rgba(0,0,0,0.4)_inset] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#1a3a5a] to-[#0a2a4a]"></div>
        </div>
      </div>
    </div>
  )
}
