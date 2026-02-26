"use client"

import type React from "react"

import { createContext, useContext, useState, useRef, useCallback, useEffect, useMemo, type ReactNode } from "react"
import type { Artist, Album, Song } from "@/lib/music-library"
import { musicLibrary, getSongAudioUrl, getSongAudioUrlFallbacks } from "@/lib/music-library"
import { r2Url } from "@/lib/r2"
import { trackAutoplay } from "@/lib/analytics"

type NavigationLevel = "artists" | "albums" | "songs" | "nowPlaying"
export type RepeatMode = "off" | "one" | "all"

/** Pathnames/r2Keys that already exist in the static library (from music-library.ts). Includes fallbacks so we don't add the same song twice. */
function getStaticR2Keys(): Set<string> {
  const keys = new Set<string>()
  for (const artist of musicLibrary) {
    for (const album of artist.albums) {
      for (const song of album.songs) {
        if (song.r2Key) {
          keys.add(song.r2Key)
          keys.add(song.r2Key.replace(/^.*\//, ""))
        }
        song.audioUrlFallbacks?.forEach((entry) => {
          const key = entry.startsWith("http") ? entry.replace(/^.*\//, "").replace(/\?.*$/, "") : entry.replace(/^.*\//, "")
          keys.add(entry)
          keys.add(key)
        })
      }
    }
  }
  return keys
}

/** Normalize for artist/title comparison (lowercase, trim). */
function norm(s: string): string {
  return s.trim().toLowerCase()
}

/** Normalize a path/filename for duplicate scan: basename, no extension, lowercase, strip trailing " (x)" / " [x]". */
function normBasename(pathOrFilename: string): string {
  const base = pathOrFilename.replace(/^.*\//, "").replace(/\.[^./]+$/, "").trim().toLowerCase()
  return base.replace(/\s*[(\[]([^)\]]*)[)\]]\s*$/, "").trim() || base
}

/** Set of normalized basenames from every library song (r2Key + fallbacks). Used to detect duplicate blob tracks by filename. */
function getStaticNormalizedBasenames(): Set<string> {
  const set = new Set<string>()
  for (const artist of musicLibrary) {
    for (const album of artist.albums) {
      for (const song of album.songs) {
        if (song.r2Key) set.add(normBasename(song.r2Key))
        song.audioUrlFallbacks?.forEach((entry) => {
          const key = entry.startsWith("http") ? entry.replace(/^.*\//, "").replace(/\?.*$/, "") : entry
          set.add(normBasename(key))
        })
      }
    }
  }
  return set
}

/** True if the library already has this artist+title (avoids duplicate e.g. Janji Heroes Tonight from blob). */
function libraryHasArtistTitle(artist: string, title: string): boolean {
  const nArtist = norm(artist)
  const nTitle = norm(title)
  for (const a of musicLibrary) {
    if (norm(a.name) !== nArtist) continue
    for (const album of a.albums) {
      for (const song of album.songs) {
        if (norm(song.title) === nTitle) return true
        if (norm(song.title).includes(nTitle) || nTitle.includes(norm(song.title))) return true
      }
    }
  }
  return false
}

/** True if the library already has the one Fearless song (Lost Sky). Used to never add a second Fearless from blob. */
function libraryAlreadyHasFearlessSong(): boolean {
  for (const a of musicLibrary) {
    for (const album of a.albums) {
      for (const song of album.songs) {
        if (norm(song.title).includes("fearless")) return true
      }
    }
  }
  return false
}

/**
 * Parse "Artist - Song Title.ext" into { artist, title }. If no " - ", treat whole filename as title and artist as "Unknown Artist".
 */
function parseBlobFilename(pathname: string): { artist: string; title: string } {
  const filename = pathname.replace(/^.*\//, "")
  const base = filename.replace(/\.[^./]+$/, "").trim()
  const sep = " - "
  const i = base.indexOf(sep)
  if (i !== -1) {
    return {
      artist: base.slice(0, i).trim() || "Unknown Artist",
      title: base.slice(i + sep.length).trim() || base,
    }
  }
  return { artist: "Unknown Artist", title: base || pathname }
}

function artistNameMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/**
 * Merge new tracks from the store into the library. No UI section is ever labeled "blob".
 * Duplicate detection: skip a blob track if it's already in the library by (1) exact path/filename,
 * (2) normalized basename (catches "Fearless.mp3" vs "Fearless (NCS).mp3" as same song), or
 * (3) same artist + same/similar title. No song-specific filters; works for any number of songs.
 */
function mergeBlobTracksIntoLibrary(
  library: Artist[],
  blobTracks: { pathname: string; url: string }[]
): Artist[] {
  const staticKeys = getStaticR2Keys()
  const staticNormBasenames = getStaticNormalizedBasenames()
  const newTracks = blobTracks.filter((t) => {
    const filename = t.pathname.replace(/^.*\//, "")
    if (staticKeys.has(t.pathname) || staticKeys.has(filename)) return false
    if (staticNormBasenames.has(normBasename(t.pathname))) return false
    const { artist, title } = parseBlobFilename(t.pathname)
    if (libraryHasArtistTitle(artist, title)) return false
    return true
  })
  if (!newTracks.length) return library

  const byArtist = new Map<string, { displayName: string; songs: Song[] }>()
  for (const t of newTracks) {
    const { artist, title } = parseBlobFilename(t.pathname)
    const key = artist.trim().toLowerCase()
    const song: Song = {
      id: `blob-${t.pathname}`,
      title,
      audioUrl: t.url,
    }
    const existing = byArtist.get(key)
    if (existing) {
      existing.songs.push(song)
    } else {
      byArtist.set(key, { displayName: artist, songs: [song] })
    }
  }

  const artists = Array.from(library)
  for (const { displayName, songs } of byArtist.values()) {
    if (!songs.length) continue
    const existingIndex = artists.findIndex((a) => artistNameMatch(a.name, displayName))
    const albumName = songs.length === 1 ? songs[0].title : "Tracks"
    const album: Album = { name: albumName, songs }
    if (existingIndex !== -1) {
      artists[existingIndex] = {
        ...artists[existingIndex],
        albums: [...artists[existingIndex].albums, album],
      }
    } else {
      artists.push({ name: displayName, albums: [album] })
    }
  }
  return artists
}

/** Flat list of all songs in library for shuffle */
function getAllSongs(library: Artist[]): { artist: Artist; album: Album; song: Song }[] {
  const list: { artist: Artist; album: Album; song: Song }[] = []
  for (const artist of library) {
    for (const album of artist.albums) {
      for (const song of album.songs) {
        list.push({ artist, album, song })
      }
    }
  }
  return list
}

interface NavigationState {
  level: NavigationLevel
  selectedArtist: Artist | null
  selectedAlbum: Album | null
  selectedSong: Song | null
}

interface MusicPlaybackContextType {
  /** Library from music-library.ts; new store tracks are merged by artist (no blob-labeled sections). */
  library: Artist[]
  navigation: NavigationState
  setNavigation: (state: NavigationState) => void
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  isPlaying: boolean
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>
  volume: number
  setVolume: (volume: number) => void
  playerRef: React.MutableRefObject<any>
  shuffle: boolean
  setShuffle: (value: boolean) => void
  repeat: RepeatMode
  cycleRepeat: () => void
  /** Advance to next track (respects shuffle/repeat). Call from Next button. */
  advanceToNext: () => void
  /** Advance to previous track (respects shuffle/repeat). Call from Previous button. */
  advanceToPrevious: () => void
  /** When using direct audio: current playback time in seconds */
  directPlaybackCurrentTime: number
  /** When using direct audio: total duration in seconds (from stream metadata) */
  directPlaybackDuration: number
  /** Seek direct audio to seconds. No-op if using YouTube. */
  seekDirectPlayback: (seconds: number) => void
}

const MusicPlaybackContext = createContext<MusicPlaybackContextType | undefined>(undefined)

export function MusicPlaybackProvider({ children }: { children: ReactNode }) {
  const [blobTracks, setBlobTracks] = useState<{ pathname: string; url: string }[]>([])
  const [navigation, setNavigation] = useState<NavigationState>({
    level: "artists",
    selectedArtist: null,
    selectedAlbum: null,
    selectedSong: null,
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(50)
  const [shuffle, setShuffle] = useState(false)
  const [directPlaybackCurrentTime, setDirectPlaybackCurrentTime] = useState(0)
  const [directPlaybackDuration, setDirectPlaybackDuration] = useState(0)
  const [repeat, setRepeat] = useState<RepeatMode>("off")
  const playerRef = useRef<any>(null)
  const directAudioRef = useRef<HTMLAudioElement | null>(null)
  const directAudioFallbackIndexRef = useRef(0)
  const [playerReady, setPlayerReady] = useState(false)
  const shuffleRef = useRef(shuffle)
  const repeatRef = useRef(repeat)

  useEffect(() => {
    fetch("/api/audio/tracks")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { tracks?: { pathname: string; url: string }[] } | null) => {
        if (data?.tracks?.length) setBlobTracks(data.tracks)
      })
      .catch(() => {})
  }, [])

  // Store tracks already in the library are served via r2Key; new files are merged by artist (album "Tracks", no blob in UI)
  const effectiveLibrary = useMemo(
    () => mergeBlobTracksIntoLibrary(Array.isArray(musicLibrary) ? [...musicLibrary] : [], blobTracks),
    [blobTracks]
  )
  const libraryRef = useRef(effectiveLibrary)
  libraryRef.current = effectiveLibrary
  useEffect(() => {
    shuffleRef.current = shuffle
    repeatRef.current = repeat
  }, [shuffle, repeat])
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

  const seekDirectPlayback = useCallback((seconds: number) => {
    if (directAudioRef.current) {
      directAudioRef.current.currentTime = Math.max(0, seconds)
      setDirectPlaybackCurrentTime(directAudioRef.current.currentTime)
    }
  }, [])

  const playNextSong = () => {
    const currentNavigation = navigationRef.current

    if (!currentNavigation.selectedSong || !currentNavigation.selectedAlbum || !currentNavigation.selectedArtist) {
      return
    }

    const currentArtist = currentNavigation.selectedArtist
    const currentAlbum = currentNavigation.selectedAlbum
    const currentSong = currentNavigation.selectedSong

    isPlayingRef.current = true

    if (repeatRef.current === "one") {
      setNavigation({ ...currentNavigation, selectedSong: currentSong })
      setIsPlaying(true)
      return
    }

    if (shuffleRef.current) {
      const allSongs = getAllSongs(libraryRef.current)
      if (allSongs.length > 0) {
        const idx = Math.floor(Math.random() * allSongs.length)
        const { artist, album, song } = allSongs[idx]
        trackAutoplay(artist.name, album.name, song.title, "Shuffle")
        setNavigation({ level: "nowPlaying", selectedArtist: artist, selectedAlbum: album, selectedSong: song })
        setIsPlaying(true)
        return
      }
    }

    const artistIndex = libraryRef.current.findIndex((a) => a.name === currentArtist.name)
    const albumIndex = currentArtist.albums.findIndex((a) => a.name === currentAlbum.name)
    const songIndex = currentAlbum.songs.findIndex((s) => s.id === currentSong.id)

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

    if (artistIndex < libraryRef.current.length - 1) {
      const nextArtist = libraryRef.current[artistIndex + 1]
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

    // Repeat all: loop back to first
    if (repeatRef.current === "all") {
      const firstArtist = libraryRef.current[0]
      const firstAlbum = firstArtist.albums[0]
      const firstSong = firstAlbum.songs[0]
      console.log("[v0] Autoplay: Repeat all -", firstArtist.name)
      trackAutoplay(firstArtist.name, firstAlbum.name, firstSong.title, "Auto")
      setNavigation({
        level: "nowPlaying",
        selectedArtist: firstArtist,
        selectedAlbum: firstAlbum,
        selectedSong: firstSong,
      })
      setIsPlaying(true)
      return
    }

    // End of library, no repeat all: stop or loop once
    const firstArtist = libraryRef.current[0]
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

  const cycleRepeat = useCallback(() => {
    setRepeat((prev) => (prev === "off" ? "one" : prev === "one" ? "all" : "off"))
  }, [])

  const advanceToNext = useCallback(() => {
    const nav = navigationRef.current
    if (!nav.selectedSong || !nav.selectedAlbum || !nav.selectedArtist) return

    const allSongs = getAllSongs(libraryRef.current)
    const currentArtist = nav.selectedArtist
    const currentAlbum = nav.selectedAlbum
    const currentSong = nav.selectedSong
    const artistIndex = libraryRef.current.findIndex((a) => a.name === currentArtist.name)
    const albumIndex = currentArtist.albums.findIndex((a) => a.name === currentAlbum.name)
    const songIndex = currentAlbum.songs.findIndex((s) => s.id === currentSong.id)

    if (repeatRef.current === "one") {
      setNavigation({ ...nav, selectedSong: currentSong })
      setIsPlaying(true)
      return
    }

    if (shuffleRef.current && allSongs.length > 0) {
      const idx = Math.floor(Math.random() * allSongs.length)
      const { artist, album, song } = allSongs[idx]
      trackAutoplay(artist.name, album.name, song.title, "Shuffle")
      setNavigation({ level: "nowPlaying", selectedArtist: artist, selectedAlbum: album, selectedSong: song })
      setIsPlaying(true)
      return
    }

    if (songIndex < currentAlbum.songs.length - 1) {
      const nextSong = currentAlbum.songs[songIndex + 1]
      trackAutoplay(currentArtist.name, currentAlbum.name, nextSong.title, "Auto")
      setNavigation({ ...nav, selectedSong: nextSong })
      setIsPlaying(true)
      return
    }
    if (albumIndex < currentArtist.albums.length - 1) {
      const nextAlbum = currentArtist.albums[albumIndex + 1]
      const nextSong = nextAlbum.songs[0]
      trackAutoplay(currentArtist.name, nextAlbum.name, nextSong.title, "Auto")
      setNavigation({ ...nav, selectedAlbum: nextAlbum, selectedSong: nextSong })
      setIsPlaying(true)
      return
    }
    if (artistIndex < libraryRef.current.length - 1) {
      const nextArtist = libraryRef.current[artistIndex + 1]
      const nextAlbum = nextArtist.albums[0]
      const nextSong = nextAlbum.songs[0]
      trackAutoplay(nextArtist.name, nextAlbum.name, nextSong.title, "Auto")
      setNavigation({ level: "nowPlaying", selectedArtist: nextArtist, selectedAlbum: nextAlbum, selectedSong: nextSong })
      setIsPlaying(true)
      return
    }
    if (repeatRef.current === "all") {
      const first = allSongs[0]
      trackAutoplay(first.artist.name, first.album.name, first.song.title, "Auto")
      setNavigation({ level: "nowPlaying", selectedArtist: first.artist, selectedAlbum: first.album, selectedSong: first.song })
      setIsPlaying(true)
    }
  }, [])

  const advanceToPrevious = useCallback(() => {
    const nav = navigationRef.current
    if (!nav.selectedSong || !nav.selectedAlbum || !nav.selectedArtist) return

    const allSongs = getAllSongs(libraryRef.current)
    const currentArtist = nav.selectedArtist
    const currentAlbum = nav.selectedAlbum
    const currentSong = nav.selectedSong
    const artistIndex = libraryRef.current.findIndex((a) => a.name === currentArtist.name)
    const albumIndex = currentArtist.albums.findIndex((a) => a.name === currentAlbum.name)
    const songIndex = currentAlbum.songs.findIndex((s) => s.id === currentSong.id)

    if (repeatRef.current === "one") {
      setNavigation({ ...nav, selectedSong: currentSong })
      setIsPlaying(true)
      return
    }

    if (shuffleRef.current && allSongs.length > 0) {
      const idx = Math.floor(Math.random() * allSongs.length)
      const { artist, album, song } = allSongs[idx]
      trackAutoplay(artist.name, album.name, song.title, "Shuffle")
      setNavigation({ level: "nowPlaying", selectedArtist: artist, selectedAlbum: album, selectedSong: song })
      setIsPlaying(true)
      return
    }

    if (songIndex > 0) {
      const prevSong = currentAlbum.songs[songIndex - 1]
      trackAutoplay(currentArtist.name, currentAlbum.name, prevSong.title, "Auto")
      setNavigation({ ...nav, selectedSong: prevSong })
      setIsPlaying(true)
      return
    }
    if (albumIndex > 0) {
      const prevAlbum = currentArtist.albums[albumIndex - 1]
      const prevSong = prevAlbum.songs[prevAlbum.songs.length - 1]
      trackAutoplay(currentArtist.name, prevAlbum.name, prevSong.title, "Auto")
      setNavigation({ ...nav, selectedAlbum: prevAlbum, selectedSong: prevSong })
      setIsPlaying(true)
      return
    }
    if (artistIndex > 0) {
      const prevArtist = libraryRef.current[artistIndex - 1]
      const prevAlbum = prevArtist.albums[prevArtist.albums.length - 1]
      const prevSong = prevAlbum.songs[prevAlbum.songs.length - 1]
      trackAutoplay(prevArtist.name, prevAlbum.name, prevSong.title, "Auto")
      setNavigation({ level: "nowPlaying", selectedArtist: prevArtist, selectedAlbum: prevAlbum, selectedSong: prevSong })
      setIsPlaying(true)
      return
    }
    if (repeatRef.current === "all") {
      const last = allSongs[allSongs.length - 1]
      trackAutoplay(last.artist.name, last.album.name, last.song.title, "Auto")
      setNavigation({ level: "nowPlaying", selectedArtist: last.artist, selectedAlbum: last.album, selectedSong: last.song })
      setIsPlaying(true)
    }
  }, [])

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
    if (rnw) return
    const song = navigation.selectedSong
    if (!song) return

    const primaryUrl = getSongAudioUrl(song)
    const useDirectAudio = Boolean(primaryUrl)
    if (useDirectAudio) {
      if (!directAudioRef.current && typeof document !== "undefined") {
        directAudioRef.current = document.createElement("audio")
        directAudioRef.current.preload = "auto"
        directAudioRef.current.onended = () => {
          isPlayingRef.current = false
          setIsPlaying(false)
          playNextSong()
        }
        directAudioRef.current.onerror = () => {
          const current = navigationRef.current.selectedSong
          const fallbacks = current ? getSongAudioUrlFallbacks(current) : []
          const idx = directAudioFallbackIndexRef.current
          if (fallbacks && idx < fallbacks.length) {
            const nextUrl = fallbacks[idx]
            directAudioFallbackIndexRef.current = idx + 1
            if (directAudioRef.current) {
              directAudioRef.current.src = nextUrl
              directAudioRef.current.load()
            }
          } else {
            isLoadingRef.current = false
            console.error("[SolanaPod] Direct audio failed to load:", directAudioRef.current?.src)
          }
        }
      }
      const audio = directAudioRef.current
      if (audio) {
        const songChanged = previousSongRef.current?.id !== song.id
        if (songChanged) {
          previousSongRef.current = song
          directAudioFallbackIndexRef.current = 0
          isLoadingRef.current = true
          setDirectPlaybackCurrentTime(0)
          setDirectPlaybackDuration(0)
          const tryPlay = () => {
            isLoadingRef.current = false
            if (isPlayingRef.current) audio.play().catch((e) => console.warn("[SolanaPod] play failed:", e))
          }
          audio.onloadedmetadata = () => setDirectPlaybackDuration(audio.duration)
          audio.ontimeupdate = () => setDirectPlaybackCurrentTime(audio.currentTime)
          audio.oncanplay = tryPlay
          audio.oncanplaythrough = tryPlay

          const loadUrl = (url: string) => {
            audio.src = url
            audio.load()
            if (isPlayingRef.current) audio.play().catch((e) => console.warn("[SolanaPod] play failed:", e))
          }

          if (song.id === "janji-heroes-tonight") {
            const envPath =
              typeof process !== "undefined" && process.env?.NEXT_PUBLIC_HEROES_TONIGHT_BLOB_PATH?.trim()
            if (envPath) {
              loadUrl(r2Url(envPath))
            } else {
              fetch("/api/audio/heroes-tonight")
                .then((r) => (r.ok ? r.json() : null))
                .then((data: { url?: string } | null) => {
                  if (data?.url) loadUrl(data.url)
                  else loadUrl(primaryUrl!)
                })
                .catch(() => loadUrl(primaryUrl!))
            }
          } else {
            loadUrl(primaryUrl!)
          }
        }
      }
      return
    }

    if (playerReady && playerRef.current) {
      const songChanged = previousSongRef.current?.id !== song.id
      if (songChanged && !isLoadingRef.current) {
        previousSongRef.current = song
        isLoadingRef.current = true
        try {
          if (isPlayingRef.current) {
            playerRef.current.loadVideoById({ videoId: song.id, startSeconds: 0 })
          } else {
            playerRef.current.cueVideoById({ videoId: song.id, startSeconds: 0 })
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
    if (rnw) return
    const song = navigation.selectedSong
    if (!song) return

    if (getSongAudioUrl(song) && directAudioRef.current) {
      if (isPlaying) directAudioRef.current.play().catch(() => {})
      else directAudioRef.current.pause()
      return
    }

    if (playerReady && playerRef.current && !isLoadingRef.current) {
      if (isPlaying) {
        try { playerRef.current.playVideo() } catch (e) { console.error("Error playing video:", e) }
      } else {
        try { playerRef.current.pauseVideo() } catch (e) { console.error("Error pausing video:", e) }
      }
    }
  }, [isPlaying, playerReady, navigation.selectedSong])

  useEffect(() => {
    const vol = volume / 100
    if (navigation.selectedSong && getSongAudioUrl(navigation.selectedSong) && directAudioRef.current) {
      directAudioRef.current.volume = vol
    }
    if (playerReady && playerRef.current) {
      playerRef.current.setVolume(volume)
    }
  }, [volume, playerReady, navigation.selectedSong])

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
            audioUrl: (navigation.selectedSong && getSongAudioUrl(navigation.selectedSong)) ?? "",
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
  }, [isPlaying, navigation.selectedSong?.title, navigation.selectedSong?.id, navigation.selectedArtist?.name, navigation.selectedAlbum?.name, navigation.selectedAlbum?.coverUrl, navigation.selectedArtist?.photoUrl])

  return (
    <MusicPlaybackContext.Provider
      value={{
        library: effectiveLibrary,
        navigation,
        setNavigation,
        selectedIndex,
        setSelectedIndex,
        isPlaying,
        setIsPlaying,
        volume,
        setVolume,
        playerRef,
        shuffle,
        setShuffle,
        repeat,
        cycleRepeat,
        advanceToNext,
        advanceToPrevious,
        directPlaybackCurrentTime,
        directPlaybackDuration,
        seekDirectPlayback,
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
