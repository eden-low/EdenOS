import { afterEach, describe, expect, it } from 'vitest'
import { isIdleAvatarObstacle } from './avatarObstacles'

afterEach(() => { document.body.replaceChildren() })
describe('idle companion obstacles', () => {
  it('allows scrolling buttons and read-only focusable charts behind the companion', () => {
    document.body.innerHTML = '<section><button>Record</button><svg role="img" tabindex="0"></svg></section>'
    const button = document.querySelector('button')!
    button.focus()
    expect(isIdleAvatarObstacle(button)).toBe(false)
    expect(isIdleAvatarObstacle(document.querySelector('svg')!)).toBe(false)
  })
  it.each(['fixed', 'sticky'])('protects controls inside a %s navigation container', (position) => {
    document.body.innerHTML = `<nav style="position:${position}"><div><button>Navigation action</button></div></nav>`
    expect(isIdleAvatarObstacle(document.querySelector('button')!)).toBe(true)
  })
  it('protects the focused input only while editing, plus explicit important actions', () => {
    document.body.innerHTML = '<form><input /><textarea></textarea><button data-avatar-priority>Save reflection</button></form>'
    const input = document.querySelector('input')!
    expect(isIdleAvatarObstacle(input)).toBe(false)
    input.focus()
    expect(isIdleAvatarObstacle(input)).toBe(true)
    expect(isIdleAvatarObstacle(document.querySelector('textarea')!)).toBe(false)
    input.blur()
    expect(isIdleAvatarObstacle(input)).toBe(false)
    input.type = 'checkbox'
    input.focus()
    expect(isIdleAvatarObstacle(input)).toBe(true)
    expect(isIdleAvatarObstacle(document.querySelector('button')!)).toBe(true)
  })
})
