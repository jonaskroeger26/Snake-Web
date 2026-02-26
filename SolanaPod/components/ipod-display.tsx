"use client"

import { useEffect, useRef, useState } from "react"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { musicLibrary, type Artist, type Album, type Song } from "@/lib/music-library"
import { useIsMobile } from "@/hooks/use-mobile"
import { SnakeEmbedded } from "@/components/snake-embedded"

type NavigationLevel = "artists" | "albums" | "songs" | "nowPlaying" | "extras" | "extrasGame"

const EXTRAS_ITEMS = [{ id: "snake", name: "Snake", url: "https://solanasnake.app" }] as const

interface NavigationState {
  level: NavigationLevel
  selectedArtist: Artist | null
  selectedAlbum: Album | null
  selectedSong: Song | null
}

interface IPodDisplayProps {
  navigation: NavigationState
  selectedIndex: number
  isPlaying: boolean
  volume: number
  hideUI?: boolean
}

export function IPodDisplay({ navigation, selectedIndex, isPlaying, volume, hideUI = false }: IPodDisplayProps) {
  const { playerRef } = useMusicPlayback()
  const selectedItemRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const isMobile = useIsMobile()

  useEffect(() => {
    const rnw = typeof window !== "undefined" && (window as any).ReactNativeWebView

    // Native app (React Native WebView): YouTube isn't driving playback, so approximate progress locally
    if (rnw) {
      const parseDuration = (value: string | undefined | null): number => {
        if (!value) return 0
        const parts = value.split(":").map((p) => Number(p))
        if (parts.some((n) => Number.isNaN(n))) return 0
        if (parts.length === 2) return parts[0] * 60 + parts[1]
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
        return 0
      }

      // Reset when song changes
      setCurrentTime(0)
      setDuration(parseDuration((navigation.selectedSong as any)?.duration))

      const interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (!isPlaying || duration <= 0) return prev
          const next = prev + 0.5
          return next > duration ? duration : next
        })
      }, 500)

      return () => clearInterval(interval)
    }

    // Web: use YouTube player time
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime && playerRef.current.getDuration) {
        const time = playerRef.current.getCurrentTime()
        const dur = playerRef.current.getDuration()
        setCurrentTime(time)
        setDuration(dur)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [playerRef, navigation.selectedSong, isPlaying, duration])

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    }
  }, [selectedIndex])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (navigation.level === "artists") {
    const artistsWithExtrasCount = musicLibrary.length + 1
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f2] p-3 overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-2 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <h2 className="text-xs font-bold text-black">Artists</h2>
        </div>
        <div className="space-y-0.5 overflow-y-auto h-[200px] scrollbar-hide pointer-events-none">
          {musicLibrary.map((artist, index) => (
            <div
              key={artist.name}
              ref={index === selectedIndex ? selectedItemRef : null}
              className={`text-[11px] px-2 py-1.5 flex items-center gap-2 rounded ${
                index === selectedIndex
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                  : "text-black"
              }`}
            >
              {artist.photoUrl && (
                <img
                  src={artist.photoUrl || "/placeholder.svg"}
                  alt={artist.name}
                  onError={(e) => {
                    e.currentTarget.src = "/cd-fallback.png"
                  }}
                  className="w-6 h-6 rounded object-cover flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                />
              )}
              <div className="font-semibold truncate flex-1">{artist.name}</div>
            </div>
          ))}
          <div
            ref={artistsWithExtrasCount - 1 === selectedIndex ? selectedItemRef : null}
            className={`text-[11px] px-2 py-1.5 flex items-center gap-2 rounded ${
              artistsWithExtrasCount - 1 === selectedIndex
                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                : "text-black"
            }`}
          >
            <div className="font-semibold truncate flex-1">Extras</div>
          </div>
        </div>
      </div>
    )
  }

  if (navigation.level === "extras") {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f2] p-3 overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-2 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <h2 className="text-xs font-bold text-black">Extras</h2>
        </div>
        <div className="space-y-0.5 overflow-y-auto h-[200px] scrollbar-hide pointer-events-none">
          {EXTRAS_ITEMS.map((item, index) => (
            <div
              key={item.id}
              ref={index === selectedIndex ? selectedItemRef : null}
              className={`text-[11px] px-2 py-1.5 flex items-center gap-2 rounded ${
                index === selectedIndex
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                  : "text-black"
              }`}
            >
              <div className="font-semibold truncate flex-1">{item.name}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (navigation.level === "extrasGame" && navigation.selectedExtraGame === "snake") {
    return (
      <div className="absolute inset-0 w-full h-full rounded-[14px] md:rounded-[11px] lg:rounded-[14px] overflow-hidden">
        <SnakeEmbedded />
      </div>
    )
  }

  if (navigation.level === "albums" && navigation.selectedArtist) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f2] p-3 overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-2 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <h2 className="text-xs font-bold text-black">{navigation.selectedArtist.name}</h2>
        </div>
        <div className="space-y-0.5 overflow-y-auto h-[200px] scrollbar-hide pointer-events-none">
          {navigation.selectedArtist.albums.map((album, index) => (
            <div
              key={`${navigation.selectedArtist.name}-${album.name}-${index}`}
              ref={index === selectedIndex ? selectedItemRef : null}
              className={`text-[11px] px-2 py-1.5 flex items-center gap-2 rounded ${
                index === selectedIndex
                  ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                  : "text-black"
              }`}
            >
              {album.coverUrl && (
                <img
                  src={album.coverUrl || "/placeholder.svg"}
                  alt={album.name}
                  onError={(e) => {
                    e.currentTarget.src = "/cd-fallback.png"
                  }}
                  className="w-8 h-8 rounded object-cover flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.2)]"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{album.name}</div>
                {album.year && <div className="text-[9px] opacity-70">{album.year}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (navigation.level === "songs" && navigation.selectedAlbum) {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f2] p-3 overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-2 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <h2 className="text-xs font-bold text-black truncate">{navigation.selectedAlbum.name}</h2>
          {navigation.selectedArtist && (
            <div className="text-[10px] text-gray-600 truncate">{navigation.selectedArtist.name}</div>
          )}
        </div>
        <div className="space-y-0.5 overflow-y-auto h-[190px] scrollbar-hide pointer-events-none">
          {navigation.selectedAlbum.songs.map((song, index) => {
            const isCurrentlyPlaying = navigation.selectedSong?.id === song.id
            const isCursorSelected = index === selectedIndex

            return (
              <div
                key={`${navigation.selectedAlbum.name}-${song.id}-${index}`}
                ref={index === selectedIndex ? selectedItemRef : null}
                className={`text-[11px] px-2 py-1.5 rounded flex items-center gap-2 ${
                  isCursorSelected
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                    : "text-black"
                }`}
              >
                {isCurrentlyPlaying && !isCursorSelected && <div className="text-blue-500 text-[10px]">▶</div>}
                <div className="font-semibold truncate flex-1">{song.title}</div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (navigation.level === "nowPlaying" && navigation.selectedSong) {
    const currentSongIndex = navigation.selectedAlbum?.songs.findIndex((s) => s.id === navigation.selectedSong?.id) ?? 0
    const totalSongs = navigation.selectedAlbum?.songs.length ?? 0

    return (
      <div className="w-full h-full bg-gradient-to-b from-white to-gray-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-gray-100 to-white border-b border-gray-300 px-3 py-1 z-10 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-black">Now Playing</span>
            <div className="flex items-center gap-1">
              <div className="text-[10px] text-black">{isPlaying ? "▶" : "❚❚"}</div>
              {!isMobile && (
                <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-150"
                    style={{ width: `${volume}%` }}
                  ></div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute inset-0 pt-8 pb-12 px-4 flex items-end justify-start">
          <div className="w-full flex items-end gap-3 pb-2">
            <div className="flex-shrink-0">
              {navigation.selectedAlbum?.coverUrl ? (
                <img
                  src={navigation.selectedAlbum.coverUrl || "/placeholder.svg"}
                  alt={navigation.selectedAlbum.name}
                  onError={(e) => {
                    e.currentTarget.src = "/cd-fallback.png"
                  }}
                  className="w-32 h-32 object-cover rounded shadow-lg border border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-gray-300 to-gray-400 rounded shadow-lg border border-gray-200"></div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="text-sm font-bold text-black truncate leading-tight">{navigation.selectedSong.title}</div>
              <div className="text-xs text-gray-700 truncate mt-0.5">{navigation.selectedArtist?.name}</div>
              <div className="text-xs text-gray-600 truncate">{navigation.selectedAlbum?.name}</div>

              {navigation.selectedAlbum?.year && (
                <div className="text-xs text-gray-600 mt-1">{navigation.selectedAlbum.year}</div>
              )}

              <div className="text-xs font-semibold text-black mt-1">
                {currentSongIndex + 1} of {totalSongs}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-2 bg-white border-t border-gray-200 z-10">
          <div className="flex items-center gap-2">
            <div className="text-[10px] text-black font-medium">{formatTime(currentTime)}</div>
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-100"
                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-black font-medium">-{formatTime(duration - currentTime)}</div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
