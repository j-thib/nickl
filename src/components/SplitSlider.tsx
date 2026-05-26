type Props = {
  leftName: string
  rightName: string
  value: number // left person's percentage (1–99)
  onChange: (value: number) => void
}

// Slider for distributing 100% between two people.
//
// A transparent <input type="range"> sits on top of a div-based track to
// capture pointer + keyboard interaction; the visible thumb and split-colored
// track are styled divs underneath. The native slider's hit zone drives the
// React state, so the visible thumb stays perfectly in sync.
//
// `value` is clamped to 1–99 for display; the spec forbids 0/100 here
// (a sole-payer case is expressed by deselecting the other chip upstream).
export default function SplitSlider({
  leftName,
  rightName,
  value,
  onChange,
}: Props) {
  const v = Number.isFinite(value)
    ? Math.max(1, Math.min(99, Math.round(value)))
    : 50

  return (
    <div className="select-none">
      <div className="flex items-end justify-between mb-3 gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted truncate">{leftName}</div>
          <div className="font-mono tabular text-2xl font-semibold text-brand leading-none mt-1">
            {v}%
          </div>
        </div>
        <div className="text-right min-w-0">
          <div className="text-xs text-muted truncate">{rightName}</div>
          <div className="font-mono tabular text-2xl font-semibold text-accent leading-none mt-1">
            {100 - v}%
          </div>
        </div>
      </div>

      <div className="relative h-6">
        {/* Two-tone track (bottom layer) */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full overflow-hidden flex"
          aria-hidden="true"
        >
          <div className="bg-brand h-full" style={{ width: `${v}%` }} />
          <div className="bg-accent h-full" style={{ width: `${100 - v}%` }} />
        </div>

        {/* Transparent native input — captures pointer + keyboard input.
            Stacks before the thumb so peer-focus styling applies; thumb has
            pointer-events-none so taps fall through to the input. */}
        <input
          type="range"
          min={1}
          max={99}
          step={1}
          value={v}
          onChange={(e) => onChange(parseInt(e.target.value, 10))}
          aria-label={`Split between ${leftName} and ${rightName}`}
          aria-valuetext={`${leftName} ${v}%, ${rightName} ${100 - v}%`}
          className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        {/* Visible thumb */}
        <div
          className="absolute top-1/2 w-5 h-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white border-2 border-gray-300 shadow-sm pointer-events-none peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-1 transition-shadow"
          style={{ left: `${v}%` }}
        />
      </div>
    </div>
  )
}
