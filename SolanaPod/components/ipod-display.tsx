"use client"

import { useEffect, useRef, useState } from "react"
import { useMusicPlayback } from "@/contexts/music-playback-context"
import { getSongAudioUrl, type Artist, type Album, type Song } from "@/lib/music-library"
import { useIsMobile } from "@/hooks/use-mobile"
import { Shuffle, Repeat, Repeat1 } from "lucide-react"

type NavigationLevel = "artists" | "albums" | "songs" | "nowPlaying"

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
  const {
    library,
    playerRef,
    shuffle,
    setShuffle,
    repeat,
    cycleRepeat,
    directPlaybackCurrentTime,
    directPlaybackDuration,
    seekDirectPlayback,
  } = useMusicPlayback()
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

    // Web: use YouTube player time only when not using direct audio
    const useDirect = navigation.selectedSong && getSongAudioUrl(navigation.selectedSong)
    if (useDirect) {
      return
    }
    const interval = setInterval(() => {
      if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
        setCurrentTime(playerRef.current.getCurrentTime())
        setDuration(playerRef.current.getDuration())
      }
    }, 100)
    return () => clearInterval(interval)
  }, [playerRef, navigation.selectedSong, isPlaying])

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      })
    }
  }, [selectedIndex])

  const formatTime = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds))
    const mins = Math.floor(s / 60)
    const secs = s % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  if (navigation.level === "artists") {
    return (
      <div className="w-full h-full bg-gradient-to-b from-[#fafafa] to-[#f0f0f2] p-3 overflow-hidden">
        <div className="border-b border-gray-300 pb-1 mb-2 shadow-[0_1px_0_rgba(255,255,255,0.8)]">
          <h2 className="text-xs font-bold text-black">Artists</h2>
        </div>
        <div className="space-y-0.5 overflow-y-auto h-[200px] scrollbar-hide pointer-events-none">
          {library.map((artist, index) => (
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
        </div>
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
      <div className="w-full h-full bg-gradient-to-b from-[#f5f5f7] to-[#e8e8ec] relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[#eeeef2] to-[#f5f5f7] border-b border-gray-200 px-3 py-1 z-10 shadow-sm">
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

        <div className="absolute inset-0 pt-8 pb-14 px-4 flex items-end justify-start">
          <div className="w-full flex items-end gap-3 pb-2">
            <div className="flex-shrink-0">
              {navigation.selectedAlbum?.coverUrl ? (
                <img
                  src={navigation.selectedAlbum.coverUrl || "/placeholder.svg"}
                  alt={navigation.selectedAlbum.name}
                  onError={(e) => {
                    e.currentTarget.src = "/cd-fallback.png"
                  }}
                  className="w-32 h-32 object-cover rounded-lg shadow-md border border-gray-100"
                />
              ) : (
                <div className="w-32 h-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-md border border-gray-100"></div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1">
              <div className="text-sm font-bold text-gray-900 truncate leading-tight">{navigation.selectedSong.title}</div>
              <div className="text-xs text-gray-600 truncate mt-0.5">{navigation.selectedArtist?.name}</div>
              <div className="text-xs text-gray-500 truncate">{navigation.selectedAlbum?.name}</div>

              {navigation.selectedAlbum?.year && (
                <div className="text-xs text-gray-500 mt-1">{navigation.selectedAlbum.year}</div>
              )}

              <div className="text-xs font-medium text-gray-600 mt-1">
                {currentSongIndex + 1} of {totalSongs}
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-3 py-1 bg-[#fafafb] border-t border-gray-100 z-10 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setShuffle(!shuffle)}
              className={`p-0.5 rounded transition-colors ${shuffle ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title={shuffle ? "Shuffle on" : "Shuffle off"}
              aria-label={shuffle ? "Shuffle on" : "Shuffle off"}
            >
              <Shuffle size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`p-0.5 rounded transition-colors ${repeat !== "off" ? "text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
              title={repeat === "off" ? "Repeat off" : repeat === "one" ? "Repeat one" : "Repeat all"}
              aria-label={`Repeat ${repeat}`}
            >
              {repeat === "one" ? (
                <Repeat1 size={12} strokeWidth={2.5} />
              ) : (
                <Repeat size={12} strokeWidth={2.5} />
              )}
            </button>
          </div>
          {(() => {
            const song = navigation.selectedSong
            const useDirect = song && getSongAudioUrl(song)
            const time = useDirect ? directPlaybackCurrentTime : currentTime
            const dur = useDirect ? directPlaybackDuration : duration
            const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
              if (!useDirect || dur <= 0) return
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const pct = Math.max(0, Math.min(1, x / rect.width))
              seekDirectPlayback(pct * dur)
            }
            return (
              <div className="flex items-center gap-2">
                <div className="text-[10px] text-black font-medium">{formatTime(time)}</div>
                <div
                  className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner cursor-pointer"
                  onClick={handleProgressClick}
                  role="progressbar"
                  aria-valuenow={dur > 0 ? (time / dur) * 100 : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-100"
                    style={{ width: `${dur > 0 ? (time / dur) * 100 : 0}%` }}
                  />
                </div>
                <div className="text-[10px] text-black font-medium">{formatTime(Math.max(0, dur - time))}</div>
              </div>
            )
          })()}
        </div>
      </div>
    )
  }

  return null
}
