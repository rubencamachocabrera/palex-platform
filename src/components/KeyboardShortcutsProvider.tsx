"use client"

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts()
  return <>{children}</>
}
