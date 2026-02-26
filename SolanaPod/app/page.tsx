"use client"

import { useState, useEffect } from "react"
import { SolanaIPod } from "@/components/solana-ipod"
import { SolanaBackground } from "@/components/solana-background"
import { MusicPlaybackProvider } from "@/contexts/music-playback-context"
import { BOOT_LOGO_HOLD_MS, BOOT_FADE_MS, type BootPhase } from "@/components/boot-screen"

export default function Home() {
  const [powerState, setPowerState] = useState<"off" | "booting" | "on">("off")
  const [bootPhase, setBootPhase] = useState<BootPhase>("fadeIn")

  const startBoot = () => {
    if (powerState !== "off") return
    setPowerState("booting")
    setBootPhase("fadeIn")
  }

  useEffect(() => {
    if (powerState !== "booting") return
    if (bootPhase === "fadeIn") {
      const t = setTimeout(() => setBootPhase("hold"), BOOT_FADE_MS)
      return () => clearTimeout(t)
    }
    if (bootPhase === "hold") {
      const t = setTimeout(() => setBootPhase("fadeOut"), BOOT_LOGO_HOLD_MS)
      return () => clearTimeout(t)
    }
    if (bootPhase === "fadeOut") {
      const t = setTimeout(() => setPowerState("on"), BOOT_FADE_MS)
      return () => clearTimeout(t)
    }
  }, [powerState, bootPhase])

  return (
    <MusicPlaybackProvider>
      <main className="relative h-screen w-full overflow-hidden bg-[#050508] flex items-center justify-center">
        <SolanaBackground />
        <SolanaIPod
          deviceName="Solana iPod"
          powerState={powerState}
          bootPhase={bootPhase}
          onPowerOnRequest={startBoot}
        />
      </main>
    </MusicPlaybackProvider>
  )
}
