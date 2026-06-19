interface PresenceEntry {
  userId: string
  nombre: string
  lastSeen: number
}

const TIMEOUT_MS = 15_000
const store = new Map<string, Map<string, PresenceEntry>>()

let lastCleanup = Date.now()
function maybePurge(now: number) {
  if (now - lastCleanup < 60_000) return
  lastCleanup = now
  for (const [entityKey, users] of store) {
    for (const [uid, entry] of users) {
      if (now - entry.lastSeen > TIMEOUT_MS) users.delete(uid)
    }
    if (users.size === 0) store.delete(entityKey)
  }
}

export function heartbeat(entityType: string, entityId: string, userId: string, nombre: string) {
  const now = Date.now()
  maybePurge(now)
  const key = `${entityType}:${entityId}`
  if (!store.has(key)) store.set(key, new Map())
  store.get(key)!.set(userId, { userId, nombre, lastSeen: now })
}

export function getActiveUsers(entityType: string, entityId: string, excludeUserId?: string): string[] {
  const now = Date.now()
  const key = `${entityType}:${entityId}`
  const users = store.get(key)
  if (!users) return []
  const names: string[] = []
  for (const [uid, entry] of users) {
    if (now - entry.lastSeen > TIMEOUT_MS) { users.delete(uid); continue }
    if (uid !== excludeUserId) names.push(entry.nombre)
  }
  return names
}

export function leave(entityType: string, entityId: string, userId: string) {
  const key = `${entityType}:${entityId}`
  store.get(key)?.delete(userId)
}
