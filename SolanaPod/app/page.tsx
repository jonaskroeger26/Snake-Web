"use client"

import { SolanaIPod } from "@/components/solana-ipod"
import { SolanaBackground } from "@/components/solana-background"
import { MusicPlaybackProvider } from "@/contexts/music-playback-context"

export default function Home() {
  return (
    <MusicPlaybackProvider>
      <main className="relative h-screen w-full overflow-hidden bg-[#050508] flex items-center justify-center">
        <SolanaBackground />
        <SolanaIPod isActive={true} deviceName="Solana iPod" />
      </main>
    </MusicPlaybackProvider>
  )
}
