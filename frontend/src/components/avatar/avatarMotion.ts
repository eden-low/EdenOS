export interface AvatarMotionFrame { frame: number; ms: number }
export type AvatarMotionAction = 'blink' | 'abacus' | 'pageTurn'
interface MotionBase {
  atlas: { src: string; width: number; height: number; cellWidth: number; cellHeight: number; columns: number }
}
export type AvatarMotionDefinition = MotionBase & (
  { prototype: '4G-A'; secondaryAction: 'abacus'; capabilities: { blink: true; abacus: true }
    waitMs: Readonly<Record<'blink' | 'abacus', number>>; sequences: Readonly<Record<'blink' | 'abacus', readonly AvatarMotionFrame[]>> } |
  { prototype: '4G-B' | '4G-B2'; secondaryAction: 'pageTurn'; capabilities: { blink: true; pageTurn: true; journalWrite?: true }
    waitMs: Readonly<Record<'blink' | 'pageTurn', number>>; sequences: Readonly<Record<'blink' | 'pageTurn', readonly AvatarMotionFrame[]>> }
)
export interface AvatarMotionSnapshot { readonly active: boolean; readonly action: AvatarMotionAction | 'idle'; readonly step: number; readonly frame: number }
const browserClock = { now: () => Date.now(), set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer) }

// A single deadline timer, no RAF/poll loop, financial events or random choice.
export function createAvatarMotion(definition: AvatarMotionDefinition, clock = browserClock) {
  const secondarySequence=definition.secondaryAction==='abacus'?definition.sequences.abacus:definition.sequences.pageTurn
  const secondaryWait=definition.secondaryAction==='abacus'?definition.waitMs.abacus:definition.waitMs.pageTurn
  let snapshot: AvatarMotionSnapshot = { active: false, action: 'idle', step: 0, frame: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  let blinkAt = 0, secondaryAt = 0
  const listeners = new Set<() => void>()
  const publish = (next: AvatarMotionSnapshot) => {
    if (next.active===snapshot.active&&next.action===snapshot.action&&next.step===snapshot.step&&next.frame===snapshot.frame) return
    snapshot=next;listeners.forEach(listener=>listener())
  }
  const cancel = () => { if(timer!==undefined){clock.clear(timer);timer=undefined} }
  function arm(ms: number) { cancel();if(!snapshot.active)return;timer=clock.set(()=>{timer=undefined;tick()},Math.max(0,ms)) }
  function idle() { arm(Math.min(blinkAt,secondaryAt)-clock.now()) }
  function tick() {
    if(!snapshot.active)return
    if(snapshot.action==='idle') {
      const action=secondaryAt<=blinkAt?definition.secondaryAction:'blink',first=(action==='blink'?definition.sequences.blink:secondarySequence)[0]
      publish({active:true,action,step:0,frame:first.frame});arm(first.ms);return
    }
    const action=snapshot.action,sequence=action==='blink'?definition.sequences.blink:secondarySequence,step=snapshot.step+1
    if(step<sequence.length){publish({active:true,action,step,frame:sequence[step].frame});arm(sequence[step].ms);return}
    const now=clock.now()
    if(action==='blink'||blinkAt<=now)blinkAt=now+definition.waitMs.blink
    if(action!=='blink'||secondaryAt<=now)secondaryAt=now+secondaryWait
    publish({active:true,action:'idle',step:0,frame:0});idle()
  }
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
    setActive(active:boolean){
      if(active===snapshot.active)return
      cancel()
      if(!active){publish({active:false,action:'idle',step:0,frame:0});return}
      const now=clock.now();blinkAt=now+definition.waitMs.blink;secondaryAt=now+secondaryWait
      publish({active:true,action:'idle',step:0,frame:0});idle()
    },
  }
}
