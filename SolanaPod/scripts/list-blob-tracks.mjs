#!/usr/bin/env node
/**
 * Lists audio tracks from the blob store via the app's API.
 * Run with the dev server up: npm run dev (then in another terminal: node scripts/list-blob-tracks.mjs)
 * Or set BASE_URL to your deployed app, e.g. BASE_URL=https://solana-pod.vercel.app node scripts/list-blob-tracks.mjs
 */
const BASE_URL = process.env.BASE_URL || "http://localhost:3000"

async function main() {
  const url = `${BASE_URL.replace(/\/$/, "")}/api/audio/tracks`
  console.error("Fetching", url, "...")
  const res = await fetch(url)
  if (!res.ok) {
    console.error("Error:", res.status, res.statusText)
    const text = await res.text()
    if (text) console.error(text)
    process.exit(1)
  }
  const data = await res.json()
  const tracks = data.tracks || []
  const pathnames = tracks.map((t) => t.pathname)
  console.log(JSON.stringify({ pathnames, count: pathnames.length }, null, 2))
  pathnames.forEach((p) => console.error(p))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
