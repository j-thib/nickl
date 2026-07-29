import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { supabase } from '../lib/supabase'
import { CenteredSpinner } from '../components/Spinner'
import BottomNav from '../components/BottomNav'
import type { TabKey } from '../components/BottomNav'
import { PlusIcon } from '../components/Icon'
import { DEFAULT_CATEGORIES, sortCategories } from '../lib/categories'
import { monthKey, monthRange, todayISO } from '../lib/dates'
import ExpensesTab from './group/ExpensesTab'
import CalendarTab from './group/CalendarTab'
import CategoriesTab from './group/CategoriesTab'
import SettleTab from './group/SettleTab'
import ExpenseSheet from './group/ExpenseSheet'
import CategorySheet from './group/CategorySheet'
import PaymentSheet from './group/PaymentSheet'
import type { CategoryMap, ExpenseWithSplits } from './group/types'
import type {
  ExpenseCategory,
  Group,
  GroupMember,
  Payment,
} from '../lib/database.types'

type ExpenseSheetState =
  | { mode: 'new' }
  | { mode: 'edit'; expense: ExpenseWithSplits }
  | null

type CategorySheetState =
  | { mode: 'new' }
  | { mode: 'edit'; category: ExpenseCategory }
  | null

type Props = {
  group: Group
  onBack: () => void
  onOpenSettings: () => void
}

export default function GroupDetailPage({
  group,
  onBack,
  onOpenSettings,
}: Props) {
  const { user } = useAuth()
  const { show: showToast } = useToast()
  const [tab, setTab] = useState<TabKey>('expenses')
  const [members, setMembers] = useState<GroupMember[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [month, setMonth] = useState(() => monthKey(todayISO()))
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null)
  const [expenseSheet, setExpenseSheet] = useState<ExpenseSheetState>(null)
  const [categorySheet, setCategorySheet] = useState<CategorySheetState>(null)
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [membersRes, categoriesRes, expensesRes, paymentsRes] =
      await Promise.all([
        supabase
          .from('group_members')
          .select('*')
          .eq('group_id', group.id)
          .order('joined_at'),
        supabase
          .from('expense_categories')
          .select('*')
          .eq('group_id', group.id),
        supabase
          .from('expenses')
          .select('*, splits:expense_splits(*)')
          .eq('group_id', group.id)
          .order('spent_at', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select('*')
          .eq('group_id', group.id)
          .order('created_at', { ascending: false }),
      ])

    const failed = [membersRes, categoriesRes, expensesRes, paymentsRes].find(
      (r) => r.error,
    )
    if (failed?.error) {
      setError(failed.error.message)
      setLoading(false)
      return
    }

    setMembers(membersRes.data ?? [])
    setExpenses((expensesRes.data ?? []) as ExpenseWithSplits[])
    setPayments(paymentsRes.data ?? [])

    // First visit to a group: give it a starter set of categories. The unique
    // (group_id, name) index makes this safe if two members race.
    let cats = categoriesRes.data ?? []
    if (cats.length === 0) {
      const { error: seedError } = await supabase
        .from('expense_categories')
        .upsert(
          DEFAULT_CATEGORIES.map((c, i) => ({
            ...c,
            group_id: group.id,
            sort_order: i,
          })),
          { onConflict: 'group_id,name', ignoreDuplicates: true },
        )
      if (!seedError) {
        const { data: seeded } = await supabase
          .from('expense_categories')
          .select('*')
          .eq('group_id', group.id)
        cats = seeded ?? []
      }
    }
    setCategories(sortCategories(cats))
    setLoading(false)
  }, [group.id])

  useEffect(() => {
    void load()
  }, [load])

  const nameById = useMemo(() => {
    const map: Record<string, string> = {}
    for (const member of members) map[member.user_id] = member.display_name
    return map
  }, [members])

  const categoryMap = useMemo<CategoryMap>(() => {
    const map: CategoryMap = {}
    for (const c of categories) map[c.id] = c
    return map
  }, [categories])

  const months = useMemo(
    () => monthRange(expenses.map((e) => e.spent_at)),
    [expenses],
  )

  // A month can drop out of range when its last expense is deleted — fall
  // back to the newest one rather than showing an empty scrubber selection.
  const activeMonth =
    months.includes(month) || months.length === 0
      ? month
      : months[months.length - 1]

  function handleExpenseSaved(expense: ExpenseWithSplits) {
    const isEdit = expenseSheet?.mode === 'edit'
    setExpenses((prev) =>
      isEdit
        ? prev.map((e) => (e.id === expense.id ? expense : e))
        : [expense, ...prev],
    )
    setExpenseSheet(null)
    // Jump to the month the expense landed in, so it's visible right away.
    setMonth(monthKey(expense.spent_at))
    showToast(isEdit ? 'Expense updated' : 'Expense added')
  }

  function handleExpenseDeleted(expenseId: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== expenseId))
    setExpenseSheet(null)
    showToast('Expense deleted')
  }

  function handleCategorySaved(category: ExpenseCategory) {
    const isEdit = categorySheet?.mode === 'edit'
    setCategories((prev) =>
      sortCategories(
        isEdit
          ? prev.map((c) => (c.id === category.id ? category : c))
          : [...prev, category],
      ),
    )
    setCategorySheet(null)
    showToast(isEdit ? 'Category updated' : 'Category created')
  }

  function handleCategoryDeleted(categoryId: string) {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    // The FK is ON DELETE SET NULL, so its expenses survive as uncategorized.
    setExpenses((prev) =>
      prev.map((e) =>
        e.category_id === categoryId ? { ...e, category_id: null } : e,
      ),
    )
    setFilterCategoryId((prev) => (prev === categoryId ? null : prev))
    setCategorySheet(null)
    showToast('Category deleted')
  }

  function handlePaymentSaved(payment: Payment) {
    setPayments((prev) => [payment, ...prev])
    setPaymentSheetOpen(false)
    showToast('Payment recorded')
  }

  async function handleDeletePayment(paymentId: string) {
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    setPayments((prev) => prev.filter((p) => p.id !== paymentId))
    showToast('Payment deleted')
  }

  const showFab = !loading && (tab === 'expenses' || tab === 'calendar')

  return (
    <main className="min-h-screen bg-app pb-28">
      <div className="sticky top-0 z-10 bg-app">
        <Header
          group={group}
          onBack={onBack}
          onOpenSettings={onOpenSettings}
        />
      </div>

      <div className="max-w-[480px] mx-auto px-4 pt-1">
        {error && (
          <div
            role="alert"
            className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4"
          >
            {error}
          </div>
        )}

        {loading ? (
          <CenteredSpinner label="Loading expenses" />
        ) : tab === 'expenses' ? (
          <ExpensesTab
            expenses={expenses}
            categories={categories}
            categoryMap={categoryMap}
            nameById={nameById}
            memberCount={members.length}
            currentUserId={user?.id}
            month={activeMonth}
            setMonth={setMonth}
            months={months}
            filterCategoryId={filterCategoryId}
            setFilterCategoryId={setFilterCategoryId}
            onOpen={(expense) => setExpenseSheet({ mode: 'edit', expense })}
          />
        ) : tab === 'calendar' ? (
          <CalendarTab
            expenses={expenses}
            categoryMap={categoryMap}
            nameById={nameById}
            memberCount={members.length}
            currentUserId={user?.id}
            month={activeMonth}
            setMonth={setMonth}
            months={months}
            onOpen={(expense) => setExpenseSheet({ mode: 'edit', expense })}
          />
        ) : tab === 'categories' ? (
          <CategoriesTab
            expenses={expenses}
            categories={categories}
            group={group}
            members={members}
            month={activeMonth}
            setMonth={setMonth}
            months={months}
            onEditCategory={(category) =>
              setCategorySheet({ mode: 'edit', category })
            }
            onNewCategory={() => setCategorySheet({ mode: 'new' })}
            onDrillDown={(categoryId) => {
              setFilterCategoryId(categoryId)
              setTab('expenses')
            }}
          />
        ) : (
          <SettleTab
            expenses={expenses}
            payments={payments}
            members={members}
            nameById={nameById}
            currentUserId={user?.id}
            onRecordPayment={() => setPaymentSheetOpen(true)}
            onDeletePayment={handleDeletePayment}
          />
        )}
      </div>

      {showFab && (
        <button
          type="button"
          onClick={() => setExpenseSheet({ mode: 'new' })}
          aria-label="Add expense"
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-brand text-white shadow-lg hover:bg-brand-dark transition grid place-items-center z-20"
        >
          <PlusIcon size={24} />
        </button>
      )}

      <BottomNav tab={tab} setTab={setTab} />

      {expenseSheet && (
        <ExpenseSheet
          group={group}
          members={members}
          categories={categories}
          currentUserId={user?.id ?? ''}
          existing={expenseSheet.mode === 'edit' ? expenseSheet.expense : null}
          defaultCategoryId={
            filterCategoryId && categoryMap[filterCategoryId]
              ? filterCategoryId
              : null
          }
          defaultDate={defaultDateFor(activeMonth)}
          onClose={() => setExpenseSheet(null)}
          onSaved={handleExpenseSaved}
          onDeleted={handleExpenseDeleted}
        />
      )}

      {categorySheet && (
        <CategorySheet
          group={group}
          members={members}
          existing={
            categorySheet.mode === 'edit' ? categorySheet.category : null
          }
          nextSortOrder={categories.length}
          onClose={() => setCategorySheet(null)}
          onSaved={handleCategorySaved}
          onDeleted={handleCategoryDeleted}
        />
      )}

      {paymentSheetOpen && (
        <PaymentSheet
          group={group}
          members={members}
          currentUserId={user?.id ?? ''}
          onClose={() => setPaymentSheetOpen(false)}
          onSaved={handlePaymentSaved}
        />
      )}
    </main>
  )
}

/**
 * Date to pre-fill a new expense with: today when the current month is on
 * screen, otherwise the 1st of whichever month is being browsed.
 */
function defaultDateFor(month: string): string {
  const today = todayISO()
  return monthKey(today) === month ? today : `${month}-01`
}

function Header({
  group,
  onBack,
  onOpenSettings,
}: {
  group: Group
  onBack: () => void
  onOpenSettings: () => void
}) {
  return (
    <header className="bg-app">
      <div className="max-w-[480px] mx-auto px-3 py-2 flex items-center gap-1.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 shrink-0 grid place-items-center rounded-xl text-gray-700 hover:bg-black/5 hover:text-ink transition"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 text-center">
          <h1 className="text-lg font-semibold text-ink truncate">
            {group.name}
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Group settings"
          className="w-11 h-11 shrink-0 grid place-items-center rounded-xl text-gray-700 hover:bg-black/5 hover:text-ink transition"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
      </div>
    </header>
  )
}
