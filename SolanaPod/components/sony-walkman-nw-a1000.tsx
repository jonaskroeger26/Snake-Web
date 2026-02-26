"use client"

import { useMusicPlayback } from "@/contexts/music-playback-context"
import { musicLibrary, type Artist, type Album, type Song } from "@/lib/music-library"
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Play, Pause, Music, User, Disc, Hash } from "lucide-react"
import { useState, useEffect } from "react"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"
import {
  trackSongPlay,
  trackSongPause,
  trackSongSkip,
  trackNavigation,
  trackMenuBack,
  trackButtonPress,
  trackVolumeChange,
} from "@/lib/analytics"

const getArtistName = (a: Artist | null | undefined) => a?.name ?? (a as any)?.title ?? ""
const getAlbumTitle = (a: Album | null | undefined) => (a as any)?.title ?? (a as any)?.name ?? (a as any)?.album ?? ""
const getSongTitle = (s: Song | null | undefined) => s?.title ?? (s as any)?.name ?? ""
const getSongArtist = (s: Song | null | undefined, artist: Artist | null | undefined) =>
  (s as any)?.artist ?? getArtistName(artist)
const getSongYear = (s: Song | null | undefined, album: Album | null | undefined) =>
  (s as any)?.year ?? (album as any)?.year ?? ""

export function SonyWalkmanNWA1000({
  isActive = true,
  deviceName = "Sony Walkman",
}: { isActive?: boolean; deviceName?: string }) {
  const {
    navigation,
    setNavigation,
    selectedIndex,
    setSelectedIndex,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    playerRef,
  } = useMusicPlayback()
  const { playClick } = useClickWheelSound()

  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [showVolumeIndicator, setShowVolumeIndicator] = useState(false)

  useEffect(() => {
    const rnw = typeof window !== "undefined" && (window as any).ReactNativeWebView

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

    if (!isPlaying || !playerRef.current) return

    const interval = setInterval(() => {
      if (playerRef.current && typeof playerRef.current.getCurrentTime === "function") {
        const time = playerRef.current.getCurrentTime()
        const dur = playerRef.current.getDuration()
        setCurrentTime(time || 0)
        setDuration(dur || 0)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [isPlaying, playerRef, navigation.selectedSong, duration])

  useEffect(() => {
    if (showVolumeIndicator) {
      const timeout = setTimeout(() => {
        setShowVolumeIndicator(false)
      }, 2000)
      return () => clearTimeout(timeout)
    }
  }, [showVolumeIndicator])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getCurrentList = () => {
    switch (navigation.level) {
      case "artists":
        return [...musicLibrary, { name: "Extras", id: "__extras__" }]
      case "extras":
        return [{ name: "Snake", id: "snake" }]
      case "albums":
        return navigation.selectedArtist?.albums || []
      case "songs":
        return navigation.selectedAlbum?.songs || []
      default:
        return []
    }
  }

  const handleUpPress = () => {
    playClick()
    trackButtonPress("up", deviceName)
    console.log("[v0] Up button pressed, current level:", navigation.level, "selectedIndex:", selectedIndex)
    if (navigation.level === "nowPlaying") {
      const songs = navigation.selectedAlbum?.songs || []
      const currentSongIndex = songs.findIndex((s) => s === navigation.selectedSong)
      console.log("[v0] In nowPlaying, currentSongIndex:", currentSongIndex)
      if (currentSongIndex > 0) {
        const prevSong = songs[currentSongIndex - 1]
        trackSongSkip(
          "previous",
          navigation.selectedArtist?.name || "Unknown",
          navigation.selectedAlbum?.title || (navigation.selectedAlbum as any)?.name || "Unknown",
          prevSong.title,
          deviceName,
        )
        setNavigation({
          ...navigation,
          selectedSong: prevSong,
        })
        setIsPlaying(true)
      }
    } else if (navigation.level !== "extrasGame") {
      console.log("[v0] Moving selection up from", selectedIndex, "to", Math.max(0, selectedIndex - 1))
      setSelectedIndex((prev) => Math.max(0, prev - 1))
    }
  }

  const handleDownPress = () => {
    playClick()
    trackButtonPress("down", deviceName)
    if (navigation.level === "nowPlaying") {
      const songs = navigation.selectedAlbum?.songs || []
      const currentSongIndex = songs.findIndex((s) => s === navigation.selectedSong)
      if (currentSongIndex < songs.length - 1) {
        const nextSong = songs[currentSongIndex + 1]
        trackSongSkip(
          "next",
          navigation.selectedArtist?.name || "Unknown",
          navigation.selectedAlbum?.title || (navigation.selectedAlbum as any)?.name || "Unknown",
          nextSong.title,
          deviceName,
        )
        setNavigation({
          ...navigation,
          selectedSong: nextSong,
        })
        setIsPlaying(true)
      }
    } else if (navigation.level !== "extrasGame") {
      const currentList = getCurrentList()
      setSelectedIndex((prev) => Math.min(currentList.length - 1, prev + 1))
    }
  }

  const handleSelectPress = () => {
    playClick()
    trackButtonPress("select", deviceName)
    const currentList = getCurrentList()

    if (navigation.level === "nowPlaying") {
      if (navigation.selectedSong) {
        if (isPlaying) {
          trackSongPause(
            navigation.selectedArtist?.name || "Unknown",
            navigation.selectedAlbum?.title || (navigation.selectedAlbum as any)?.name || "Unknown",
            navigation.selectedSong.title,
            deviceName,
          )
        } else {
          trackSongPlay(
            navigation.selectedArtist?.name || "Unknown",
            navigation.selectedAlbum?.title || (navigation.selectedAlbum as any)?.name || "Unknown",
            navigation.selectedSong.title,
            deviceName,
          )
        }
      }
      setIsPlaying((prev) => !prev)
      return
    }

    if (navigation.level === "artists") {
      const item = currentList[selectedIndex] as Artist & { id?: string }
      if (item?.id === "__extras__") {
        setNavigation({ level: "extras", selectedArtist: null, selectedAlbum: null, selectedSong: null })
        setSelectedIndex(0)
        return
      }
      const artist = item as Artist
      trackNavigation("artists", artist.name, deviceName)
      setNavigation({
        level: "albums",
        selectedArtist: artist,
        selectedAlbum: null,
        selectedSong: null,
      })
      setSelectedIndex(0)
    } else if (navigation.level === "extras") {
      const extra = currentList[selectedIndex] as { id: string; name: string }
      if (extra?.id === "snake") {
        setNavigation({
          level: "extrasGame",
          selectedArtist: null,
          selectedAlbum: null,
          selectedSong: null,
          selectedExtraGame: "snake",
        })
        setSelectedIndex(0)
      }
    } else if (navigation.level === "albums") {
      const album = currentList[selectedIndex] as Album
      trackNavigation("albums", (album as any).title || (album as any).name, deviceName)
      setNavigation({
        ...navigation,
        level: "songs",
        selectedAlbum: album,
        selectedSong: null,
      })
      setSelectedIndex(0)
    } else if (navigation.level === "songs") {
      const song = currentList[selectedIndex] as Song
      trackNavigation("songs", song.title, deviceName)
      trackSongPlay(
        navigation.selectedArtist?.name || "Unknown",
        navigation.selectedAlbum?.title || (navigation.selectedAlbum as any)?.name || "Unknown",
        song.title,
        deviceName,
      )
      setNavigation({
        ...navigation,
        level: "nowPlaying",
        selectedSong: song,
      })
      setIsPlaying(true)
    }
  }

  const handleBackPress = () => {
    playClick()
    trackButtonPress("back", deviceName)
    if (navigation.level === "extrasGame") {
      setNavigation({ level: "extras", selectedArtist: null, selectedAlbum: null, selectedSong: null, selectedExtraGame: null })
      setSelectedIndex(0)
    } else if (navigation.level === "extras") {
      setNavigation({ level: "artists", selectedArtist: null, selectedAlbum: null, selectedSong: null })
      setSelectedIndex(musicLibrary.length)
    } else if (navigation.level === "nowPlaying") {
      trackMenuBack("nowPlaying", "songs", deviceName)
      setNavigation({
        ...navigation,
        level: "songs",
      })
    } else if (navigation.level === "songs") {
      trackMenuBack("songs", "albums", deviceName)
      setNavigation({
        ...navigation,
        level: "albums",
        selectedAlbum: null,
      })
      setSelectedIndex(0)
    } else if (navigation.level === "albums") {
      trackMenuBack("albums", "artists", deviceName)
      setNavigation({
        level: "artists",
        selectedArtist: null,
        selectedAlbum: null,
        selectedSong: null,
      })
      setSelectedIndex(0)
    }
  }

  const handleLeftPress = () => {
    if (navigation.level === "nowPlaying") {
      const songs = navigation.selectedAlbum?.songs || []
      const currentSongIndex = songs.findIndex((s) => s === navigation.selectedSong)
      if (currentSongIndex > 0) {
        setNavigation({
          ...navigation,
          selectedSong: songs[currentSongIndex - 1],
        })
      }
    }
  }

  const handleRightPress = () => {
    if (navigation.level === "nowPlaying") {
      const songs = navigation.selectedAlbum?.songs || []
      const currentSongIndex = songs.findIndex((s) => s === navigation.selectedSong)
      if (currentSongIndex < songs.length - 1) {
        setNavigation({
          ...navigation,
          selectedSong: songs[currentSongIndex + 1],
        })
      }
    }
  }

  const getListItemName = (item: Artist | Album | Song | { name: string; id: string }, level: string): string => {
    if (level === "extras") return (item as { name: string }).name
    if (level === "artists") {
      return getArtistName(item as Artist)
    } else if (level === "albums") {
      return getAlbumTitle(item as Album)
    } else if (level === "songs") {
      return getSongTitle(item as Song)
    }
    return ""
  }

  const getVisibleItems = () => {
    const currentList = getCurrentList()
    const itemsToShow = 6

    let startIndex = Math.max(0, selectedIndex - Math.floor(itemsToShow / 2))

    if (startIndex + itemsToShow > currentList.length) {
      startIndex = Math.max(0, currentList.length - itemsToShow)
    }

    return {
      items: currentList.slice(startIndex, startIndex + itemsToShow),
      startIndex,
    }
  }

  const getScreenTitle = () => {
    switch (navigation.level) {
      case "artists":
        return "Artists"
      case "extras":
        return "Extras"
      case "extrasGame":
        return "Snake"
      case "albums":
        return `${getArtistName(navigation.selectedArtist)} - Albums`
      case "songs":
        return `${getAlbumTitle(navigation.selectedAlbum)}`
      case "nowPlaying":
        return "Now Playing"
      default:
        return "Music"
    }
  }

  const handleVolumeUp = () => {
    playClick()
    const newVolume = Math.min(100, volume + 10)
    setVolume(newVolume)
    setShowVolumeIndicator(true)
    trackVolumeChange(newVolume, deviceName)
  }

  const handleVolumeDown = () => {
    playClick()
    const newVolume = Math.max(0, volume - 10)
    setVolume(newVolume)
    setShowVolumeIndicator(true)
    trackVolumeChange(newVolume, deviceName)
  }

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative w-64 h-[500px] rounded-[3rem] border-4 border-pink-300/50"
        style={{
          background: "linear-gradient(135deg, #f472b6 0%, #ec4899 30%, #db2777 60%, #be185d 100%)",
          boxShadow: `
            0 10px 30px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -2px 10px rgba(0, 0, 0, 0.2)
          `,
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-32 rounded-t-[3rem] opacity-30 pointer-events-none"
          style={{
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, transparent 100%)",
          }}
        />

        <div className="absolute top-4 left-0 right-0 text-center z-10">
          <div
            className="text-pink-100 text-sm font-medium tracking-normal font-rokkitt"
            style={{
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.3)",
            }}
          >
            SONY
          </div>
        </div>

        <div className={`absolute top-12 left-4 right-4 h-80 rounded-lg overflow-hidden ${navigation.level === "extrasGame" ? "pointer-events-auto" : "pointer-events-none"}`}>
          {isActive ? (
            <div className="p-3 h-full flex flex-col text-white font-bitcount text-xs relative z-10">
              {navigation.level === "extrasGame" ? (
                <div className="absolute inset-0 rounded-lg overflow-hidden bg-black z-20 flex items-center justify-center">
                  <div
                    className="absolute left-1/2 top-1/2"
                    style={{
                      width: 800,
                      height: 600,
                      transform: "translate(-50%, -50%) scale(0.35)",
                      transformOrigin: "center center",
                    }}
                  >
                    <iframe
                      src="https://solanasnake.app"
                      title="Solana Snake"
                      className="w-full h-full border-0"
                      style={{ width: 800, height: 600 }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                      allowFullScreen
                    />
                  </div>
                  <button
                    onClick={handleBackPress}
                    className="absolute top-1 left-1 z-30 p-1 rounded bg-black/70 text-white text-[10px]"
                  >
                    Back
                  </button>
                </div>
              ) : (
                <>
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-pink-400/30">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-white/80 rounded-sm flex items-center justify-center">
                    <div
                      className="w-2 h-2 border-l-2 border-l-pink-500 border-y-2 border-y-transparent"
                      style={{ borderLeftWidth: 3 }}
                    />
                  </div>
                  <span className="text-[11px]">
                    {navigation.level === "nowPlaying" ? "Now Playing" : getScreenTitle()}
                  </span>
                </div>
              </div>

              {navigation.level === "nowPlaying" && navigation.selectedSong ? (
                <div className="flex-1 flex flex-col justify-center space-y-2">
                  <div className="flex items-end justify-center gap-[3px] h-[32px] mb-2">
                    {[...Array(7)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-[4px] bg-white rounded-t-sm ${isPlaying ? "animate-pulse" : ""}`}
                        style={{
                          height: isPlaying ? `${30 + Math.random() * 70}%` : "20%",
                          animationDelay: isPlaying ? `${i * 0.1}s` : "0s",
                          animationDuration: isPlaying ? `${0.5 + Math.random() * 0.5}s` : "0s",
                        }}
                      ></div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <Music size={14} className="mt-0.5 flex-shrink-0" />
                      <div className="text-[13px] font-bold leading-tight line-clamp-2">
                        {getSongTitle(navigation.selectedSong)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <User size={14} className="flex-shrink-0" />
                      <div className="text-[12px] opacity-90 truncate">
                        {getSongArtist(navigation.selectedSong, navigation.selectedArtist)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Disc size={14} className="flex-shrink-0" />
                      <div className="text-[11px] opacity-80 truncate">{getAlbumTitle(navigation.selectedAlbum)}</div>
                    </div>

                    {getSongYear(navigation.selectedSong, navigation.selectedAlbum) && (
                      <div className="flex items-center gap-1.5">
                        <Hash size={14} className="flex-shrink-0" />
                        <div className="text-[11px] opacity-80">
                          {getSongYear(navigation.selectedSong, navigation.selectedAlbum)}
                        </div>
                      </div>
                    )}

                    <div className="text-[11px] opacity-70 mt-1">
                      {(() => {
                        const songs = navigation.selectedAlbum?.songs || []
                        const currentIndex = songs.findIndex((s) => s === navigation.selectedSong)
                        return `${currentIndex + 1}/${songs.length}`
                      })()}
                    </div>
                  </div>

                  <div className="w-full mt-3 px-1">
                    <div
                      className="w-full h-1.5 rounded-full overflow-hidden mb-2"
                      style={{
                        background: "rgba(255, 255, 255, 0.2)",
                        boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{
                          width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%",
                          background: "linear-gradient(90deg, #fce7f3 0%, #fbcfe8 100%)",
                          boxShadow: "0 0 4px rgba(255, 255, 255, 0.5)",
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {isPlaying ? (
                          <Pause size={16} fill="white" strokeWidth={0} />
                        ) : (
                          <Play size={16} fill="white" strokeWidth={0} />
                        )}
                        <span className="text-[10px] opacity-70">{formatTime(currentTime)}</span>
                      </div>
                      <span className="text-[10px] opacity-70">{formatTime(duration)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col gap-[2px]">
                  {(() => {
                    const { items, startIndex } = getVisibleItems()
                    return items.map((item, index) => {
                      const actualIndex = startIndex + index
                      return (
                        <div
                          key={actualIndex}
                          className={`px-2 py-1.5 text-[13px] font-bold leading-tight rounded ${
                            actualIndex === selectedIndex ? "bg-white/10" : ""
                          }`}
                        >
                          {getListItemName(item, navigation.level)}
                        </div>
                      )
                    })
                  })()}
                </div>
              )}
                </>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-pink-800 text-2xl font-bitcount tracking-tight">{deviceName}</div>
            </div>
          )}

          {showVolumeIndicator && (
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 z-50 pointer-events-none"
              style={{
                animation: "fadeIn 0.2s ease-in-out",
              }}
            >
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-black/60 backdrop-blur-sm">
                <div className="flex-1 h-2 rounded-full bg-white/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-200"
                    style={{
                      width: `${volume}%`,
                    }}
                  />
                </div>
                <div
                  className="w-4 h-4 rounded-full bg-white border-2 border-white shadow-lg"
                  style={{
                    boxShadow: "0 2px 8px rgba(255, 255, 255, 0.5)",
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <div className="relative w-24 h-24">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(135deg, #db2777 0%, #be185d 50%, #9f1239 100%)",
                boxShadow: `
                  0 6px 16px rgba(0, 0, 0, 0.4),
                  inset 0 2px 4px rgba(255, 255, 255, 0.2),
                  inset 0 -2px 8px rgba(0, 0, 0, 0.3)
                `,
                border: "2px solid rgba(219, 39, 119, 0.4)",
              }}
            />

            <div
              className="absolute inset-2 rounded-full pointer-events-none"
              style={{
                background: "linear-gradient(135deg, #9f1239 0%, #be185d 100%)",
                boxShadow: `
                  inset 0 2px 8px rgba(0, 0, 0, 0.5),
                  inset 0 -1px 2px rgba(255, 255, 255, 0.1)
                `,
              }}
            />

            <button
              onClick={handleUpPress}
              className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center text-white hover:text-pink-200 transition-all active:scale-95 z-40 pointer-events-auto"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={handleDownPress}
              className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-8 flex items-center justify-center text-white hover:text-pink-200 transition-all active:scale-95 z-40 pointer-events-auto"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              <ChevronDown className="w-5 h-5" />
            </button>
            <button
              onClick={handleLeftPress}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white hover:text-pink-200 transition-all active:scale-95 z-40 pointer-events-auto"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleRightPress}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-white hover:text-pink-200 transition-all active:scale-95 z-40 pointer-events-auto"
              style={{
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))",
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <button
              onClick={handleSelectPress}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center text-white transition-all active:scale-95 z-40 pointer-events-auto"
              style={{
                background: "linear-gradient(135deg, #ec4899 0%, #db2777 50%, #be185d 100%)",
                boxShadow: `
                  0 4px 12px rgba(0, 0, 0, 0.4),
                  inset 0 1px 2px rgba(255, 255, 255, 0.3),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.2)
                `,
                border: "2px solid rgba(236, 72, 153, 0.5)",
              }}
            >
              {navigation.level === "nowPlaying" ? (
                isPlaying ? (
                  <div className="flex gap-0.5">
                    <div
                      className="w-1 h-3 bg-white rounded-sm"
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))" }}
                    />
                    <div
                      className="w-1 h-3 bg-white rounded-sm"
                      style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))" }}
                    />
                  </div>
                ) : (
                  <div
                    className="w-0 h-0 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5"
                    style={{ filter: "drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3))" }}
                  />
                )
              ) : (
                <div className="text-[10px] font-bold" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)" }}>
                  OK
                </div>
              )}
            </button>
          </div>
        </div>

        <div className="absolute bottom-20 left-8 z-40">
          <button
            onClick={handleBackPress}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #db2777 0%, #be185d 50%, #9f1239 100%)",
              boxShadow: `
                0 6px 16px rgba(0, 0, 0, 0.4),
                inset 0 2px 4px rgba(255, 255, 255, 0.2),
                inset 0 -2px 8px rgba(0, 0, 0, 0.3)
              `,
              border: "2px solid rgba(219, 39, 119, 0.4)",
            }}
          >
            <span className="text-[8px] text-white font-bold" style={{ textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)" }}>
              BACK
            </span>
          </button>
        </div>

        <div className="absolute bottom-6 left-0 right-0 text-center"></div>

        <button
          onClick={handleVolumeUp}
          className="absolute right-0 top-32 w-1 h-12 rounded-l-sm cursor-pointer hover:w-1.5 transition-all active:scale-95 z-40"
          style={{
            background: "linear-gradient(90deg, #9f1239 0%, #be185d 100%)",
            boxShadow: "inset 2px 0 4px rgba(0, 0, 0, 0.5), -1px 0 2px rgba(0, 0, 0, 0.3)",
          }}
          title="Volume Up"
        />
        <button
          onClick={handleVolumeDown}
          className="absolute right-0 top-48 w-1 h-8 rounded-l-sm cursor-pointer hover:w-1.5 transition-all active:scale-95 z-40"
          style={{
            background: "linear-gradient(90deg, #9f1239 0%, #be185d 100%)",
            boxShadow: "inset 2px 0 4px rgba(0, 0, 0, 0.5), -1px 0 2px rgba(0, 0, 0, 0.3)",
          }}
          title="Volume Down"
        />
      </div>
    </div>
  )
}
