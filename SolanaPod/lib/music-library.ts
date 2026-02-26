export interface Song {
  id: string // YouTube video ID
  title: string
  duration?: string
  /**
   * Optional direct audio URL for native playback (Expo app).
   * When present, the native app can stream this instead of relying on YouTube.
   */
  audioUrl?: string
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
          {
            id: "ACuG31JtcGs",
            title: "Amor En Ritmo",
            duration: "2:49",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Amor%20en%20Ritmo.wav",
          },
          {
            id: "4mkR5XDO8iI",
            title: "Love in the Air",
            duration: "3:58",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Love%20in%20the%20Air.wav",
          },
          {
            id: "8-7LRfXxHY0",
            title: "Endless Nights",
            duration: "3:13",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Endless%20Nights.wav",
          },
          {
            id: "UZ9sFRpcvNs",
            title: "Lost Vibes",
            duration: "3:31",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Lost%20Vibes.wav",
          },
          {
            id: "4AVw8CR8J84",
            title: "Midnight Serenade",
            duration: "2:49",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Midnight%20Serenade.wav",
          },
          {
            id: "-EoJD-oKwg0",
            title: "Neon Nights",
            duration: "2:47",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Neon%20Nights.wav",
          },
          {
            id: "3rdFW0aHwOs",
            title: "Pulse of the Night",
            duration: "3:20",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Pulse%20of%20the%20Night.wav",
          },
          {
            id: "ydmMCdHe-hE",
            title: "Heartstrings Serenade",
            duration: "3:49",
            audioUrl:
              "https://pub-ee2c3e2f11a34fe5828989a603e24aec.r2.dev/music/Heartstrings%20Serenade%20%28Remastered%29.wav",
          },
        ],
      },
    ],
  },
]
