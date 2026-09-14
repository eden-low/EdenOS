import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({
  className,
  children,
  closeDisabled = false,
  showCloseButton = true,
  onEscapeKeyDown,
  onPointerDownOutside,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
  closeDisabled?: boolean
  showCloseButton?: boolean
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[4px] data-[state=closed]:animate-[fade-out_160ms_ease-out] data-[state=open]:animate-[fade-in_180ms_ease-out]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-[1.75rem] border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-[var(--text-primary)] shadow-[var(--dialog-shadow)] outline-none data-[state=closed]:animate-[sheet-out_180ms_ease-in] data-[state=open]:animate-[sheet-in_240ms_cubic-bezier(0.22,1,0.36,1)] sm:inset-auto sm:left-1/2 sm:top-1/2 sm:w-[min(31rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[1.75rem] sm:p-8 sm:pb-8 sm:data-[state=closed]:animate-[dialog-out_160ms_ease-in] sm:data-[state=open]:animate-[dialog-in_200ms_cubic-bezier(0.22,1,0.36,1)]',
          className,
        )}
        onEscapeKeyDown={(event) => {
          onEscapeKeyDown?.(event)
          if (closeDisabled) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          onPointerDownOutside?.(event)
          if (closeDisabled) event.preventDefault()
        }}
        {...props}
      >
        <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-[var(--border-strong)] sm:hidden" />
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            aria-label="Close dialog"
            disabled={closeDisabled}
            className="absolute right-5 top-5 grid size-10 place-items-center rounded-xl text-[var(--text-muted)] outline-none transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:ring-3 focus-visible:ring-[var(--focus)] disabled:pointer-events-none disabled:opacity-45 sm:right-6 sm:top-6"
          >
            <X aria-hidden="true" size={19} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
