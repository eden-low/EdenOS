import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-[background-color,color,transform,box-shadow] outline-none focus-visible:ring-3 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)] disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary:
          'bg-[var(--accent-primary)] px-5 text-white shadow-[var(--accent-shadow)] hover:-translate-y-0.5 hover:bg-[var(--accent-soft)] hover:text-[var(--text-on-accent-soft)]',
        ghost:
          'px-4 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
        secondary:
          'border border-[var(--border-strong)] bg-[var(--surface-secondary)] px-5 text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
        danger:
          'border border-[var(--danger-border)] bg-[var(--danger-wash)] px-5 text-[var(--danger)] hover:bg-[var(--danger-wash-strong)]',
        icon:
          'size-12 rounded-2xl bg-[var(--accent-primary)] text-white shadow-[var(--accent-shadow)] hover:-translate-y-0.5 hover:bg-[var(--accent-soft)] hover:text-[var(--text-on-accent-soft)]',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export function Button({
  asChild = false,
  className,
  variant,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : 'button'

  return (
    <Component
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  )
}
