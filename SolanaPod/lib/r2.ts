/**
 * Audio server base URL. All song paths (r2Key) are relative to this.
 * Set NEXT_PUBLIC_AUDIO_BASE_URL in .env.local or Vercel to use your own server.
 * Example: https://your-cdn.com or https://your-bucket.r2.dev
 * No trailing slash. If unset, falls back to the default R2 bucket.
 */
const DEFAULT_BASE = "https://py2n3vivgwmjcs3y.public.blob.vercel-storage.com"

export const AUDIO_BASE_URL =
  (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_AUDIO_BASE_URL) || DEFAULT_BASE

/** Build full audio URL from a path/key (e.g. "music/Artist - Song.mp3"). */
export function r2Url(objectKey: string): string {
  const encoded = objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `${AUDIO_BASE_URL}/${encoded}`
}
