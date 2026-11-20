const editableSelector = 'input:not([type="button"]):not([type="submit"]), textarea, select, [contenteditable="true"]'

// Scrolling content may pass behind the inert companion. Idle protects only
// viewport furniture, explicitly important actions, and the current input.
export function isIdleAvatarObstacle(control: Element, activeElement: Element | null = document.activeElement): boolean {
  if (control.closest('[data-avatar-priority]')) return true
  if (control === activeElement && control.matches(editableSelector)) return true
  for (let ancestor: Element | null = control; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
    const position = getComputedStyle(ancestor).position
    if (position === 'fixed' || position === 'sticky') return true
  }
  return false
}
