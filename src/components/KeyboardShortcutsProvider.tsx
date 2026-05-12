"use client"

import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts"
import { CommandPalette } from "@/components/CommandPalette"

export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts()
  return (
    <>
      {children}
      <CommandPalette />
    </>
  )
}
