// Money formatting. Amounts are dollars throughout the UI; anything that
// needs exactness converts to integer cents first (see lib/split.ts).

export function formatUSD(dollars: number): string {
  return (
    '$' +
    dollars.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  )
}

// Compact form for dense surfaces (calendar cells, trend bars, donut centre):
// $482, $1.2k, $24k.
export function formatUSDShort(dollars: number): string {
  if (Math.abs(dollars) >= 1000) {
    const k = dollars / 1000
    return '$' + k.toFixed(Math.abs(k) >= 10 ? 0 : 1) + 'k'
  }
  return (
    '$' +
    dollars.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  )
}

// 33.333 -> "33.3", 50 -> "50"
export function formatPercent(pct: number): string {
  const rounded = Math.round(pct * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}
