import { NextRequest, NextResponse } from "next/server"

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup periódico cada 5 minutos para evitar crecimiento ilimitado del Map
let lastCleanup = Date.now()
function maybePurge(now: number) {
  if (now - lastCleanup < 300_000) return
  lastCleanup = now
  for (const [k, v] of store) {
    if (now > v.resetAt) store.delete(k)
  }
}

interface RateLimitOptions {
  limit?: number
  windowMs?: number
}

export function checkRateLimit(
  req: NextRequest,
  route: string,
  options: RateLimitOptions = {}
): NextResponse | null {
  const { limit = 60, windowMs = 60_000 } = options

  // Railway pone la IP real en x-forwarded-for (primer valor)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"

  const key = ip + ":" + route
  const now = Date.now()

  maybePurge(now)

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (entry.count >= limit) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((entry.resetAt - now) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    )
  }

  entry.count++
  return null
}
