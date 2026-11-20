import { describe, expect, it } from 'vitest'
import { aboutAvatarInitialState, aboutAvatarReducer, aboutAvatarSequences, type AboutAvatarAction } from './aboutAvatarMachine'

describe('About gesture lifecycle', () => {
  it.each<AboutAvatarAction>(['smile', 'think', 'wave'])('plays each dedicated %s sequence once, then returns to idle', (action) => {
    let state = aboutAvatarReducer(aboutAvatarInitialState, { type: 'trigger', action })
    const cells: number[] = []
    while (state.action !== 'idle') {
      cells.push(aboutAvatarSequences[state.action][state.frame].cell)
      state = aboutAvatarReducer(state, { type: 'advance', run: state.run })
    }
    expect(cells).toEqual(aboutAvatarSequences[action].map((frame) => frame.cell))
    expect(state.action).toBe('idle')
  })
  it('restarts repeated gestures and ignores a previous gesture’s stale callback', () => {
    const wave = aboutAvatarReducer(aboutAvatarInitialState, { type: 'trigger', action: 'wave' })
    const advanced = aboutAvatarReducer(wave, { type: 'advance', run: wave.run })
    const restarted = aboutAvatarReducer(advanced, { type: 'trigger', action: 'wave' })
    expect(restarted.frame).toBe(0)
    expect(aboutAvatarReducer(restarted, { type: 'advance', run: wave.run })).toBe(restarted)
    const think = aboutAvatarReducer(restarted, { type: 'trigger', action: 'think' })
    expect(think.action).toBe('think')
    expect(aboutAvatarReducer(think, { type: 'advance', run: restarted.run })).toBe(think)
  })
  it('resets safely when interrupted', () => {
    const active = aboutAvatarReducer(aboutAvatarInitialState, { type: 'trigger', action: 'smile' })
    const reset = aboutAvatarReducer(active, { type: 'reset' })
    expect(reset.action).toBe('idle')
    expect(aboutAvatarReducer(reset, { type: 'advance', run: active.run })).toBe(reset)
  })
  it('does not let a stale Reduced Motion completion stop a newly triggered gesture', () => {
    const smile = aboutAvatarReducer(aboutAvatarInitialState, { type: 'trigger', action: 'smile' })
    const wave = aboutAvatarReducer(smile, { type: 'trigger', action: 'wave' })
    expect(aboutAvatarReducer(wave, { type: 'finish', run: smile.run })).toBe(wave)
    expect(aboutAvatarReducer(wave, { type: 'finish', run: wave.run }).action).toBe('idle')
  })
})
