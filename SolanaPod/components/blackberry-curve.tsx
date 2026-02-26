"use client"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"

export function BlackBerryCurve({ isActive = true }: { isActive?: boolean }) {
  const { isPlaying, setIsPlaying } = useMusicPlayback()
  const { playClick } = useClickWheelSound()

  const handlePlayPause = () => {
    playClick()
    setIsPlaying(!isPlaying)
  }

  return (
    <div className="relative z-10 flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute w-[325px] h-[700px] bg-black/20 rounded-[60px] blur-lg"></div>

      {/* BlackBerry Curve Body */}
      <div className="relative w-[300px] h-[675px] bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a] rounded-[55px] shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset] border-[2px] border-[#000000]">
        {/* Top highlight */}
        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-white/5 to-transparent rounded-t-[55px] pointer-events-none"></div>

        {/* BlackBerry logo */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 text-[#808080] text-[18px] font-bold tracking-wide">
          BlackBerry
        </div>

        {/* Screen bezel */}
        <div className="absolute top-24 left-1/2 -translate-x-1/2 w-[250px] h-[225px] bg-gradient-to-b from-[#0a0a0a] to-[#1a1a1a] rounded-2xl shadow-[0_2px_6px_rgba(0,0,0,0.6)_inset] p-[5px]">
          {isActive ? (
            <>
              {/* LCD Screen */}
              <div className="w-full h-full bg-gradient-to-br from-[#e8f4f8] via-[#d8e4e8] to-[#c8d4d8] rounded-[15px] relative overflow-hidden">
                {/* Screen content */}
                <div className="relative z-10 p-2 h-full flex flex-col">
                  {/* Status bar */}
                  <div className="flex justify-between items-center text-[15px] text-[#2a2a2a] mb-2">
                    <div className="flex items-center gap-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M5 13h14v-2H5m0-4h14V5H5m0 14h14v-2H5z" />
                      </svg>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20 18c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2v12z" />
                      </svg>
                    </div>
                    <span className="font-bold">2:30 PM</span>
                    <div className="flex gap-[1px]">
                      <div className="w-[2px] h-[4px] bg-current"></div>
                      <div className="w-[2px] h-[5px] bg-current"></div>
                      <div className="w-[2px] h-[6px] bg-current"></div>
                      <div className="w-[2px] h-[7px] bg-current"></div>
                    </div>
                  </div>

                  {/* Wallpaper - Sunflower image placeholder */}
                  <div className="flex-1 rounded-md overflow-hidden mb-2 bg-gradient-to-br from-[#ffd700] via-[#ffed4e] to-[#ffa500] relative">
                    {/* Sunflower center */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#8b4513] to-[#654321]"></div>
                    {/* Petals */}
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-1/2 left-1/2 w-8 h-16 bg-gradient-to-b from-[#ffd700] to-[#ffed4e] rounded-full"
                        style={{
                          transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-30px)`,
                        }}
                      ></div>
                    ))}

                    {/* Music indicator when playing */}
                    {isPlaying && (
                      <div className="absolute bottom-2 right-2 bg-black/60 rounded px-2 py-1 flex items-center gap-2">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                        <span className="text-white text-[15px]">Playing</span>
                      </div>
                    )}
                  </div>

                  {/* App icons row */}
                  <div className="flex justify-around items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#4a90e2] to-[#357abd] flex items-center justify-center">
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#2a2a2a]">Mail</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#27ae60] to-[#229954] flex items-center justify-center">
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#2a2a2a]">SMS</span>
                    </div>
                    <button onClick={handlePlayPause} className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#ff6b35] to-[#ff8c42] flex items-center justify-center">
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#2a2a2a]">Music</span>
                    </button>
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-12 h-12 rounded-md bg-gradient-to-br from-[#9b59b6] to-[#8e44ad] flex items-center justify-center">
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="white">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                      </div>
                      <span className="text-[12px] text-[#2a2a2a]">Tasks</span>
                    </div>
                  </div>
                </div>

                {/* Screen glass effect */}
                <div className="absolute top-0 left-0 right-0 h-[75px] bg-gradient-to-b from-white/30 to-transparent pointer-events-none"></div>
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-[#8a9a9a] rounded-[15px]"></div>
          )}
        </div>

        {/* Trackpad */}
        <div className="absolute top-[275px] left-1/2 -translate-x-1/2 w-[75px] h-[75px] rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_2px_4px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05)_inset] border-2 border-[#1a1a22]">
          {/* Trackpad texture */}
          <div
            className="absolute inset-2 rounded-full"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          ></div>
        </div>

        {/* Menu and Back buttons */}
        <div className="absolute top-[362px] left-1/2 -translate-x-1/2 flex gap-20">
          <button className="w-[45px] h-[12px] rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
          <button className="w-[45px] h-[12px] rounded-full bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></button>
        </div>

        {/* QWERTY Keyboard */}
        <div className="absolute bottom-14 left-1/2 -translate-x-1/2 w-[262px]">
          {/* Row 1 */}
          <div className="flex justify-center gap-[5px] mb-[5px]">
            {["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"].map((key) => (
              <button
                key={key}
                className="w-[22px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] active:shadow-[0_1px_1px_rgba(0,0,0,0.4)_inset] flex items-center justify-center"
              >
                <span className="text-[15px] text-white font-bold">{key}</span>
              </button>
            ))}
          </div>

          {/* Row 2 */}
          <div className="flex justify-center gap-[5px] mb-[5px]">
            {["A", "S", "D", "F", "G", "H", "J", "K", "L"].map((key) => (
              <button
                key={key}
                className="w-[22px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] active:shadow-[0_1px_1px_rgba(0,0,0,0.4)_inset] flex items-center justify-center"
              >
                <span className="text-[15px] text-white font-bold">{key}</span>
              </button>
            ))}
          </div>

          {/* Row 3 */}
          <div className="flex justify-center gap-[5px] mb-[5px]">
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">⇧</span>
            </button>
            {["Z", "X", "C", "V", "B", "N", "M"].map((key) => (
              <button
                key={key}
                className="w-[22px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] active:shadow-[0_1px_1px_rgba(0,0,0,0.4)_inset] flex items-center justify-center"
              >
                <span className="text-[15px] text-white font-bold">{key}</span>
              </button>
            ))}
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">⌫</span>
            </button>
          </div>

          {/* Row 4 - Space bar row */}
          <div className="flex justify-center gap-[5px]">
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">alt</span>
            </button>
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">$</span>
            </button>
            <button className="flex-1 h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)]"></button>
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">sym</span>
            </button>
            <button className="w-[30px] h-[22px] rounded-sm bg-gradient-to-b from-[#3a3a42] to-[#2a2a32] shadow-[0_1px_2px_rgba(0,0,0,0.4)] flex items-center justify-center">
              <span className="text-[12px] text-white">↵</span>
            </button>
          </div>
        </div>

        {/* Call and End buttons */}
        <div className="absolute bottom-[212px] left-1/2 -translate-x-1/2 flex gap-20">
          <button className="w-[70px] h-[20px] rounded-full bg-gradient-to-b from-[#27ae60] to-[#229954] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
          <button className="w-[70px] h-[20px] rounded-full bg-gradient-to-b from-[#e74c3c] to-[#c0392b] shadow-[0_2px_4px_rgba(0,0,0,0.4)]"></button>
        </div>

        {/* Speaker grille at top */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 w-[125px] h-[5px] flex gap-[2px]">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="flex-1 h-full bg-[#2a2a2a] rounded-full"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
