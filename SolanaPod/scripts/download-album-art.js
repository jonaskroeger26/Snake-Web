import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Read the music library file
const libraryPath = path.join(__dirname, "../lib/music-library.ts")
const libraryContent = fs.readFileSync(libraryPath, "utf-8")

// Extract the musicLibrary array from the TypeScript file
const libraryMatch = libraryContent.match(/export const musicLibrary: Artist\[\] = (\[[\s\S]*?\]);/)
if (!libraryMatch) {
  console.error("Could not find musicLibrary in the file")
  process.exit(1)
}

// Parse the library data (convert TypeScript to JSON-like format)
const libraryString = libraryMatch[1]
  .replace(/\/\/.*/g, "") // Remove comments
  .replace(/(\w+):/g, '"$1":') // Add quotes to keys
  .replace(/'/g, '"') // Replace single quotes with double quotes

let musicLibrary
try {
  musicLibrary = eval(`(${libraryString})`)
} catch (e) {
  console.error("Error parsing music library:", e)
  process.exit(1)
}

// Create base directory for album art
const albumArtDir = path.join(__dirname, "../public/album-art")
if (!fs.existsSync(albumArtDir)) {
  fs.mkdirSync(albumArtDir, { recursive: true })
}

// Function to sanitize filename
function sanitizeFilename(name) {
  return name.replace(/[^a-z0-9]/gi, "-").toLowerCase()
}

// Function to download image
async function downloadImage(url, filepath) {
  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`Failed to download ${url}: ${response.statusText}`)
      return false
    }

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(filepath, Buffer.from(buffer))
    console.log(`Downloaded: ${filepath}`)
    return true
  } catch (error) {
    console.error(`Error downloading ${url}:`, error.message)
    return false
  }
}

// Process each artist
async function processArtists() {
  const updates = []

  for (const artist of musicLibrary) {
    console.log(`\nProcessing artist: ${artist.name}`)

    // Create artist directory
    const artistDir = path.join(albumArtDir, sanitizeFilename(artist.name))
    if (!fs.existsSync(artistDir)) {
      fs.mkdirSync(artistDir, { recursive: true })
    }

    // Download artist photo if exists
    if (artist.photoUrl && artist.photoUrl.startsWith("http")) {
      const photoFilename = "artist-photo.jpg"
      const photoPath = path.join(artistDir, photoFilename)

      if (!fs.existsSync(photoPath)) {
        await downloadImage(artist.photoUrl, photoPath)
      } else {
        console.log(`Skipping existing: ${photoPath}`)
      }

      updates.push({
        type: "artist-photo",
        artistName: artist.name,
        oldUrl: artist.photoUrl,
        newUrl: `/album-art/${sanitizeFilename(artist.name)}/${photoFilename}`,
      })
    }

    // Process albums
    for (const album of artist.albums) {
      if (album.coverUrl && album.coverUrl.startsWith("http")) {
        const albumFilename = `${sanitizeFilename(album.name)}.jpg`
        const albumPath = path.join(artistDir, albumFilename)

        if (!fs.existsSync(albumPath)) {
          await downloadImage(album.coverUrl, albumPath)
        } else {
          console.log(`Skipping existing: ${albumPath}`)
        }

        updates.push({
          type: "album-cover",
          artistName: artist.name,
          albumName: album.name,
          oldUrl: album.coverUrl,
          newUrl: `/album-art/${sanitizeFilename(artist.name)}/${albumFilename}`,
        })
      }
    }
  }

  return updates
}

// Update the music library file
function updateMusicLibrary(updates) {
  let updatedContent = libraryContent

  for (const update of updates) {
    // Escape special regex characters in the URL
    const escapedOldUrl = update.oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const regex = new RegExp(escapedOldUrl, "g")
    updatedContent = updatedContent.replace(regex, update.newUrl)
  }

  fs.writeFileSync(libraryPath, updatedContent, "utf-8")
  console.log("\n✅ Music library updated with local image paths")
}

// Main execution
console.log("Starting album art download...\n")
processArtists()
  .then((updates) => {
    console.log(`\n📊 Summary:`)
    console.log(`Total images processed: ${updates.length}`)
    console.log(`Artist photos: ${updates.filter((u) => u.type === "artist-photo").length}`)
    console.log(`Album covers: ${updates.filter((u) => u.type === "album-cover").length}`)

    updateMusicLibrary(updates)
    console.log("\n✨ Done!")
  })
  .catch((error) => {
    console.error("Error:", error)
    process.exit(1)
  })
