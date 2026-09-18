import type { PointerEvent } from 'react'

function eventButton(event: PointerEvent<HTMLElement>): HTMLButtonElement | null {
  const target = event.target
  return target instanceof Element ? target.closest('button') : null
}

function clearButtonPress(event: PointerEvent<HTMLElement>) {
  const button = eventButton(event)
  if (button) delete button.dataset.pressed
}

export const triggerPressFeedback = {
  onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.disabled) event.currentTarget.dataset.pressed = 'true'
  },
  onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    delete event.currentTarget.dataset.pressed
  },
  onPointerCancel(event: PointerEvent<HTMLButtonElement>) {
    delete event.currentTarget.dataset.pressed
  },
  onPointerLeave(event: PointerEvent<HTMLButtonElement>) {
    delete event.currentTarget.dataset.pressed
  },
}

export const capturePressFeedback = {
  onPointerDownCapture(event: PointerEvent<HTMLDivElement>) {
    const button = eventButton(event)
    if (button && event.currentTarget.contains(button) && !button.disabled) {
      button.dataset.pressed = 'true'
    }
  },
  onPointerUpCapture: clearButtonPress,
  onPointerCancelCapture: clearButtonPress,
  onPointerOutCapture(event: PointerEvent<HTMLDivElement>) {
    const button = eventButton(event)
    const nextTarget = event.relatedTarget
    if (button && !button.contains(nextTarget instanceof Node ? nextTarget : null)) {
      delete button.dataset.pressed
    }
  },
}
