export type AboutAvatarAction = 'smile' | 'think' | 'wave'
export type AboutAvatarState = { action: AboutAvatarAction | 'idle'; frame: number; run: number }
export type AboutAvatarPhase = 'idle' | 'raise' | 'wave' | 'lower' | 'smile' | 'think'
type Frame = { cell: number; ms: number; source?: 'wave'; phase?: AboutAvatarPhase }

// Smile/Think retain their accepted art and timing. Wave uses a separate atlas.
export const aboutAvatarSequences: Record<AboutAvatarAction, readonly Frame[]> = {
  smile: [{ cell: 1, ms: 450 }, { cell: 4, ms: 450 }, { cell: 1, ms: 450 }],
  think: [{ cell: 2, ms: 650 }, { cell: 5, ms: 650 }, { cell: 2, ms: 650 }],
  wave: [
    { cell: 0, ms: 100, phase: 'raise' },
    { cell: 1, ms: 120, source: 'wave', phase: 'raise' },
    { cell: 2, ms: 140, source: 'wave', phase: 'raise' },
    { cell: 3, ms: 160, source: 'wave', phase: 'raise' },
    { cell: 4, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 5, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 4, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 5, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 4, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 5, ms: 160, source: 'wave', phase: 'wave' },
    { cell: 3, ms: 100, source: 'wave', phase: 'lower' },
    { cell: 6, ms: 160, source: 'wave', phase: 'lower' },
    { cell: 7, ms: 140, source: 'wave', phase: 'lower' },
  ],
}
// Reduced Motion skips the entire raise/wave/lower sequence, showing one still.
export const aboutAvatarReducedFrames: Record<AboutAvatarAction, Frame> = {
  smile: aboutAvatarSequences.smile[0],
  think: aboutAvatarSequences.think[0],
  wave: { cell: 3, ms: 1000, source: 'wave', phase: 'wave' },
}
export const aboutAvatarInitialState: AboutAvatarState = { action: 'idle', frame: 0, run: 0 }
export type AboutAvatarEvent = { type: 'trigger'; action: AboutAvatarAction } | { type: 'advance'; run: number } | { type: 'finish'; run: number } | { type: 'reset' }

export function aboutAvatarReducer(state: AboutAvatarState, event: AboutAvatarEvent): AboutAvatarState {
  if (event.type === 'trigger') return { action: event.action, frame: 0, run: state.run + 1 }
  if (event.type === 'reset') return { action: 'idle', frame: 0, run: state.run + 1 }
  if (event.run !== state.run || state.action === 'idle') return state
  if (event.type === 'finish') return { ...state, action: 'idle', frame: 0 }
  if (state.frame + 1 >= aboutAvatarSequences[state.action].length) return { ...state, action: 'idle', frame: 0 }
  return { ...state, frame: state.frame + 1 }
}
