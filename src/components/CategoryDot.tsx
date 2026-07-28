import { CategoryGlyph } from './Icon'
import { UNCATEGORIZED_COLOR, withAlpha } from '../lib/categories'

type Props = {
  color?: string | null
  icon?: string | null
  size?: number
  /** Outlined rather than filled — for use on already-tinted backgrounds. */
  ghost?: boolean
}

/** Rounded, colour-tinted tile holding a category's glyph. */
export default function CategoryDot({
  color,
  icon,
  size = 38,
  ghost = false,
}: Props) {
  const tint = color ?? UNCATEGORIZED_COLOR
  return (
    <span
      className="shrink-0 grid place-items-center rounded-xl"
      style={{
        width: size,
        height: size,
        color: tint,
        background: ghost ? 'transparent' : withAlpha(tint, 0.12),
        border: ghost ? `1.5px solid ${withAlpha(tint, 0.35)}` : undefined,
      }}
    >
      <CategoryGlyph name={icon} size={Math.round(size * 0.52)} />
    </span>
  )
}
