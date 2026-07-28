// How an expense's total is divided between people.
//
// Two layers of defaults, most specific first:
//   1. the expense's category, when it carries `split_mode = 'custom'`
//   2. the group's own default (`split_mode = 'percentage'` on a 2-person
//      group, otherwise an even split)
// Either can be overridden per expense in the expense sheet.

import type { ExpenseCategory, Group, GroupMember } from './database.types'
import { formatPercent } from './money'

export type Weights = Record<string, number>

/**
 * Splits `amountCents` into per-person dollar amounts, returned in the same
 * order as `userIds`. Without weights, splits evenly (the first
 * `amountCents mod n` people get +1 cent). With weights (user_id ->
 * percentage, summing to ~100), floors each ideal share and hands the
 * unallocated cents to the users with the largest fractional remainders.
 */
export function distributeCents(
  amountCents: number,
  userIds: string[],
  weights?: Weights,
): number[] {
  const n = userIds.length
  if (n === 0) return []

  if (!weights) {
    const base = Math.floor(amountCents / n)
    const extras = amountCents - base * n
    return userIds.map((_, i) => (i < extras ? base + 1 : base) / 100)
  }

  const ideals = userIds.map((uid) => (amountCents * (weights[uid] ?? 0)) / 100)
  const floors = ideals.map((x) => Math.floor(x))
  const fractions = ideals.map((x, i) => x - floors[i])
  const allocated = floors.reduce((s, c) => s + c, 0)
  const remainder = amountCents - allocated

  // Indices sorted by fractional part desc, with stable index tiebreak.
  const indices = userIds
    .map((_, i) => i)
    .sort((a, b) => fractions[b] - fractions[a] || a - b)

  const result = [...floors]
  for (let i = 0; i < remainder; i++) {
    result[indices[i]] += 1
  }
  return result.map((c) => c / 100)
}

/**
 * Rescale the weights for `userIds` so they sum to 100. Used when only some of
 * the people a category's weights cover are on a given expense — e.g. a 40 /
 * 35 / 25 category split across just the first two becomes 53.3 / 46.7.
 * Returns undefined when there's nothing to normalize (all zero / missing),
 * which callers read as "split evenly".
 */
export function normalizeWeights(
  weights: Weights,
  userIds: string[],
): Weights | undefined {
  const sum = userIds.reduce((s, uid) => s + (weights[uid] ?? 0), 0)
  if (sum <= 0) return undefined
  const out: Weights = {}
  for (const uid of userIds) out[uid] = ((weights[uid] ?? 0) / sum) * 100
  return out
}

/**
 * The weights a new expense should start from, given its category and the
 * people it's split between. Undefined means an even split.
 */
export function resolveDefaultWeights({
  category,
  group,
  members,
  userIds,
}: {
  category: ExpenseCategory | null | undefined
  group: Group
  members: GroupMember[]
  userIds: string[]
}): Weights | undefined {
  if (userIds.length < 2) return undefined

  if (category?.split_mode === 'custom' && category.split_weights) {
    const normalized = normalizeWeights(category.split_weights, userIds)
    if (normalized) return normalized
  }

  // Group-level percentage split only exists for 2-person groups.
  if (group.split_mode === 'percentage' && userIds.length === 2) {
    const byUser = new Map(members.map((m) => [m.user_id, m]))
    const weights: Weights = {}
    for (const uid of userIds) {
      const pct = byUser.get(uid)?.split_percentage
      if (pct == null) return undefined
      weights[uid] = Number(pct)
    }
    return normalizeWeights(weights, userIds)
  }

  return undefined
}

/** Even-split percentage for `n` people, e.g. 3 -> 33.333… */
export function evenWeight(n: number): number {
  return n > 0 ? 100 / n : 0
}

/**
 * Human label for a category's default split — "Split equally",
 * "Group default (60 / 40)", or "50 / 30 / 20".
 */
export function describeSplit(
  category: ExpenseCategory,
  group: Group,
  members: GroupMember[],
): string {
  if (category.split_mode === 'custom' && category.split_weights) {
    const weights = category.split_weights
    const parts = members.map((m) => formatPercent(weights[m.user_id] ?? 0))
    return parts.length > 0 ? parts.join(' / ') + '%' : 'Custom split'
  }
  if (group.split_mode === 'percentage' && members.length === 2) {
    const parts = members.map((m) => formatPercent(Number(m.split_percentage ?? 50)))
    return `Group default (${parts.join(' / ')}%)`
  }
  return 'Split equally'
}
