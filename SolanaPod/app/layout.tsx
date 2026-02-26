import type React from "react"
import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { Amiri, Fragment_Mono as Bitcount_Mono_Single, Rokkitt } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ClickWheelSoundProvider } from "@/hooks/use-click-wheel-sound"

const amiri = Amiri({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-amiri",
})

const bitcount = Bitcount_Mono_Single({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-bitcount",
})

const rokkitt = Rokkitt({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-rokkitt",
})

export const metadata: Metadata = {
  title: "Solana iPod – Crypto Music Player",
  description:
    "A Solana-themed iPod Classic music player with multiple crypto-inspired skins including Solana, Seeker, Phantom, and DeFi Mint.",
  generator: "v0.app",
  icons: {
    icon: "/favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${amiri.variable} ${bitcount.variable} ${rokkitt.variable}`}>
      <body className="font-sans">
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-JECD3HK5G8" strategy="afterInteractive" />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JECD3HK5G8');
          `}
        </Script>

        <ClickWheelSoundProvider>
          <Suspense fallback={<div>Loading...</div>}>
            {children}
            <Analytics />
          </Suspense>
        </ClickWheelSoundProvider>
      </body>
    </html>
  )
}
