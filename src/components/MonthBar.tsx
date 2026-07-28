import { useEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon } from './Icon'
import { monthLabelShort } from '../lib/dates'

type Props = {
  month: string
  setMonth: (month: string) => void
  months: string[]
}

/** Horizontal month scrubber: chevrons plus a scrollable rail of chips. */
export default function MonthBar({ month, setMonth, months }: Props) {
  const railRef = useRef<HTMLDivElement>(null)
  const index = months.indexOf(month)

  // Keep the selected chip centred as the month changes.
  useEffect(() => {
    const rail = railRef.current
    const chip = rail?.querySelector<HTMLElement>('[data-active="true"]')
    if (!rail || !chip) return
    rail.scrollTo({
      left: chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2,
      behavior: 'smooth',
    })
  }, [month])

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setMonth(months[index - 1])}
        disabled={index <= 0}
        aria-label="Previous month"
        className="w-10 h-10 shrink-0 grid place-items-center rounded-xl text-gray-700 hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition"
      >
        <ChevronLeftIcon size={19} />
      </button>

      <div
        ref={railRef}
        className="flex-1 flex gap-1.5 overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {months.map((m) => {
          const active = m === month
          return (
            <button
              key={m}
              type="button"
              data-active={active}
              onClick={() => setMonth(m)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                active
                  ? 'bg-ink text-card'
                  : 'bg-black/[.035] text-muted hover:text-ink'
              }`}
            >
              {monthLabelShort(m)}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setMonth(months[index + 1])}
        disabled={index < 0 || index >= months.length - 1}
        aria-label="Next month"
        className="w-10 h-10 shrink-0 grid place-items-center rounded-xl text-gray-700 hover:bg-black/5 disabled:opacity-25 disabled:hover:bg-transparent transition"
      >
        <ChevronRightIcon size={19} />
      </button>
    </div>
  )
}
