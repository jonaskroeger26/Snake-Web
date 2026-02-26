import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

/**
 * GET /api/audio/heroes-tonight
 * Returns the public URL for the "Heroes Tonight" blob (any pathname containing "Heroes" and "Tonight").
 * Used so the Janji track always gets the correct URL from the Blob store.
 */
export async function GET() {
  try {
    const { blobs } = await list({ limit: 1000 })
    const match = blobs.find((b) => {
      const lower = b.pathname.toLowerCase()
      return lower.includes("heroes") && lower.includes("tonight")
    })
    if (!match) {
      return NextResponse.json(
        { error: "Not found", pathnames: blobs.map((b) => b.pathname) },
        { status: 404 }
      )
    }
    return NextResponse.json({ url: match.url, pathname: match.pathname })
  } catch (error) {
    console.error("[heroes-tonight]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    )
  }
}
