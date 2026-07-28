type Props = {
  icon: (p: { size?: number }) => React.JSX.Element
  title: string
  body?: string
}

export default function EmptyState({ icon: Icon, title, body }: Props) {
  return (
    <div className="text-center text-muted py-11 px-5">
      <span className="mx-auto mb-3 w-14 h-14 rounded-full bg-brand/10 text-brand grid place-items-center">
        <Icon size={26} />
      </span>
      <p className="text-[15px] font-semibold text-ink mb-0.5">{title}</p>
      {body && <p className="text-sm">{body}</p>}
    </div>
  )
}
