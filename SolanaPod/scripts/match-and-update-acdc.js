// Script to match AC/DC songs from YouTube and Spotify data
// and update the music library with matched songs

const youtubeData = [
  {
    artist: "AC/DC",
    title: "Shot In The Dark",
    videoId: "0JtBHvyLQHg",
  },
  {
    artist: "AC/DC",
    title: "Realize",
    videoId: "Ba2V_SRsGhk",
  },
  {
    artist: "AC/DC",
    title: "Through The Mists Of Time",
    videoId: "YrinrYwijTM",
  },
  {
    artist: "AC/DC",
    title: "Demon Fire",
    videoId: "qrB6D7L0xIQ",
  },
  {
    artist: "AC/DC",
    title: "Witch's Spell",
    videoId: "k80cUmdjKlk",
  },
  {
    artist: "AC/DC",
    title: "Kick You When You're Down",
    videoId: "fMB8Pn0dnaI",
  },
  {
    artist: "AC/DC",
    title: "Rejection",
    videoId: "9s0rRaBEmrs",
  },
  {
    artist: "AC/DC",
    title: "Wild Reputation",
    videoId: "BdDISKqqEFQ",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Rock or Bust (Official Video)",
    videoId: "AJtZ0UUcX6c",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Play Ball (Official Video)",
    videoId: "TT8e7i0ccLQ",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Rock the Blues Away (Official Video)",
    videoId: "RJ0ZCh7DPh0",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Thunderstruck (Official Video)",
    videoId: "v2AC41dglnM",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - You Shook Me All Night Long (Official Video)",
    videoId: "Lo2qQmj0_h4",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Highway to Hell (Official Video)",
    videoId: "l482T0yNkeo",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Back In Black (Official Video)",
    videoId: "pAgnJDJN4VA",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Who Made Who (Official Video)",
    videoId: "i8UrdY4LbD8",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Hells Bells (Official Video)",
    videoId: "etAIpkdhU9Q",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Shoot To Thrill (Iron Man 2 Version)",
    videoId: "Bomv-6CJSfM",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Dirty Deeds Done Dirt Cheap (Official Video)",
    videoId: "onE43hTilNs",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - For Those About to Rock (We Salute You) (Official Video)",
    videoId: "tXaZmY52gHM",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Highway to Hell (Live At River Plate, December 2009)",
    videoId: "LOwprXdmIpo",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - You Shook Me All Night Long (Live At River Plate, December 2009)",
    videoId: "PVyS9JwtFoQ",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Moneytalks (Official Video)",
    videoId: "toCFhUFajaY",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Are You Ready (Official Video)",
    videoId: "ZAw4ybUAHKg",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Big Gun (Official Video)",
    videoId: "8fPf6L0XNvM",
  },
  {
    artist: "AC/DC",
    title: "AC/DC - Let There Be Rock (Live At River Plate, December 2009)",
    videoId: "DRsFnHqXM44",
  },
]

const spotifyData = {
  albums: [
    {
      albumOrEPName: "POWER UP",
      releaseYear: "2020",
      tracks: [
        { songName: "Realize", duration: "3:37" },
        { songName: "Rejection", duration: "4:06" },
        { songName: "Shot In The Dark", duration: "3:05" },
        { songName: "Through The Mists Of Time", duration: "3:32" },
        { songName: "Kick You When You're Down", duration: "3:10" },
        { songName: "Witch's Spell", duration: "3:42" },
        { songName: "Demon Fire", duration: "3:30" },
        { songName: "Wild Reputation", duration: "2:54" },
      ],
    },
    {
      albumOrEPName: "Rock or Bust",
      releaseYear: "2014",
      tracks: [
        { songName: "Rock or Bust", duration: "3:03" },
        { songName: "Play Ball", duration: "2:47" },
        { songName: "Rock the Blues Away", duration: "3:24" },
      ],
    },
    {
      albumOrEPName: "The Razors Edge",
      releaseYear: "1990",
      tracks: [
        { songName: "Thunderstruck", duration: "4:53" },
        { songName: "Moneytalks", duration: "3:46" },
        { songName: "Are You Ready", duration: "4:10" },
      ],
    },
    {
      albumOrEPName: "Back In Black",
      releaseYear: "1980",
      tracks: [
        { songName: "Hells Bells", duration: "5:12" },
        { songName: "Shoot to Thrill", duration: "5:17" },
        { songName: "Back In Black", duration: "4:15" },
        { songName: "You Shook Me All Night Long", duration: "3:30" },
      ],
    },
    {
      albumOrEPName: "Highway to Hell",
      releaseYear: "1979",
      tracks: [{ songName: "Highway to Hell", duration: "3:28" }],
    },
    {
      albumOrEPName: "Who Made Who",
      releaseYear: "1986",
      tracks: [{ songName: "Who Made Who", duration: "3:27" }],
    },
    {
      albumOrEPName: "Dirty Deeds Done Dirt Cheap",
      releaseYear: "1976",
      tracks: [{ songName: "Dirty Deeds Done Dirt Cheap", duration: "3:52" }],
    },
    {
      albumOrEPName: "For Those About to Rock (We Salute You)",
      releaseYear: "1981",
      tracks: [{ songName: "For Those About to Rock (We Salute You)", duration: "5:44" }],
    },
    {
      albumOrEPName: "Let There Be Rock",
      releaseYear: "1977",
      tracks: [{ songName: "Let There Be Rock", duration: "6:06" }],
    },
  ],
}

// Normalize song title for matching
function normalizeSongTitle(title) {
  return title
    .toLowerCase()
    .replace(/ac\/dc\s*-\s*/gi, "") // Remove "AC/DC -" prefix
    .replace(/$$official video$$/gi, "")
    .replace(/$$live.*?$$/gi, "")
    .replace(/$$.*?version$$/gi, "")
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
}

// Match songs
const matchedAlbums = []

for (const album of spotifyData.albums) {
  const matchedTracks = []

  for (const track of album.tracks) {
    const normalizedSpotifyTitle = normalizeSongTitle(track.songName)

    // Find matching YouTube video
    const youtubeMatch = youtubeData.find((yt) => {
      const normalizedYoutubeTitle = normalizeSongTitle(yt.title)
      return (
        normalizedYoutubeTitle.includes(normalizedSpotifyTitle) ||
        normalizedSpotifyTitle.includes(normalizedYoutubeTitle)
      )
    })

    if (youtubeMatch) {
      matchedTracks.push({
        id: youtubeMatch.videoId,
        title: track.songName,
        duration: track.duration,
      })
      console.log(`✓ Matched: "${track.songName}" -> ${youtubeMatch.videoId}`)
    } else {
      console.log(`✗ No match: "${track.songName}"`)
    }
  }

  if (matchedTracks.length > 0) {
    matchedAlbums.push({
      name: album.albumOrEPName,
      year: album.releaseYear,
      coverUrl: `https://i.ytimg.com/vi/${matchedTracks[0].id}/mqdefault.jpg`,
      songs: matchedTracks,
    })
  }
}

console.log("\n=== MATCHED ALBUMS ===")
console.log(JSON.stringify(matchedAlbums, null, 2))
console.log(`\nTotal albums: ${matchedAlbums.length}`)
console.log(`Total songs: ${matchedAlbums.reduce((sum, album) => sum + album.songs.length, 0)}`)
