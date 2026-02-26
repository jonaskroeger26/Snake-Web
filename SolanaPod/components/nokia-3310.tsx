"use client"

import { useMusicPlayback } from "@/contexts/music-playback-context"
import { musicLibrary, type Artist, type Album, type Song } from "@/lib/music-library"
import { ChevronLeft, ChevronDown, ChevronUp, Play, Pause } from "lucide-react"
import { useClickWheelSound } from "@/hooks/use-click-wheel-sound"
import {
  trackSongPlay,
  trackSongPause,
  trackSongSkip,
  trackNavigation,
  trackMenuBack,
  trackButtonPress,
} from "@/lib/analytics"

const getArtistName = (a: Artist | null | undefined) => a?.name ?? (a as any)?.title ?? ""
const getAlbumTitle = (a: Album | null | undefined) => (a as any)?.title ?? (a as any)?.name ?? (a as any)?.album ?? ""
const getSongTitle = (s: Song | null | undefined) => s?.title ?? (s as any)?.name ?? ""
const getSongArtist = (s: Song | null | undefined, artist: Artist | null | undefined) =>
  (s as any)?.artist ?? getArtistName(artist)
const getSongYear = (s: Song | null | undefined, album: Album | null | undefined) =>
  (s as any)?.year ?? (album as any)?.year ?? ""

export function Nokia3310({ isActive = true, deviceName = "Nokia 3310" }: { isActive?: boolean; deviceName?: string }) {
  const { navigation, setNavigation, selectedIndex, setSelectedIndex, isPlaying, setIsPlaying } = useMusicPlayback()
  const { playClick } = useClickWheelSound()

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
    if (navigation.level === "nowPlaying") {
      const songs = navigation.selectedAlbum?.songs || []
      const currentSongIndex = songs.findIndex((s) => s === navigation.selectedSong)
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
      }
    } else if (navigation.level !== "extrasGame") {
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
    const itemsToShow = 4

    // Calculate start index to keep selected item visible
    let startIndex = Math.max(0, selectedIndex - Math.floor(itemsToShow / 2))

    // Adjust if we're near the end of the list
    if (startIndex + itemsToShow > currentList.length) {
      startIndex = Math.max(0, currentList.length - itemsToShow)
    }

    return {
      items: currentList.slice(startIndex, startIndex + itemsToShow),
      startIndex,
    }
  }

  return (
    <div className="relative z-10 flex items-center justify-center">
      {/* Outer glow */}
      <div className="absolute w-[260px] h-[540px] bg-black/30 rounded-[70px] blur-xl"></div>

      {/* Silver bezel wrapper for 3D metallic frame effect */}
      <div className="relative w-[240px] h-[520px] bg-gradient-to-br from-[#c8d0d8] via-[#a8b0b8] to-[#8890a0] rounded-[60px] shadow-[0_20px_50px_rgba(0,0,0,0.7)] p-[6px]">
        {/* Metallic bezel highlights */}
        <div className="absolute inset-0 rounded-[60px] bg-gradient-to-br from-white/40 via-transparent to-black/20 pointer-events-none"></div>
        <div className="absolute top-0 left-[20%] right-[20%] h-[100px] bg-gradient-to-b from-white/50 to-transparent rounded-t-[60px] pointer-events-none blur-sm"></div>

        {/* Nokia 3310 Body with enhanced 3D gradients */}
        <div className="relative w-full h-full bg-gradient-to-br from-[#4a5a6f] via-[#2c3e50] to-[#1a2530] rounded-[50px] shadow-[0_8px_20px_rgba(0,0,0,0.8)_inset,0_2px_4px_rgba(255,255,255,0.1)] border-[1px] border-[#1a252f]">
          <div className="absolute top-0 left-0 right-0 h-[250px] bg-gradient-to-b from-white/12 via-white/4 to-transparent rounded-t-[50px] pointer-events-none"></div>

          {/* Side highlights for cylindrical depth */}
          <div className="absolute top-[50px] bottom-[50px] left-0 w-[30px] bg-gradient-to-r from-white/8 to-transparent rounded-l-[50px] pointer-events-none"></div>
          <div className="absolute top-[50px] bottom-[50px] right-0 w-[30px] bg-gradient-to-l from-black/20 to-transparent rounded-r-[50px] pointer-events-none"></div>

          {/* Speaker grille dots at very top with depth */}
          <div className="absolute top-[18px] left-1/2 -translate-x-1/2 flex gap-[4px]">
            {[...Array(7)].map((_, i) => (
              <div
                key={i}
                className="w-[3px] h-[3px] bg-[#0a0f14] rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.8)_inset,0_0.5px_0_rgba(255,255,255,0.1)]"
              ></div>
            ))}
          </div>

          {/* Nokia branding with embossed effect */}
          <div className="absolute top-[36px] left-1/2 -translate-x-1/2 text-[#9aa5b0] text-[13px] font-bold tracking-[0.15em] [text-shadow:0_1px_2px_rgba(0,0,0,0.8),0_-0.5px_0_rgba(255,255,255,0.15)]">
            NOKIA
          </div>

          <div className="absolute top-[62px] left-1/2 -translate-x-1/2 w-[180px] h-[165px] bg-gradient-to-br from-[#2a3540] via-[#1a252f] to-[#0f1419] rounded-[10px] shadow-[0_5px_15px_rgba(0,0,0,0.9)_inset,0_1px_0_rgba(255,255,255,0.05)] p-[3px]">
            {/* Inner metallic rim */}
            <div className="w-full h-full bg-gradient-to-br from-[#3a4550] to-[#1a252f] rounded-[8px] p-[3px] shadow-[0_2px_4px_rgba(0,0,0,0.6)_inset]">
              {isActive ? (
                <>
                  {/* Monochrome LCD Screen with glass effect */}
                  <div className="w-full h-full bg-[#a4b494] rounded-[6px] relative overflow-hidden shadow-[0_0_15px_rgba(164,180,148,0.4),0_2px_4px_rgba(0,0,0,0.3)_inset]">
                    {/* Glass reflection overlay */}
                    <div className="absolute top-0 left-0 right-[40%] h-[60%] bg-gradient-to-br from-white/15 to-transparent rounded-tl-[6px] pointer-events-none"></div>

                    {/* LCD pixel grid texture */}
                    <div
                      className="absolute inset-0 opacity-[0.08]"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(0,0,0,0.15) 1px, rgba(0,0,0,0.15) 2px)",
                      }}
                    ></div>

                    {/* Screen content */}
                    <div className="relative z-10 p-2.5 h-full flex flex-col text-[#1a3520] font-mono">
                      {/* Status bar */}
                      <div className="flex justify-between items-center text-[9px] mb-2">
                        <div className="flex items-center gap-1.5">
                          {/* Menu icon */}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 6h18v2H3V6m0 5h18v2H3v-2m0 5h18v2H3v-2z" />
                          </svg>
                          {/* Battery icon */}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 6v12H4V6h12m1-2H3c-.55 0-1 .45-1 1v14c0 .55.45 1 1 1h14c.55 0 1-.45 1-1V5c0-.55-.45-1-1-1zm3 4h2v8h-2V8z" />
                          </svg>
                        </div>
                        <div className="text-[10px] font-bold">16:52</div>
                        {/* Signal strength */}
                        <div className="flex gap-[1.5px] items-end">
                          <div className="w-[2px] h-[6px] bg-current"></div>
                          <div className="w-[2px] h-[7px] bg-current"></div>
                          <div className="w-[2px] h-[8px] bg-current"></div>
                          <div className="w-[2px] h-[9px] bg-current"></div>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col">
                        {navigation.level === "extrasGame" ? (
                          <div className="absolute inset-0 z-20 rounded-[6px] overflow-hidden bg-black flex items-center justify-center">
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
                              className="absolute top-1 left-1 z-30 p-1 rounded bg-black/70 text-[#a4b494] text-[10px] font-mono"
                            >
                              Back
                            </button>
                          </div>
                        ) : navigation.level === "nowPlaying" && navigation.selectedSong ? (
                          <div className="flex-1 flex flex-col items-center justify-center">
                            {/* Soundbars visualizer - always visible, animated when playing, flat when paused */}
                            <div className="mb-3 flex items-end gap-[3px] h-[28px]">
                              {[...Array(5)].map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-[4px] bg-current rounded-t-sm ${isPlaying ? "animate-pulse" : ""}`}
                                  style={{
                                    height: isPlaying ? `${20 + Math.random() * 40}%` : "10%",
                                    animationDelay: isPlaying ? `${i * 0.1}s` : "0s",
                                    animationDuration: isPlaying ? `${0.6 + Math.random() * 0.4}s` : "0s",
                                  }}
                                ></div>
                              ))}
                            </div>

                            {/* Song info with play/pause button */}
                            <div className="flex items-center justify-between w-full px-1">
                              <div className="flex-1">
                                <div className="text-[12px] font-bold mb-1 line-clamp-2 leading-tight">
                                  {getSongTitle(navigation.selectedSong)}
                                </div>
                                <div className="text-[10px] opacity-80">
                                  {getSongArtist(navigation.selectedSong, navigation.selectedArtist)}
                                </div>
                                <div className="text-[9px] opacity-70 mt-0.5">
                                  {getSongYear(navigation.selectedSong, navigation.selectedAlbum)}
                                </div>
                              </div>
                              {/* Play/Pause button icon - changes based on playback state */}
                              <div className="ml-2">
                                {isPlaying ? (
                                  <Pause size={24} fill="currentColor" strokeWidth={0} />
                                ) : (
                                  <Play size={24} fill="currentColor" strokeWidth={0} />
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col gap-[2px] text-black">
                            {(() => {
                              const { items, startIndex } = getVisibleItems()
                              return items.map((item, index) => {
                                const actualIndex = startIndex + index
                                return (
                                  <div
                                    key={actualIndex}
                                    className={`px-2 py-1.5 text-[11px] font-bold leading-tight ${
                                      actualIndex === selectedIndex ? "bg-[#6b7a5f]" : ""
                                    }`}
                                  >
                                    {getListItemName(item, navigation.level)}
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-[#8a9a8a] rounded-[6px] flex items-center justify-center shadow-[0_2px_4px_rgba(0,0,0,0.3)_inset]">
                  <div className="text-[#2a3a2a] text-sm font-bold font-mono text-center px-2">Nokia</div>
                </div>
              )}
            </div>
          </div>

          <div className="absolute top-[250px] left-1/2 -translate-x-1/2 w-[170px] h-[70px]">
            {/* Select button with enhanced blue gradient and bevel */}
            <button
              onClick={handleSelectPress}
              className="absolute left-1/2 -translate-x-1/2 top-0 w-[50px] h-[24px] rounded-[10px] bg-gradient-to-b from-[#7b8be8] via-[#6b7bd8] to-[#5a6bc8] shadow-[0_4px_8px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.3)_inset,0_-1px_0_rgba(0,0,0,0.3)_inset] active:shadow-[0_2px_4px_rgba(0,0,0,0.6)_inset] active:translate-y-[1px] flex items-center justify-center border-[1px] border-[#4a5ab8]"
            >
              <div className="w-[35px] h-[3px] bg-gradient-to-b from-white to-white/80 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)]"></div>
            </button>

            {/* Back button with metallic silver gradient and strong bevel */}
            <button
              onClick={handleBackPress}
              disabled={navigation.level === "artists"}
              className="absolute left-0 top-[32px] w-[60px] h-[32px] rounded-[12px] bg-gradient-to-b from-[#e8ecf0] via-[#d8dce0] to-[#b8c0c8] shadow-[0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset] active:shadow-[0_2px_4px_rgba(0,0,0,0.6)_inset] active:translate-y-[1px] flex items-center justify-center text-[#1a2530] border-[1.5px] border-[#98a0a8] disabled:opacity-100"
            >
              <ChevronLeft size={20} strokeWidth={3} />
            </button>

            {/* Up and Down buttons with enhanced metallic finish */}
            <div className="absolute right-0 top-[32px] flex flex-col gap-1.5">
              {/* Up button */}
              <button
                onClick={handleUpPress}
                className="w-[60px] h-[24px] rounded-[10px] bg-gradient-to-b from-[#e8ecf0] via-[#d8dce0] to-[#b8c0c8] shadow-[0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset] active:shadow-[0_2px_4px_rgba(0,0,0,0.6)_inset] active:translate-y-[1px] flex items-center justify-center text-[#1a2530] border-[1.5px] border-[#98a0a8]"
              >
                <ChevronUp size={18} strokeWidth={3} />
              </button>

              {/* Down button */}
              <button
                onClick={handleDownPress}
                className="w-[60px] h-[24px] rounded-[10px] bg-gradient-to-b from-[#e8ecf0] via-[#d8dce0] to-[#b8c0c8] shadow-[0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.6)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset] active:shadow-[0_2px_4px_rgba(0,0,0,0.6)_inset] active:translate-y-[1px] flex items-center justify-center text-[#1a2530] border-[1.5px] border-[#98a0a8]"
              >
                <ChevronDown size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-[12px] left-1/2 -translate-x-1/2 w-[170px]">
            <div className="grid grid-cols-3 gap-x-2.5 gap-y-2">
              {[
                ["1", ""],
                ["2", "abc", handleUpPress],
                ["3", "def"],
                ["4", "ghi"],
                ["5", "jkl", handleSelectPress],
                ["6", "mno"],
                ["7", "pqrs"],
                ["8", "tuv", handleDownPress],
                ["9", "wxyz"],
                ["*", "+"],
                ["0", " "],
                ["#", ""],
              ].map(([num, letters, handler], i) => (
                <button
                  key={i}
                  onClick={handler as (() => void) | undefined}
                  className="h-[28px] rounded-[14px] bg-gradient-to-b from-[#e8ecf0] via-[#d8dce0] to-[#b8c0c8] shadow-[0_3px_5px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.7)_inset,0_-1px_0_rgba(0,0,0,0.2)_inset] active:shadow-[0_2px_3px_rgba(0,0,0,0.5)_inset] active:translate-y-[1px] flex flex-col items-center justify-center relative border-[1.5px] border-[#98a0a8]"
                >
                  <span className="text-[15px] text-[#1a2530] font-bold leading-none [text-shadow:0_1px_0_rgba(255,255,255,0.5)]">
                    {num}
                  </span>
                  {letters && (
                    <span className="text-[8px] text-[#4a5a6a] leading-none mt-[1px] [text-shadow:0_0.5px_0_rgba(255,255,255,0.3)]">
                      {letters}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
