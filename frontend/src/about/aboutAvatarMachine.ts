export type AboutAvatarAction = 'smile' | 'think' | 'wave'
export type AboutAvatarState = { action: AboutAvatarAction | 'idle'; frame: number; run: number }
type Frame = { cell: number; ms: number }

// Each cell is a purpose-made illustration, including three different waving arm poses.
export const aboutAvatarSequences: Record<AboutAvatarAction, readonly Frame[]> = {
  smile: [{ cell: 1, ms: 450 }, { cell: 4, ms: 450 }, { cell: 1, ms: 450 }],
  think: [{ cell: 2, ms: 650 }, { cell: 5, ms: 650 }, { cell: 2, ms: 650 }],
  wave: [{ cell: 3, ms: 180 }, { cell: 6, ms: 180 }, { cell: 7, ms: 180 }, { cell: 6, ms: 180 }, { cell: 3, ms: 180 }],
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
