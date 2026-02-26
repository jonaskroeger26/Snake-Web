import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

/**
 * GET /api/list-blobs?prefix=music
 * Lists blob pathnames in your store (optionally filtered by prefix).
 * Use this to see the exact path for "Heroes Tonight" and update the music library.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const prefix = searchParams.get("prefix") ?? ""
    const { blobs } = await list({ prefix, limit: 500 })
    const pathnames = blobs.map((b) => ({ pathname: b.pathname, url: b.url }))
    return NextResponse.json({ pathnames })
  } catch (error) {
    console.error("[list-blobs]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "List failed" },
      { status: 500 }
    )
  }
}
