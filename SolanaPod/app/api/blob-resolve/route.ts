import { list } from "@vercel/blob"
import { NextResponse } from "next/server"

/**
 * GET /api/blob-resolve?q=Heroes%20Tonight
 * Finds a blob whose pathname contains the search string (case-insensitive).
 * Returns the first match's pathname and url so the app can play it.
 * Used for "Heroes Tonight" when the exact path in Blob is unknown.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const q = (searchParams.get("q") ?? "").trim().toLowerCase()
    if (!q) {
      return NextResponse.json({ error: "Missing q (search query)" }, { status: 400 })
    }
    const { blobs } = await list({ limit: 1000 })
    const terms = q.split(/\s+/).filter(Boolean)
    const match = blobs.find((b) => {
      const lower = b.pathname.toLowerCase()
      return terms.every((t) => lower.includes(t))
    })
    if (!match) {
      return NextResponse.json({
        found: false,
        pathnames: blobs.map((b) => b.pathname),
      })
    }
    return NextResponse.json({ found: true, pathname: match.pathname, url: match.url })
  } catch (error) {
    console.error("[blob-resolve]", error)
    return NextResponse.json(
      { found: false, error: error instanceof Error ? error.message : "Resolve failed" },
      { status: 200 }
    )
  }
}
