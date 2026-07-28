import type {
  Expense,
  ExpenseCategory,
  ExpenseSplit,
} from '../../lib/database.types'

export type ExpenseWithSplits = Expense & { splits: ExpenseSplit[] }

/**
 * Stands in for `category_id === null` wherever a category id is used as a
 * selection key (filter chips, breakdown rows). Never persisted.
 */
export const UNCATEGORIZED = '__none__'

/** category id -> category, for the many places a row needs its colour/name. */
export type CategoryMap = Record<string, ExpenseCategory>
