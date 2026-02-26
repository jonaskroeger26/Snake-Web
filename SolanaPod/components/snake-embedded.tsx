"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useMusicPlayback } from "@/contexts/music-playback-context"

const GRID_SIZE = 14
const MEDIUM_TICK_MS = 120
const INITIAL_SNAKE = [{ x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) }]
const INITIAL_DIRECTION = { x: 1, y: 0 }
const SNAKE_COLOR = "#14F195"
const FOOD_EMOJI = "🍎"

function randomFood(snake: { x: number; y: number }[]): { x: number; y: number } {
  let newFood: { x: number; y: number }
  let attempts = 0
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
    attempts++
  } while (
    attempts < 100 &&
    snake.some((seg) => seg.x === newFood.x && seg.y === newFood.y)
  )
  return newFood
}

export function SnakeEmbedded() {
  const { gameDirectionRef, snakeRestartRef } = useMusicPlayback()
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [food, setFood] = useState(() => randomFood(INITIAL_SNAKE))
  const [score, setScore] = useState(0)
  const [screen, setScreen] = useState<"playing" | "gameOver">("playing")
  const directionRef = useRef(INITIAL_DIRECTION)
  const snakeRef = useRef(INITIAL_SNAKE)
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const cellSizeRef = useRef(12)

  const restart = useCallback(() => {
    const start = INITIAL_SNAKE
    setSnake(start)
    snakeRef.current = start
    setFood(randomFood(start))
    setScore(0)
    directionRef.current = INITIAL_DIRECTION
    setScreen("playing")
    gameDirectionRef.current = null
  }, [gameDirectionRef])

  useEffect(() => {
    snakeRestartRef.current = restart
    return () => {
      snakeRestartRef.current = null
    }
  }, [restart, snakeRestartRef])

  useEffect(() => {
    if (screen !== "playing") return

    const gameLoop = () => {
      const pending = gameDirectionRef.current
      if (pending) {
        const cur = directionRef.current
        if (pending.x !== -cur.x || pending.y !== -cur.y) {
          directionRef.current = pending
          gameDirectionRef.current = null
        }
      }

      const body = snakeRef.current
      if (!body.length) return

      const head = {
        x: body[0].x + directionRef.current.x,
        y: body[0].y + directionRef.current.y,
      }

      if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
        if (gameLoopRef.current) {
          clearInterval(gameLoopRef.current)
          gameLoopRef.current = null
        }
        setScreen("gameOver")
        return
      }

      for (let i = 0; i < body.length; i++) {
        if (head.x === body[i].x && head.y === body[i].y) {
          if (gameLoopRef.current) {
            clearInterval(gameLoopRef.current)
            gameLoopRef.current = null
          }
          setScreen("gameOver")
          return
        }
      }

      let newSnake = [head, ...body]
      if (head.x === food.x && head.y === food.y) {
        setScore((s) => s + 1)
        const nextFood = randomFood(newSnake)
        setFood(nextFood)
      } else {
        newSnake.pop()
      }

      snakeRef.current = newSnake
      setSnake(newSnake)
    }

    gameLoopRef.current = setInterval(gameLoop, MEDIUM_TICK_MS)
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
      gameLoopRef.current = null
    }
  }, [screen, food])

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight
      const cellSize = Math.min(Math.floor(w / GRID_SIZE), Math.floor(h / GRID_SIZE))
      cellSizeRef.current = cellSize
      canvas.width = GRID_SIZE * cellSize
      canvas.height = GRID_SIZE * cellSize
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const cs = cellSizeRef.current
    const w = GRID_SIZE * cs
    const h = GRID_SIZE * cs

    ctx.fillStyle = "#0a0a0a"
    ctx.fillRect(0, 0, w, h)

    snake.forEach((seg, i) => {
      ctx.fillStyle = SNAKE_COLOR
      ctx.fillRect(seg.x * cs + 1, seg.y * cs + 1, cs - 2, cs - 2)
    })

    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.font = `${Math.max(10, cs - 2)}px sans-serif`
    ctx.fillText(FOOD_EMOJI, food.x * cs + cs / 2, food.y * cs + cs / 2)
  }, [snake, food])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden rounded-[14px] md:rounded-[11px] lg:rounded-[14px]"
    >
      <div className="absolute top-1 left-1 text-[10px] font-mono text-white/80 z-10">
        Score: {score}
      </div>
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full"
        style={{ imageRendering: "pixelated" }}
      />
      {screen === "gameOver" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 z-20">
          <div className="text-white font-bold text-lg">Game Over</div>
          <div className="text-white/90 text-sm">Score: {score}</div>
          <div className="text-white/70 text-xs">Select to play again · Menu to exit</div>
        </div>
      )}
    </div>
  )
}
