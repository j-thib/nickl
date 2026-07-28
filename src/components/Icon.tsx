// Line-icon set, 24×24 grid, stroked with currentColor so icons inherit text
// colour. Used by the bottom nav, the category picker, and empty states.

type IconProps = {
  size?: number
  strokeWidth?: number
  className?: string
}

function Svg({
  size = 24,
  strokeWidth = 1.75,
  className,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

// --- Navigation -------------------------------------------------------------

export function ReceiptIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 3h14v18l-2.5-1.6L14 21l-2-1.6L10 21l-2.5-1.6L5 21z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </Svg>
  )
}

export function CalendarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  )
}

export function ChartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 12a9 9 0 1 1-9-9v9z" />
      <path d="M15.5 3.6A9 9 0 0 1 20.4 8.5L12 12z" opacity=".55" />
    </Svg>
  )
}

export function SwapIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 4 3 8l4 4" />
      <path d="M3 8h13a4 4 0 0 1 0 8h-1" />
      <path d="m17 20 4-4-4-4" opacity=".55" />
    </Svg>
  )
}

// --- Controls ---------------------------------------------------------------

export function PlusIcon(p: IconProps) {
  return (
    <Svg strokeWidth={2.2} {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m15 6-6 6 6 6" />
    </Svg>
  )
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  )
}

export function CheckIcon(p: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...p}>
      <path d="m5 13 4 4L19 7" />
    </Svg>
  )
}

export function TrashIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13M9 7V4h6v3" />
    </Svg>
  )
}

export function ArrowRightIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </Svg>
  )
}

// --- Category glyphs --------------------------------------------------------

export function CartIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="18" cy="20" r="1.4" />
      <path d="M2 3h2.5l2.2 11.2a1.6 1.6 0 0 0 1.6 1.3h8.9a1.6 1.6 0 0 0 1.6-1.3L21 7H5.2" />
    </Svg>
  )
}

export function BoltIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12z" />
    </Svg>
  )
}

export function HomeIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M10 21v-6h4v6" />
    </Svg>
  )
}

export function BoxIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5z" />
      <path d="M3 8.5 12 14l9-5.5M12 14v7" />
    </Svg>
  )
}

export function ForkIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 3v7a2.5 2.5 0 0 0 5 0V3M8.5 12v9" />
      <path d="M17 3c-1.5 1.5-2 3.5-2 5.5S16 12 17 12v9" />
    </Svg>
  )
}

export function CarIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 17h14M4.5 17v2h2.5v-2M17 17v2h2.5v-2" />
      <path d="M3.5 17v-4.2l1.9-4.5A2 2 0 0 1 7.2 7h9.6a2 2 0 0 1 1.8 1.3l1.9 4.5V17z" />
      <path d="M3.5 12.8h17" />
    </Svg>
  )
}

export function TicketIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9V7a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6z" />
      <path d="M12 7v2M12 13v2M12 19v-2" strokeDasharray="0.1 3.5" />
    </Svg>
  )
}

export function PlaneIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M22 2 15 22l-4-9-9-4z" />
      <path d="M22 2 11 13" />
    </Svg>
  )
}

export function TagIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 11.5V4a1 1 0 0 1 1-1h7.5a1 1 0 0 1 .7.3l8.5 8.5a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 12.2a1 1 0 0 1-.3-.7z" />
      <circle cx="7.5" cy="7.5" r="1.4" />
    </Svg>
  )
}

/** Renders a category's glyph by name, falling back to the tag. */
export function CategoryGlyph({
  name,
  ...rest
}: IconProps & { name?: string | null }) {
  switch (name) {
    case 'cart':
      return <CartIcon {...rest} />
    case 'bolt':
      return <BoltIcon {...rest} />
    case 'home':
      return <HomeIcon {...rest} />
    case 'box':
      return <BoxIcon {...rest} />
    case 'fork':
      return <ForkIcon {...rest} />
    case 'car':
      return <CarIcon {...rest} />
    case 'ticket':
      return <TicketIcon {...rest} />
    case 'plane':
      return <PlaneIcon {...rest} />
    default:
      return <TagIcon {...rest} />
  }
}
