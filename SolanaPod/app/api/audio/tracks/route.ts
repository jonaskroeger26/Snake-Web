import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

const AUDIO_EXT = /\.(mp3|wav|m4a|ogg|aac|flac)(\?.*)?$/i

/**
 * GET /api/audio/tracks
 * Lists all audio blobs in the store so the app can show them (e.g. new uploads).
 */
export async function GET() {
  try {
    const { blobs } = await list({ limit: 500 })
    const tracks = blobs
      .filter((b) => AUDIO_EXT.test(b.pathname))
      .map((b) => ({ pathname: b.pathname, url: b.url }))
    return NextResponse.json({ tracks })
  } catch (error) {
    console.error("[audio/tracks]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    )
  }
}
