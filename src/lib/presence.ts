import { getRedis } from "@/lib/redis"

interface PresenceEntry {
  userId: string
  nombre: string
  lastSeen: number
}

const TIMEOUT_MS = 15_000

// --- Fallback in-memory (single instance) ---
const memStore = new Map<string, Map<string, PresenceEntry>>()
let lastCleanup = Date.now()
function maybePurge(now: number) {
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [entityKey, users] of memStore) {
    for (const [uid, entry] of users) {
      if (now - entry.lastSeen > TIMEOUT_MS) users.delete(uid)
    }
    if (users.size === 0) memStore.delete(entityKey)
  }
}

// --- Redis-backed presence (cross-instance) ---
const REDIS_PREFIX = "pres:"
const REDIS_TTL_S = Math.ceil(TIMEOUT_MS / 1000) + 2

export async function heartbeat(entityType: string, entityId: string, userId: string, nombre: string) {
  const now = Date.now()
  const key = `${entityType}:${entityId}`
  const redis = getRedis()
  if (redis) {
    try {
      const redisKey = `${REDIS_PREFIX}${key}`
      const entry = JSON.stringify({ userId, nombre, lastSeen: now })
      await redis.hset(redisKey, { [userId]: entry })
      await redis.expire(redisKey, REDIS_TTL_S)
      return
    } catch { /* fallback below */ }
  }
  maybePurge(now)
  if (!memStore.has(key)) memStore.set(key, new Map())
  memStore.get(key)!.set(userId, { userId, nombre, lastSeen: now })
}

export async function getActiveUsers(entityType: string, entityId: string, excludeUserId?: string): Promise<string[]> {
  const now = Date.now()
  const key = `${entityType}:${entityId}`
  const redis = getRedis()
  if (redis) {
    try {
      const redisKey = `${REDIS_PREFIX}${key}`
      const all = await redis.hgetall(redisKey) as Record<string, string> | null
      if (!all) return []
      const names: string[] = []
      const stale: string[] = []
      for (const [uid, raw] of Object.entries(all)) {
        const entry: PresenceEntry = typeof raw === "string" ? JSON.parse(raw) : raw as unknown as PresenceEntry
        if (now - entry.lastSeen > TIMEOUT_MS) { stale.push(uid); continue }
        if (uid !== excludeUserId) names.push(entry.nombre)
      }
      if (stale.length > 0) redis.hdel(redisKey, ...stale).catch(() => {})
      return names
    } catch { /* fallback below */ }
  }
  const users = memStore.get(key)
  if (!users) return []
  const names: string[] = []
  for (const [uid, entry] of users) {
    if (now - entry.lastSeen > TIMEOUT_MS) { users.delete(uid); continue }
    if (uid !== excludeUserId) names.push(entry.nombre)
  }
  return names
}

export async function leave(entityType: string, entityId: string, userId: string) {
  const key = `${entityType}:${entityId}`
  const redis = getRedis()
  if (redis) {
    try {
      await redis.hdel(`${REDIS_PREFIX}${key}`, userId)
      return
    } catch { /* fallback below */ }
  }
  memStore.get(key)?.delete(userId)
}
