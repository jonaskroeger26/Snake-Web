import { put } from "@vercel/blob"
import { NextResponse } from "next/server"

/**
 * POST /api/upload
 * Body: FormData with a "file" field (and optional "path" for the blob path).
 * Uploads the file to Vercel Blob and returns the public URL.
 * Example: const { url } = await put('music/song.mp3', file, { access: 'public' });
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const path = (formData.get("path") as string) || undefined

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    const blobPath = path || `uploads/${Date.now()}-${file.name}`
    const { url } = await put(blobPath, file, { access: "public" })

    return NextResponse.json({ url })
  } catch (error) {
    console.error("[upload]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    )
  }
}
