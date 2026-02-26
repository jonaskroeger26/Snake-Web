// scripts/merge-json-libs.js
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, resolve, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Allow overrides; otherwise use repo layout
const libraryPath = resolve(process.env.LIB_PATH ?? resolve(__dirname, "../lib/music-library.ts"))
const jsonDir = resolve(process.env.JSON_DIR ?? resolve(__dirname, "../lib/metadata-json-enriched"))

function extractYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtube\.com\/.*[?&]v=)([^&\s#]+)/i,
    /youtu\.be\/([^?&#\s]+)/i,
    /m\.youtube\.com\/watch\?v=([^&\s#]+)/i,
    /youtube\.com\/shorts\/([^?&#\s]+)/i,
  ]
  for (const rx of patterns) {
    const m = url.match(rx)
    if (m && m[1]) return m[1]
  }
  return null
}

function normalizeArtistName(name) {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ")
}

function die(...msg) {
  console.error(...msg)
  process.exit(1)
}

console.log("[v0] Starting JSON to music library merge...")
console.log("[v0] Using library path:", libraryPath)
console.log("[v0] Using JSON dir:", jsonDir)

if (!existsSync(libraryPath)) die("[v0] Error: music-library.ts not found at", libraryPath)
if (!existsSync(jsonDir)) die("[v0] Error: metadata JSON directory not found at", jsonDir)

// ------- read & index existing library ------
let libraryContent = readFileSync(libraryPath, "utf-8")

const existingSongIds = new Set()
for (const m of libraryContent.matchAll(/id:\s*["'`]([^"'`]+)["'`]/g)) {
  existingSongIds.add(m[1])
}

const existingArtists = new Map()
for (const m of libraryContent.matchAll(
  /{\s*name:\s*["'`]([^"'`]+)["'`],\s*(?:photoUrl:[^,]*,\s*)?albums\s*:\s*\[/g
)) {
  existingArtists.set(normalizeArtistName(m[1]), m[1])
}

console.log("[v0] Found", existingSongIds.size, "existing songs in library")
console.log("[v0] Found", existingArtists.size, "existing artists in library")

// ------- scan JSON inputs ------
const jsonFiles = readdirSync(jsonDir).filter((f) => f.endsWith(".json"))
console.log("[v0] Found", jsonFiles.length, "JSON files to process")

let newSongsAdded = 0
let newAlbumsAdded = 0
const artistsToAppend = [] // brand-new artists to add

// Build TS object text for an album
function albumToTs(album) {
  const lines = []
  lines.push(`      {`)
  lines.push(`        name: "${(album.name || "").replace(/"/g, '\\"')}",`)
  if (album.year) lines.push(`        year: "${album.year}",`)
  if (album.coverUrl) lines.push(`        coverUrl: "${(album.coverUrl || "").replace(/"/g, '\\"')}",`)
  lines.push(`        songs: [`)
  for (const s of album.songs) {
    lines.push(`          { id: "${s.id}", title: "${(s.title || "").replace(/"/g, '\\"')}" },`)
  }
  lines.push(`        ],`)
  lines.push(`      }`)
  return lines.join("\n")
}

// Build TS object text for a whole artist
function artistToTs(artist) {
  const albums = artist.albums.map(albumToTs).join(",\n")
  return `  {
    name: "${artist.name.replace(/"/g, '\\"')}",
    albums: [
${albums}
    ],
  }`
}

// Find albums array bounds for a given artist name (works with normal formatting)
function findAlbumsArrayBoundsForArtist(src, artistName) {
  const esc = artistName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
  const re = new RegExp(String.raw`{\s*name:\s*["'\`]${esc}["'\`][\s\S]*?albums\s*:\s*\[`, "m")
  const m = re.exec(src)
  if (!m) return null
  const startIdx = m.index + m[0].lastIndexOf("[")
  let i = startIdx, depth = 0, endIdx = -1
  while (i < src.length) {
    const ch = src[i]
    if (ch === "[") depth++
    else if (ch === "]") {
      depth--
      if (depth === 0) { endIdx = i; break }
    }
    i++
  }
  if (endIdx === -1) return null
  return { openIdx: startIdx, closeIdx: endIdx }
}

// Replace albums array content with existing + appended
function insertAlbumsIntoArtist(src, artistName, albumsToAdd) {
  const bounds = findAlbumsArrayBoundsForArtist(src, artistName)
  if (!bounds) return null
  const beforeOpen = src.slice(0, bounds.openIdx + 1)
  const inside = src.slice(bounds.openIdx + 1, bounds.closeIdx)
  const afterClose = src.slice(bounds.closeIdx)

  const existingTrim = inside.trim()
  const appended = albumsToAdd.map(albumToTs).join(",\n")

  let newInside
  if (existingTrim === "") {
    newInside = `\n${appended}\n`
  } else {
    // ensure existing ends with a comma
    const existingWithComma = /,\s*$/.test(existingTrim) ? existingTrim : existingTrim + ","
    newInside = `\n${existingWithComma}\n${appended}\n`
  }

  return beforeOpen + newInside + afterClose
}

for (const jsonFile of jsonFiles) {
  console.log("[v0] Processing:", jsonFile)
  const jsonPath = join(jsonDir, jsonFile)
  const data = JSON.parse(readFileSync(jsonPath, "utf-8"))

  const artistName = data.artist || data.name || "Unknown Artist"
  const normArtist = normalizeArtistName(artistName)
  const albumsIn = Array.isArray(data.albums) ? data.albums : []

  // Build new album payloads (only songs with YouTube IDs not already in library)
  const albumsBuilt = []
  for (const album of albumsIn) {
    const albumName = album.album || album.name || "Unknown Album"
    const year = album.year || undefined
    const coverUrl = album.coverUrl || album.albumArt || undefined
    const songsSrc = Array.isArray(album.songs) ? album.songs : []

    const songs = songsSrc
      .map((s) => {
        const vid = extractYouTubeId(s.youtube)
        if (!vid) return null
        if (existingSongIds.has(vid)) return null
        return { id: vid, title: s.title || "" }
      })
      .filter(Boolean)

    if (songs.length > 0) {
      newSongsAdded += songs.length
      newAlbumsAdded += 1
      albumsBuilt.push({ name: albumName, year, coverUrl, songs })
      for (const s of songs) existingSongIds.add(s.id)
    }
  }

  if (albumsBuilt.length === 0) {
    console.log("[v0]   No new songs for this artist. Skipping.")
    continue
  }

  if (existingArtists.has(normArtist)) {
    const updated = insertAlbumsIntoArtist(libraryContent, existingArtists.get(normArtist), albumsBuilt)
    if (!updated) {
      console.warn(`[v0]   Could not locate albums[] for "${artistName}" automatically. Skipping auto-insert for this artist.`)
      continue
    }
    libraryContent = updated
    console.log(`[v0]   Injected ${albumsBuilt.length} new album(s) into ${artistName}.`)
  } else {
    artistsToAppend.push({ name: artistName, albums: albumsBuilt })
    console.log(`[v0]   Staged new artist "${artistName}" with ${albumsBuilt.length} album(s) for append.`)
  }
}

// Append brand-new artists at the end of musicLibrary array
if (artistsToAppend.length > 0) {
  const artistsCode = artistsToAppend.map(artistToTs).join(",\n")
  // try to find end of musicLibrary array: look for the last closing bracket ']' before '];' or before an export
  const endMatch = libraryContent.match(/(\n]\s*;\s*$|\n]\s*\n\s*export\s+)/m)
  if (endMatch) {
    const insertAt = endMatch.index
    const before = libraryContent.slice(0, insertAt)
    const after = libraryContent.slice(insertAt)
    const needsComma = !before.trimEnd().endsWith(",")
    libraryContent = before + (needsComma ? "," : "") + "\n" + artistsCode + after
    console.log("[v0] Appended", artistsToAppend.length, "new artist(s) to musicLibrary.")
  } else {
    console.warn("[v0] Could not auto-locate end of musicLibrary array. New artists not appended.")
  }
}

// ------- write once -------
writeFileSync(libraryPath, libraryContent, "utf-8")

console.log("[v0] Summary:")
console.log("[v0]   New albums:", newAlbumsAdded)
console.log("[v0]   New songs:", newSongsAdded)
console.log("[v0]   New artists appended:", artistsToAppend.length)
console.log("[v0] Merge complete! ✔")
