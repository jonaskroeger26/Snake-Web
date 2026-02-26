"use client"

import type React from "react"

import { createContext, useContext, useState, useRef, useEffect, type ReactNode } from "react"
import type { Artist, Album, Song } from "@/lib/music-library"
import { musicLibrary } from "@/lib/music-library"
import { trackAutoplay } from "@/lib/analytics"

type NavigationLevel = "artists" | "albums" | "songs" | "nowPlaying" | "extras" | "extrasGame"

interface NavigationState {
  level: NavigationLevel
  selectedArtist: Artist | null
  selectedAlbum: Album | null
  selectedSong: Song | null
  /** When level is extrasGame, which game is open (e.g. "snake") */
  selectedExtraGame?: string | null
}

interface MusicPlaybackContextType {
  navigation: NavigationState
  setNavigation: (state: NavigationState) => void
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  volume: number
  setVolume: (volume: number) => void
  playerRef: React.MutableRefObject<any>
  /** When in extrasGame, wheel scroll pans this container (set by IPodDisplay). */
  gameScrollContainerRef: React.MutableRefObject<HTMLDivElement | null>
  /** When in extrasGame with embedded Snake: iPod wheel sets direction. { x: 0, y: -1 } = up, etc. */
  gameDirectionRef: React.MutableRefObject<{ x: number; y: number } | null>
  /** Call to restart the embedded Snake game (e.g. on Select when game over). */
  snakeRestartRef: React.MutableRefObject<(() => void) | null>
}

const MusicPlaybackContext = createContext<MusicPlaybackContextType | undefined>(undefined)

export function MusicPlaybackProvider({ children }: { children: ReactNode }) {
  const [navigation, setNavigation] = useState<NavigationState>({
    level: "artists",
    selectedArtist: null,
    selectedAlbum: null,
    selectedSong: null,
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const playerRef = useRef<any>(null)
  const gameScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const gameDirectionRef = useRef<{ x: number; y: number } | null>(null)
  const snakeRestartRef = useRef<(() => void) | null>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const previousSongRef = useRef<Song | null>(null)
  const isPlayingRef = useRef(isPlaying)
  const isLoadingRef = useRef(false)
  const navigationRef = useRef(navigation)

  useEffect(() => {
    navigationRef.current = navigation
  }, [navigation])

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  const playNextSong = () => {
    const currentNavigation = navigationRef.current

    if (!currentNavigation.selectedSong || !currentNavigation.selectedAlbum || !currentNavigation.selectedArtist) {
      return
    }

    const currentArtist = currentNavigation.selectedArtist
    const currentAlbum = currentNavigation.selectedAlbum
    const currentSong = currentNavigation.selectedSong

    // Find current indices
    const artistIndex = musicLibrary.findIndex((a) => a.name === currentArtist.name)
    const albumIndex = currentArtist.albums.findIndex((a) => a.name === currentAlbum.name)
    const songIndex = currentAlbum.songs.findIndex((s) => s.id === currentSong.id)

    isPlayingRef.current = true

    // Try to play next song in current album
    if (songIndex < currentAlbum.songs.length - 1) {
      const nextSong = currentAlbum.songs[songIndex + 1]
      console.log("[v0] Autoplay: Next song -", nextSong.title)
      trackAutoplay(currentArtist.name, currentAlbum.name, nextSong.title, "Auto")
      setNavigation({
        ...currentNavigation,
        selectedSong: nextSong,
      })
      setIsPlaying(true)
      return
    }

    if (albumIndex < currentArtist.albums.length - 1) {
      const nextAlbum = currentArtist.albums[albumIndex + 1]
      const nextSong = nextAlbum.songs[0]
      console.log("[v0] Autoplay: Next album -", nextAlbum.name, "-", nextSong.title)
      trackAutoplay(currentArtist.name, nextAlbum.name, nextSong.title, "Auto")
      setNavigation({
        ...currentNavigation,
        selectedAlbum: nextAlbum,
        selectedSong: nextSong,
      })
      setIsPlaying(true)
      return
    }

    if (artistIndex < musicLibrary.length - 1) {
      const nextArtist = musicLibrary[artistIndex + 1]
      const nextAlbum = nextArtist.albums[0]
      const nextSong = nextAlbum.songs[0]
      console.log("[v0] Autoplay: Next artist -", nextArtist.name)
      trackAutoplay(nextArtist.name, nextAlbum.name, nextSong.title, "Auto")
      setNavigation({
        level: "nowPlaying",
        selectedArtist: nextArtist,
        selectedAlbum: nextAlbum,
        selectedSong: nextSong,
      })
      setIsPlaying(true)
      return
    }

    // Loop back to first artist, first album, first song
    const firstArtist = musicLibrary[0]
    const firstAlbum = firstArtist.albums[0]
    const firstSong = firstAlbum.songs[0]
    console.log("[v0] Autoplay: Looping to start -", firstArtist.name)
    trackAutoplay(firstArtist.name, firstAlbum.name, firstSong.title, "Auto")
    setNavigation({
      level: "nowPlaying",
      selectedArtist: firstArtist,
      selectedAlbum: firstAlbum,
      selectedSong: firstSong,
    })
    setIsPlaying(true)
  }

  useEffect(() => {
    const tag = document.createElement("script")
    tag.src = "https://www.youtube.com/iframe_api"
    const firstScriptTag = document.getElementsByTagName("script")[0]
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    ;(window as any).onYouTubeIframeAPIReady = () => {
      playerRef.current = new (window as any).YT.Player("youtube-player", {
        height: "0",
        width: "0",
        playerVars: {
          autoplay: 0,
          controls: 0,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            setPlayerReady(true)
          },
          onStateChange: (event: any) => {
            if (event.data === (window as any).YT.PlayerState.PLAYING) {
              isLoadingRef.current = false
              if (!isLoadingRef.current) {
                isPlayingRef.current = true
                setIsPlaying(true)
              }
            } else if (event.data === (window as any).YT.PlayerState.PAUSED) {
              console.log("[v0] Paused")
              if (!isLoadingRef.current) {
                isPlayingRef.current = false
                setIsPlaying(false)
              }
              isLoadingRef.current = false
            } else if (event.data === (window as any).YT.PlayerState.ENDED) {
              isLoadingRef.current = false
              isPlayingRef.current = false
              setIsPlaying(false)
              playNextSong()
            }
          },
          onError: (event: any) => {
            console.error("[v0] YouTube player error:", event.data)
            isLoadingRef.current = false
          },
        },
      })
    }
  }, [])

  useEffect(() => {
    const rnw = typeof window !== "undefined" && (window as any).ReactNativeWebView
    if (rnw) return // Native app plays via expo-audio from R2; skip YouTube
    if (playerReady && playerRef.current && navigation.selectedSong) {
      const songChanged = previousSongRef.current?.id !== navigation.selectedSong.id

      if (songChanged && !isLoadingRef.current) {
        previousSongRef.current = navigation.selectedSong
        isLoadingRef.current = true

        try {
          if (isPlayingRef.current) {
            playerRef.current.loadVideoById({
              videoId: navigation.selectedSong.id,
              startSeconds: 0,
            })
          } else {
            playerRef.current.cueVideoById({
              videoId: navigation.selectedSong.id,
              startSeconds: 0,
            })
          }
        } catch (error) {
          console.error("Error loading video:", error)
          isLoadingRef.current = false
        }
      }
    }
  }, [navigation.selectedSong, playerReady])

  useEffect(() => {
    const rnw = typeof window !== "undefined" && (window as any).ReactNativeWebView
    if (rnw) return // Native app plays via expo-audio; skip YouTube
    if (playerReady && playerRef.current && navigation.selectedSong) {
      if (!isLoadingRef.current) {
        if (isPlaying) {
          try {
            console.log("[v0] Playing")
            playerRef.current.playVideo()
          } catch (error) {
            console.error("Error playing video:", error)
          }
        } else {
          try {
            playerRef.current.pauseVideo()
          } catch (error) {
            console.error("Error pausing video:", error)
          }
        }
      }
    }
  }, [isPlaying, playerReady, navigation.selectedSong])

  useEffect(() => {
    if (playerReady && playerRef.current) {
      console.log("[v0] Volume:", volume)
      playerRef.current.setVolume(volume)
    }
  }, [volume, playerReady])

  // Native app (Capacitor Android): enable background audio like Spotify — music continues when app is backgrounded or screen is off
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const cap = (typeof window !== "undefined" && (window as any).Capacitor) as { getPlatform?: () => string } | undefined
        if (!cap?.getPlatform || cap.getPlatform() !== "android") return
        const { BackgroundMode } = await import("@anuradev/capacitor-background-mode")
        if (cancelled) return
        if (isPlaying) {
          await BackgroundMode.enable({
            title: "SolanaPod",
            text: navigation.selectedSong
              ? `${navigation.selectedSong.title} – ${navigation.selectedArtist?.name ?? ""}`
              : "Playing",
            channelName: "SolanaPod playback",
            channelDescription: "Music playback in background",
          })
          await BackgroundMode.enableWebViewOptimizations()
        } else {
          await BackgroundMode.disable()
        }
      } catch {
        // Ignore on web or if plugin unavailable
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isPlaying, navigation.selectedSong?.title, navigation.selectedSong?.id, navigation.selectedArtist?.name])

  // Expo / React Native WebView: send playback + audioUrl so native app can play from R2 and show lockscreen controls
  useEffect(() => {
    const rnw = typeof window !== "undefined" && (window as any).ReactNativeWebView
    if (typeof rnw?.postMessage !== "function") return

    const send = () => {
      try {
        rnw.postMessage(
          JSON.stringify({
            type: "playback",
            isPlaying,
            title: navigation.selectedSong?.title ?? "",
            artist: navigation.selectedArtist?.name ?? "",
            album: navigation.selectedAlbum?.name ?? "",
            audioUrl: navigation.selectedSong?.audioUrl ?? "",
            artwork: navigation.selectedAlbum?.coverUrl ?? navigation.selectedArtist?.photoUrl,
          })
        )
      } catch {
        // ignore
      }
    }

    send()
    if (!isPlaying) return

    const interval = setInterval(send, 2000)
    return () => clearInterval(interval)
  }, [isPlaying, navigation.selectedSong?.title, navigation.selectedSong?.audioUrl, navigation.selectedArtist?.name, navigation.selectedAlbum?.name, navigation.selectedAlbum?.coverUrl, navigation.selectedArtist?.photoUrl])

  return (
    <MusicPlaybackContext.Provider
      value={{
        navigation,
        setNavigation,
        selectedIndex,
        setSelectedIndex,
        isPlaying,
        setIsPlaying,
        volume,
        setVolume,
        playerRef,
        gameScrollContainerRef,
        gameDirectionRef,
        snakeRestartRef,
      }}
    >
      <div id="youtube-player" style={{ display: "none" }}></div>
      {children}
    </MusicPlaybackContext.Provider>
  )
}

export function useMusicPlayback() {
  const context = useContext(MusicPlaybackContext)
  if (context === undefined) {
    throw new Error("useMusicPlayback must be used within a MusicPlaybackProvider")
  }
  return context
}
