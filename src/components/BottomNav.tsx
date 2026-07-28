import {
  CalendarIcon,
  ChartIcon,
  ReceiptIcon,
  SwapIcon,
} from './Icon'

export type TabKey = 'expenses' | 'calendar' | 'categories' | 'settle'

const TABS: {
  key: TabKey
  label: string
  Icon: (p: { size?: number; strokeWidth?: number }) => React.JSX.Element
}[] = [
  { key: 'expenses', label: 'Expenses', Icon: ReceiptIcon },
  { key: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { key: 'categories', label: 'Categories', Icon: ChartIcon },
  { key: 'settle', label: 'Settle', Icon: SwapIcon },
]

type Props = {
  tab: TabKey
  setTab: (tab: TabKey) => void
}

export default function BottomNav({ tab, setTab }: Props) {
  const activeIndex = TABS.findIndex((t) => t.key === tab)

  return (
    <nav
      aria-label="Main"
      className="fixed bottom-0 inset-x-0 z-20 border-t border-gray-100 bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
    >
      <div className="relative max-w-[480px] mx-auto grid grid-cols-4">
        {/* Sliding indicator above the active item. */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 w-1/4 flex justify-center transition-transform duration-300 ease-out pointer-events-none"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        >
          <span className="w-7 h-[3px] rounded-b bg-brand" />
        </span>

        {TABS.map(({ key, label, Icon }) => {
          const active = key === tab
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 pt-3 pb-2 min-h-[56px] text-[11px] font-medium transition ${
                active ? 'text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon size={23} strokeWidth={active ? 2 : 1.7} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
