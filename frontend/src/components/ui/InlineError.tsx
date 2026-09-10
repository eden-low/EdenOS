import { CircleAlert } from 'lucide-react'

export function InlineError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-wash)] p-4 text-sm leading-6 text-[var(--danger)]"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={17} />
      <p>{message}</p>
    </div>
  )
}
