"use client"
import { useState, useEffect, useCallback } from "react"
import { IPodDisplay } from "./ipod-display"
import { SolanaClickWheel } from "./solana-click-wheel"
import { BootLogoDisplay } from "./boot-screen"
import type { BootPhase } from "./boot-screen"
import type { Artist, Album, Song } from "@/lib/music-library"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"
import {
  trackSongPlay,
  trackNavigation,
  trackMenuBack,
  trackVolumeChange,
  trackButtonPress,
  trackSongPause,
} from "@/lib/analytics"

export function SolanaIPod({
  deviceName = "Solana iPod",
  powerState = "on",
  bootPhase = "fadeIn",
  onPowerOnRequest,
}: {
  deviceName?: string
  powerState?: "off" | "booting" | "on"
  bootPhase?: BootPhase
  onPowerOnRequest?: () => void
}) {
  const isActive = powerState === "on"
  const { library, navigation, setNavigation, selectedIndex, setSelectedIndex, isPlaying, setIsPlaying, volume, setVolume, advanceToNext, advanceToPrevious } =
    useMusicPlayback()
  const { playClick } = useClickWheelSound()
  const [hideUI, setHideUI] = useState(false)

  useEffect(() => {
    if (navigation.level === "nowPlaying" && isPlaying) {
      const timer = setTimeout(() => setHideUI(true), 5000)
      return () => clearTimeout(timer)
    } else {
      setHideUI(false)
    }
  }, [navigation.level, isPlaying])

  const showUI = () => setHideUI(false)

  const getCurrentList = useCallback(() => {
    switch (navigation.level) {
      case "artists":
        return library
      case "albums":
        return navigation.selectedArtist?.albums || []
      case "songs":
        return navigation.selectedAlbum?.songs || []
      default:
        return []
    }
  }, [library, navigation.level, navigation.selectedArtist, navigation.selectedAlbum])

  const handleSelect = () => {
    playClick()
    trackButtonPress("select", deviceName)
    showUI()
    if (navigation.level === "nowPlaying") {
      setIsPlaying((prev) => !prev)
      return
    }
    const currentList = getCurrentList()
    if (navigation.level === "artists") {
      const artist = currentList[selectedIndex] as Artist
      trackNavigation("artists", artist.name, deviceName)
      setNavigation({ level: "albums", selectedArtist: artist, selectedAlbum: null, selectedSong: null })
      setSelectedIndex(0)
    } else if (navigation.level === "albums") {
      const album = currentList[selectedIndex] as Album
      trackNavigation("albums", album.name, deviceName)
      setNavigation({ ...navigation, level: "songs", selectedAlbum: album, selectedSong: null })
      setSelectedIndex(0)
    } else if (navigation.level === "songs") {
      const song = currentList[selectedIndex] as Song
      trackNavigation("songs", song.title, deviceName)
      trackSongPlay(navigation.selectedArtist?.name || "Unknown", navigation.selectedAlbum?.name || "Unknown", song.title, deviceName)
      setNavigation({ ...navigation, level: "nowPlaying", selectedSong: song })
      setIsPlaying(true)
    }
  }

  const handleMenu = () => {
    playClick()
    trackButtonPress("menu", deviceName)
    showUI()
    if (navigation.level === "nowPlaying") {
      trackMenuBack("nowPlaying", "songs", deviceName)
      setNavigation({ level: "songs", selectedArtist: navigation.selectedArtist, selectedAlbum: navigation.selectedAlbum, selectedSong: navigation.selectedSong })
      const songs = navigation.selectedAlbum?.songs || []
      const idx = songs.findIndex((s) => s.id === navigation.selectedSong?.id)
      setSelectedIndex(idx >= 0 ? idx : 0)
    } else if (navigation.level === "songs") {
      trackMenuBack("songs", "albums", deviceName)
      const currentAlbum = navigation.selectedAlbum
      setNavigation({ level: "albums", selectedArtist: navigation.selectedArtist, selectedAlbum: null, selectedSong: null })
      const albums = navigation.selectedArtist?.albums || []
      const idx = albums.findIndex((a) => a.name === currentAlbum?.name)
      setSelectedIndex(idx >= 0 ? idx : 0)
    } else if (navigation.level === "albums") {
      trackMenuBack("albums", "artists", deviceName)
      setNavigation({ level: "artists", selectedArtist: null, selectedAlbum: null, selectedSong: null })
      const idx = library.findIndex((a) => a.name === navigation.selectedArtist?.name)
      setSelectedIndex(idx >= 0 ? idx : 0)
    }
  }

  const handleScrollUp = () => {
    showUI()
    if (navigation.level !== "nowPlaying") setSelectedIndex((prev) => Math.max(0, prev - 1))
  }

  const handleScrollDown = () => {
    showUI()
    if (navigation.level !== "nowPlaying") {
      const currentList = getCurrentList()
      setSelectedIndex((prev) => Math.min(currentList.length - 1, prev + 1))
    }
  }

  const handleNext = () => {
    playClick()
    trackButtonPress("next", deviceName)
    showUI()
    if (navigation.level === "nowPlaying") {
      advanceToNext()
    }
  }

  const handlePrevious = () => {
    playClick()
    trackButtonPress("previous", deviceName)
    showUI()
    if (navigation.level === "nowPlaying") {
      advanceToPrevious()
    }
  }

  const handlePlayPause = () => {
    playClick()
    trackButtonPress("play_pause", deviceName)
    showUI()
    if (navigation.level === "nowPlaying") {
      if (navigation.selectedSong) {
        if (isPlaying) {
          trackSongPause(navigation.selectedArtist?.name || "Unknown", navigation.selectedAlbum?.name || "Unknown", navigation.selectedSong.title, deviceName)
        } else {
          trackSongPlay(navigation.selectedArtist?.name || "Unknown", navigation.selectedAlbum?.name || "Unknown", navigation.selectedSong.title, deviceName)
        }
      }
      setIsPlaying((prev) => !prev)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    showUI()
    const finalVolume = Math.max(0, Math.min(100, newVolume))
    trackVolumeChange(finalVolume, deviceName)
    setVolume(finalVolume)
  }

  const isInMenu = navigation.level !== "nowPlaying"

  return (
    <div className="relative z-10 flex items-center justify-center">
      {/* Animated outer glow - Solana gradient pulse */}
      <div className="absolute w-[410px] md:w-[316px] lg:w-[410px] h-[660px] md:h-[508px] lg:h-[660px] rounded-[48px] md:rounded-[37px] lg:rounded-[48px] solana-glow-pulse" />

      {/* Neon edge ring */}
      <div
        className="absolute w-[386px] md:w-[298px] lg:w-[386px] h-[626px] md:h-[482px] lg:h-[626px] rounded-[42px] md:rounded-[32px] lg:rounded-[42px]"
        style={{
          background: "linear-gradient(135deg, #9945FF, #14F195, #9945FF, #14F195)",
          backgroundSize: "300% 300%",
          animation: "gradient-shift 4s ease infinite",
          padding: "2.5px",
          filter: "drop-shadow(0 0 12px rgba(153, 69, 255, 0.6)) drop-shadow(0 0 24px rgba(20, 241, 149, 0.3))",
        }}
      >
        <div className="w-full h-full rounded-[40px] md:rounded-[30px] lg:rounded-[40px] bg-[#0a0a0f]" />
      </div>

      {/* iPod Body */}
      <div
        className="relative w-[380px] md:w-[293px] lg:w-[380px] h-[620px] md:h-[477px] lg:h-[620px] rounded-[40px] md:rounded-[31px] lg:rounded-[40px] overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #121218 0%, #0a0a10 40%, #08080e 60%, #0e0e16 100%)",
          boxShadow: `
            0 25px 80px rgba(153, 69, 255, 0.25),
            0 10px 40px rgba(20, 241, 149, 0.1),
            0 0 0 1px rgba(153, 69, 255, 0.15) inset,
            0 1px 0 rgba(255, 255, 255, 0.04) inset
          `,
        }}
      >
        {/* Holographic sheen layer */}
        <div
          className="absolute inset-0 pointer-events-none rounded-[40px] md:rounded-[31px] lg:rounded-[40px] solana-holographic"
          style={{
            background: `
              linear-gradient(
                135deg,
                transparent 0%,
                rgba(153, 69, 255, 0.06) 20%,
                rgba(20, 241, 149, 0.04) 35%,
                transparent 50%,
                rgba(20, 241, 149, 0.06) 65%,
                rgba(153, 69, 255, 0.04) 80%,
                transparent 100%
              )
            `,
          }}
        />

        {/* Top accent bar - Solana gradient */}
        <div className="absolute top-0 left-0 right-0 h-[1px]">
          <div
            className="w-full h-full"
            style={{
              background: "linear-gradient(90deg, transparent, #9945FF, #14F195, #9945FF, transparent)",
            }}
          />
        </div>

        {/* Solana logo mark */}
        <div className="absolute top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
          <svg
            width="16"
            height="13"
            viewBox="0 0 397.7 311.7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ filter: "drop-shadow(0 0 8px rgba(153, 69, 255, 0.9)) drop-shadow(0 0 16px rgba(20, 241, 149, 0.6))" }}
          >
            <linearGradient id="sol-grad-1" x1="360.879" y1="351.455" x2="141.213" y2="-69.294" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 -1 0 314)">
              <stop offset="0" stopColor="#14F195"/>
              <stop offset="1" stopColor="#9945FF"/>
            </linearGradient>
            <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" fill="url(#sol-grad-1)"/>
            <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" fill="url(#sol-grad-1)"/>
            <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" fill="url(#sol-grad-1)"/>
          </svg>
          <span
            className="text-[10px] font-bold tracking-[0.25em] uppercase"
            style={{
              background: "linear-gradient(90deg, #9945FF, #14F195)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 10px rgba(153, 69, 255, 0.7)) drop-shadow(0 0 20px rgba(20, 241, 149, 0.4))",
            }}
          >
            SOLANA
          </span>
        </div>

        {/* Screen Area */}
        <div className="absolute top-10 md:top-8 lg:top-10 left-1/2 -translate-x-1/2 w-[320px] md:w-[246px] lg:w-[320px] h-[240px] md:h-[185px] lg:h-[240px]">
          {/* Screen neon border */}
          <div
            className="absolute -inset-[1.5px] rounded-[18px] md:rounded-[14px] lg:rounded-[18px]"
            style={{
              background: "linear-gradient(135deg, rgba(153,69,255,0.4), rgba(20,241,149,0.2), rgba(153,69,255,0.3))",
            }}
          />
          {/* Screen bezel */}
          <div
            className="absolute inset-0 rounded-2xl md:rounded-xl lg:rounded-2xl"
            style={{
              background: "linear-gradient(180deg, #06060c, #030308, #06060c)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.8), 0 0 0 1px rgba(153,69,255,0.08)",
            }}
          >
            {powerState === "off" && (
              <div className="absolute inset-[3px] md:inset-[2px] lg:inset-[3px] bg-black rounded-[14px] md:rounded-[11px] lg:rounded-[14px]" />
            )}
            {powerState === "booting" && (
              <div className="absolute inset-[3px] md:inset-[2px] lg:inset-[3px] bg-black rounded-[14px] md:rounded-[11px] lg:rounded-[14px] overflow-hidden">
                <BootLogoDisplay phase={bootPhase} />
              </div>
            )}
            {powerState === "on" && (
              <div
                className="absolute inset-[3px] md:inset-[2px] lg:inset-[3px] rounded-[14px] md:rounded-[11px] lg:rounded-[14px] overflow-hidden"
                style={{
                  background: "linear-gradient(180deg, #e8e0f5, #f0eaf8, #dcd4eb)",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3) inset, 0 -1px 0 rgba(255,255,255,0.5) inset",
                }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-[60px] md:h-[46px] lg:h-[60px] pointer-events-none z-10"
                  style={{
                    background: "linear-gradient(180deg, rgba(153,69,255,0.12), transparent)",
                  }}
                />
                <IPodDisplay
                  key={navigation.level}
                  navigation={navigation}
                  selectedIndex={selectedIndex}
                  isPlaying={isPlaying}
                  volume={volume}
                  hideUI={hideUI}
                />
              </div>
            )}
          </div>
        </div>

        {/* Click Wheel */}
        <div className="absolute bottom-12 md:bottom-[37px] lg:bottom-12 left-1/2 -translate-x-1/2">
          <SolanaClickWheel
            onNext={handleNext}
            onPrevious={handlePrevious}
            onPlayPause={handlePlayPause}
            onMenu={handleMenu}
            onSelect={handleSelect}
            onVolumeChange={handleVolumeChange}
            onScrollUp={handleScrollUp}
            onScrollDown={handleScrollDown}
            volume={volume}
            showPlaylist={isInMenu}
            isPlaying={isPlaying}
            onPlayPauseLongPress={powerState === "off" ? onPowerOnRequest : undefined}
          />
        </div>

        {/* Bottom accent bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[1.5px]">
          <div
            className="w-full h-full"
            style={{
              background: "linear-gradient(90deg, transparent, #14F195, #9945FF, #14F195, transparent)",
              opacity: 0.7,
              filter: "drop-shadow(0 0 6px rgba(20, 241, 149, 0.5))",
            }}
          />
        </div>
      </div>
    </div>
  )
}
