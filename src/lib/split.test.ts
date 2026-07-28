import { describe, expect, it } from 'vitest'
import {
  distributeCents,
  normalizeWeights,
  resolveDefaultWeights,
  describeSplit,
} from './split'
import type { ExpenseCategory, Group, GroupMember } from './database.types'

const group = (split_mode: 'equal' | 'percentage'): Group => ({
  id: 'g1',
  name: 'Apartment 3B',
  invite_code: 'J7K9P2',
  created_by: 'u1',
  created_at: '2026-01-01T00:00:00Z',
  split_mode,
})

const member = (
  user_id: string,
  display_name: string,
  split_percentage: number | null = null,
): GroupMember => ({
  id: `m-${user_id}`,
  group_id: 'g1',
  user_id,
  display_name,
  joined_at: '2026-01-01T00:00:00Z',
  split_percentage,
})

const category = (
  split_mode: 'group' | 'custom',
  split_weights: Record<string, number> | null = null,
): ExpenseCategory => ({
  id: 'c1',
  group_id: 'g1',
  name: 'Rent',
  color: '#5D6B9E',
  icon: 'home',
  split_mode,
  split_weights,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
})

describe('distributeCents', () => {
  it('splits evenly, handing leftover cents to the first people', () => {
    expect(distributeCents(1000, ['a', 'b', 'c'])).toEqual([3.34, 3.33, 3.33])
  })

  it('splits by weight and still sums to the total', () => {
    const shares = distributeCents(10000, ['a', 'b', 'c'], {
      a: 40,
      b: 35,
      c: 25,
    })
    expect(shares).toEqual([40, 35, 25])
  })

  it('gives the odd cent to the largest fractional remainder', () => {
    const shares = distributeCents(1001, ['a', 'b'], { a: 33.33, b: 66.67 })
    expect(shares[0] + shares[1]).toBeCloseTo(10.01, 10)
  })

  it('returns nothing for nobody', () => {
    expect(distributeCents(500, [])).toEqual([])
  })
})

describe('normalizeWeights', () => {
  it('rescales a subset back to 100', () => {
    const out = normalizeWeights({ a: 40, b: 35, c: 25 }, ['a', 'b'])
    expect(out?.a).toBeCloseTo((40 / 75) * 100, 10)
    expect((out?.a ?? 0) + (out?.b ?? 0)).toBeCloseTo(100, 10)
  })

  it('is undefined when the subset carries no weight', () => {
    expect(normalizeWeights({ a: 0, b: 0 }, ['a', 'b'])).toBeUndefined()
  })
})

describe('resolveDefaultWeights', () => {
  const members = [member('u1', 'You'), member('u2', 'Sam'), member('u3', 'Ana')]

  it('prefers the category split over the group default', () => {
    const weights = resolveDefaultWeights({
      category: category('custom', { u1: 50, u2: 30, u3: 20 }),
      group: group('equal'),
      members,
      userIds: ['u1', 'u2', 'u3'],
    })
    expect(weights).toEqual({ u1: 50, u2: 30, u3: 20 })
  })

  it('falls back to the group percentage for a 2-person group', () => {
    const twoMembers = [member('u1', 'You', 60), member('u2', 'Sam', 40)]
    const weights = resolveDefaultWeights({
      category: category('group'),
      group: group('percentage'),
      members: twoMembers,
      userIds: ['u1', 'u2'],
    })
    expect(weights).toEqual({ u1: 60, u2: 40 })
  })

  it('falls back to an even split when nothing is configured', () => {
    expect(
      resolveDefaultWeights({
        category: category('group'),
        group: group('equal'),
        members,
        userIds: ['u1', 'u2', 'u3'],
      }),
    ).toBeUndefined()
  })

  it('renormalizes when only some of the category members are involved', () => {
    const weights = resolveDefaultWeights({
      category: category('custom', { u1: 40, u2: 35, u3: 25 }),
      group: group('equal'),
      members,
      userIds: ['u1', 'u2'],
    })
    expect((weights?.u1 ?? 0) + (weights?.u2 ?? 0)).toBeCloseTo(100, 10)
    expect(weights?.u1).toBeCloseTo((40 / 75) * 100, 10)
  })

  it('is undefined for a single person', () => {
    expect(
      resolveDefaultWeights({
        category: category('custom', { u1: 40, u2: 60 }),
        group: group('equal'),
        members,
        userIds: ['u1'],
      }),
    ).toBeUndefined()
  })
})

describe('describeSplit', () => {
  const members = [member('u1', 'You'), member('u2', 'Sam'), member('u3', 'Ana')]

  it('lists custom percentages', () => {
    expect(
      describeSplit(
        category('custom', { u1: 40, u2: 35, u3: 25 }),
        group('equal'),
        members,
      ),
    ).toBe('40 / 35 / 25%')
  })

  it('names the group default for percentage groups', () => {
    const twoMembers = [member('u1', 'You', 60), member('u2', 'Sam', 40)]
    expect(
      describeSplit(category('group'), group('percentage'), twoMembers),
    ).toBe('Group default (60 / 40%)')
  })

  it('says equal otherwise', () => {
    expect(describeSplit(category('group'), group('equal'), members)).toBe(
      'Split equally',
    )
  })
})
