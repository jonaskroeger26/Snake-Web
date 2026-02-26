import { r2Url } from "./r2"

export interface Song {
  id: string // YouTube video ID
  title: string
  duration?: string
  /**
   * Optional direct audio URL (use when not using R2).
   * When present, the app streams this instead of YouTube.
   */
  audioUrl?: string
  /**
   * R2 object key (path + filename as in R2 dashboard). Preferred over audioUrl when both exist.
   * Example: "music/Love in the Air.wav" or "music/music/Janji - Heroes Tonight.mp3"
   */
  r2Key?: string
  /** Fallback R2 keys or full URLs tried in order if primary fails to load */
  audioUrlFallbacks?: string[]
}

/** Primary URL for streaming this song (R2 or direct). Use this everywhere instead of song.audioUrl. */
export function getSongAudioUrl(song: Song): string | undefined {
  if (song.r2Key) return r2Url(song.r2Key)
  return song.audioUrl
}

/** Fallback URLs to try if primary fails. Each entry is either an R2 key (no "http") or a full URL. */
export function getSongAudioUrlFallbacks(song: Song): string[] {
  if (!song.audioUrlFallbacks?.length) return []
  return song.audioUrlFallbacks.map((entry) =>
    entry.startsWith("http") ? entry : r2Url(entry)
  )
}

export interface Album {
  name: string
  year?: string
  songs: Song[]
  coverUrl?: string
}

export interface Artist {
  name: string
  albums: Album[]
  photoUrl?: string
}

export const musicLibrary: Artist[] = [
  {
    name: "Jonas Kroeger",
    photoUrl: "https://i.ytimg.com/vi/ACuG31JtcGs/default.jpg",
    albums: [
      {
        name: "Midnight Vibes",
        year: "2024",
        coverUrl: "https://i.ytimg.com/vi/ACuG31JtcGs/mqdefault.jpg",
        songs: [
          { id: "ACuG31JtcGs", title: "Amor En Ritmo", duration: "2:49", r2Key: "Amor en Ritmo.wav" },
          { id: "4mkR5XDO8iI", title: "Love in the Air", duration: "3:58", r2Key: "Love in the Air.wav" },
          { id: "8-7LRfXxHY0", title: "Endless Nights", duration: "3:13", r2Key: "Endless Nights.wav" },
          { id: "UZ9sFRpcvNs", title: "Lost Vibes", duration: "3:31", r2Key: "Lost Vibes.wav" },
          { id: "4AVw8CR8J84", title: "Midnight Serenade", duration: "2:49", r2Key: "Midnight Serenade.wav" },
          { id: "-EoJD-oKwg0", title: "Neon Nights", duration: "2:47", r2Key: "Neon Nights.wav" },
          { id: "3rdFW0aHwOs", title: "Pulse of the Night", duration: "3:20", r2Key: "Pulse of the Night.wav" },
          { id: "ydmMCdHe-hE", title: "Heartstrings Serenade", duration: "3:49", r2Key: "Heartstrings Serenade (Remastered).wav" },
        ],
      },
    ],
  },
  {
    name: "Janji",
    albums: [
      {
        name: "NCS",
        year: "2025",
        songs: [
          {
            id: "janji-heroes-tonight",
            title: "Heroes Tonight (feat. Johnning)",
            duration: "3:28",
            r2Key: "Janji - Heroes Tonight (feat. Johnning)  Progressive House  NCS - Copyright Free Music.mp3",
            audioUrlFallbacks: [
              "Janji - Heroes Tonight (feat. Johnning) Progressive House NCS Release.mp3",
              "Janji - Heroes Tonight (feat. Johnning).mp3",
            ],
          },
        ],
      },
    ],
  },
]
