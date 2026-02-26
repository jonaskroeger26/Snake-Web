"use client"

import { useEffect, useRef } from "react"

export function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const bars = 60
    const barWidth = canvas.width / bars
    const barHeights = Array(bars)
      .fill(0)
      .map(() => Math.random())
    const barSpeeds = Array(bars)
      .fill(0)
      .map(() => 0.02 + Math.random() * 0.03)

    function animate() {
      if (!ctx || !canvas) return

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < bars; i++) {
        barHeights[i] += barSpeeds[i]
        if (barHeights[i] > 1) barHeights[i] = 0

        const height = Math.sin(barHeights[i] * Math.PI) * (canvas.height * 0.4)
        const x = i * barWidth
        const y = canvas.height / 2 - height / 2

        const gradient = ctx.createLinearGradient(x, y, x, y + height)
        gradient.addColorStop(0, "rgba(100, 200, 200, 0.1)")
        gradient.addColorStop(0.5, "rgba(80, 150, 180, 0.2)")
        gradient.addColorStop(1, "rgba(60, 100, 150, 0.1)")

        ctx.fillStyle = gradient
        ctx.fillRect(x, y, barWidth - 2, height)
      }

      requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-40" />
}
