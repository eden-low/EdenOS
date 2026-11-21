export interface AvatarMotionFrame { frame: number; ms: number }
export type AvatarMotionAction = 'blink' | 'abacus'
export interface AvatarMotionDefinition {
  prototype: '4G-A'; capabilities: { blink: true; abacus: true }
  atlas: { src: string; width: number; height: number; cellWidth: number; cellHeight: number; columns: number }
  waitMs: Readonly<Record<AvatarMotionAction, number>>
  sequences: Readonly<Record<AvatarMotionAction, readonly AvatarMotionFrame[]>>
}
export interface AvatarMotionSnapshot { readonly active: boolean; readonly action: AvatarMotionAction | 'idle'; readonly step: number; readonly frame: number }
const browserClock = { now: () => Date.now(), set: (fn: () => void, ms: number) => setTimeout(fn, ms), clear: (timer: ReturnType<typeof setTimeout>) => clearTimeout(timer) }

// A single deadline timer, no RAF/poll loop, financial events or random choice.
export function createAvatarMotion(definition: AvatarMotionDefinition, clock = browserClock) {
  let snapshot: AvatarMotionSnapshot = { active: false, action: 'idle', step: 0, frame: 0 }
  let timer: ReturnType<typeof setTimeout> | undefined
  let blinkAt = 0, abacusAt = 0
  const listeners = new Set<() => void>()
  const publish = (next: AvatarMotionSnapshot) => {
    if (next.active===snapshot.active&&next.action===snapshot.action&&next.step===snapshot.step&&next.frame===snapshot.frame) return
    snapshot=next;listeners.forEach(listener=>listener())
  }
  const cancel = () => { if(timer!==undefined){clock.clear(timer);timer=undefined} }
  function arm(ms: number) { cancel();if(!snapshot.active)return;timer=clock.set(()=>{timer=undefined;tick()},Math.max(0,ms)) }
  function idle() { arm(Math.min(blinkAt,abacusAt)-clock.now()) }
  function tick() {
    if(!snapshot.active)return
    if(snapshot.action==='idle') {
      const action=abacusAt<=blinkAt?'abacus':'blink',first=definition.sequences[action][0]
      publish({active:true,action,step:0,frame:first.frame});arm(first.ms);return
    }
    const action=snapshot.action,sequence=definition.sequences[action],step=snapshot.step+1
    if(step<sequence.length){publish({active:true,action,step,frame:sequence[step].frame});arm(sequence[step].ms);return}
    const now=clock.now()
    if(action==='blink'||blinkAt<=now)blinkAt=now+definition.waitMs.blink
    if(action==='abacus'||abacusAt<=now)abacusAt=now+definition.waitMs.abacus
    publish({active:true,action:'idle',step:0,frame:0});idle()
  }
  return {
    getSnapshot:()=>snapshot,
    subscribe(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener)}},
    setActive(active:boolean){
      if(active===snapshot.active)return
      cancel()
      if(!active){publish({active:false,action:'idle',step:0,frame:0});return}
      const now=clock.now();blinkAt=now+definition.waitMs.blink;abacusAt=now+definition.waitMs.abacus
      publish({active:true,action:'idle',step:0,frame:0});idle()
    },
  }
}
