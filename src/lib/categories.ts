// Category palette + the starter set every new group gets.

import type { ExpenseCategory } from './database.types'

export const CATEGORY_COLORS = [
  '#2F5D50', // forest
  '#C97B5B', // clay
  '#5D6B9E', // slate blue
  '#85864F', // olive
  '#B86A6A', // brick
  '#5B7E96', // steel
  '#8A6E8F', // plum
  '#A98342', // ochre
] as const

// Keys into the icon set in components/Icon.tsx.
export const CATEGORY_ICONS = [
  'cart',
  'bolt',
  'home',
  'box',
  'fork',
  'car',
  'plane',
  'ticket',
  'tag',
] as const

export const UNCATEGORIZED_COLOR = '#8A8780'

export type CategoryDraft = {
  name: string
  color: string
  icon: string
}

// Seeded into a group the first time someone opens it. Deliberately small —
// groups add their own from the Categories tab.
export const DEFAULT_CATEGORIES: CategoryDraft[] = [
  { name: 'Groceries', color: '#2F5D50', icon: 'cart' },
  { name: 'Utilities', color: '#C97B5B', icon: 'bolt' },
  { name: 'Rent', color: '#5D6B9E', icon: 'home' },
  { name: 'Supplies', color: '#85864F', icon: 'box' },
  { name: 'Travel', color: '#5B7E96', icon: 'plane' },
  { name: 'Misc', color: '#8A6E8F', icon: 'tag' },
]

/** Categories in display order: explicit sort_order first, then name. */
export function sortCategories(cats: ExpenseCategory[]): ExpenseCategory[] {
  return [...cats].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
  )
}

/** `#2F5D50` + 0.12 -> `rgba(47, 93, 80, 0.12)`. Falls back to grey. */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return `rgba(138, 135, 128, ${alpha})`
  const n = parseInt(match[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
