"use client"

import Image from "next/image"

export const BOOT_LOGO_HOLD_MS = 2500
export const BOOT_FADE_MS = 600

export type BootPhase = "fadeIn" | "hold" | "fadeOut"

/** Renders the boot logo for use inside the iPod display; opacity driven by phase */
export function BootLogoDisplay({ phase }: { phase: BootPhase }) {
  const opacity = phase === "fadeIn" ? 0 : phase === "hold" ? 1 : 0
  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black rounded-[14px] md:rounded-[11px] lg:rounded-[14px] overflow-hidden"
      style={{
        opacity,
        transition: `opacity ${BOOT_FADE_MS}ms ease-out`,
      }}
    >
      <Image
        src="/boot-logo.png"
        alt=""
        width={320}
        height={320}
        className="w-full h-full object-contain"
        priority
      />
    </div>
  )
}
