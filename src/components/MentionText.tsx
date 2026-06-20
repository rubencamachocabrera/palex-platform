"use client"

import React from "react"

// Pattern: @[userId:Nombre Apellido]
const MENTION_RE = /@\[([^:]+):([^\]]+)\]/g

interface Props {
  text: string
  className?: string
}

export function MentionText({ text, className }: Props) {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  const regex = new RegExp(MENTION_RE)
  while ((match = regex.exec(text)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }
    // Mention pill
    const nombre = match[2]
    parts.push(
      <span
        key={`m-${match.index}`}
        className="inline-flex items-center bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 px-1.5 py-0.5 rounded font-semibold text-[13px] mx-0.5"
      >
        @{nombre}
      </span>
    )
    lastIndex = match.index + match[0].length
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <span className={className}>{parts}</span>
}
