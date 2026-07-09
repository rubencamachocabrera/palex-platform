import { NextRequest, NextResponse } from "next/server"
import { getRedis } from "@/lib/redis"

interface RateLimitEntry {
  count: number
  resetAt: number
}

// Fallback in-memory cuando Redis no esta configurado
const memStore = new Map<string, RateLimitEntry>()
let lastCleanup = Date.now()
function maybePurge(now: number) {
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  for (const [k, v] of memStore) {
    if (now > v.resetAt) memStore.delete(k)
  }
}

function memIncrement(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  maybePurge(now)
  const entry = memStore.get(key)
  if (!entry || now > entry.resetAt) {
    memStore.set(key, { count: 1, resetAt: now + windowMs })
    return false
  }
  if (entry.count >= limit) return true
  entry.count++
  return false
}

async function redisIncrement(key: string, limit: number, windowMs: number): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return memIncrement(key, limit, windowMs)
  try {
    const redisKey = `rl:${key}`
    const count = await redis.incr(redisKey)
    if (count === 1) await redis.pexpire(redisKey, windowMs)
    return count > limit
  } catch {
    return memIncrement(key, limit, windowMs)
  }
}

interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

/** Rate limit por clave arbitraria (ej. login por IP). Usa Redis si esta configurado, memoria si no. */
export async function checkRateLimitByKey(
  key: string,
  options: RateLimitOptions = {}
): Promise<boolean> {
  const { limit = 60, windowMs = 60_000 } = options
  return redisIncrement(key, limit, windowMs)
}

/** Rate limit por ruta de API (IP + nombre de ruta). Usa Redis si esta configurado, memoria si no. */
export async function checkRateLimit(
  req: NextRequest,
  route: string,
  options: RateLimitOptions = {}
): Promise<NextResponse | null> {
  const { limit = 60, windowMs = 60_000 } = options
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  const key = ip + ":" + route
  const exceeded = await redisIncrement(key, limit, windowMs)
  if (!exceeded) return null
  // Retry-After preciso solo si el fallback in-memory registro la entrada; si vino de Redis, aproximamos con windowMs.
  const entry = memStore.get(key)
  const retryAfterMs = entry ? entry.resetAt - Date.now() : windowMs
  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(Math.max(retryAfterMs, 0) / 1000)),
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  )
}
