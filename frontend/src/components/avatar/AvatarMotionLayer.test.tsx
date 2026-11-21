import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Profiler, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import AvatarMotionLayer from './AvatarMotionLayer'
import { treasurerMotion } from './treasurerMotion'
import { AvatarAppearance } from './AvatarAppearance'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'

class Loader {
 onload:(()=>void)|null=null;onerror:(()=>void)|null=null;src=''
 decode=vi.fn(async():Promise<void>=>undefined)
 constructor(){loaders.push(this)}
}
let loaders:Loader[],visibility:'visible'|'hidden'
beforeEach(()=>{
 vi.useFakeTimers();vi.setSystemTime(0);loaders=[];visibility='visible'
 vi.stubGlobal('Image',Loader)
 vi.spyOn(document,'visibilityState','get').mockImplementation(()=>visibility)
})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()})
const layer=()=>document.querySelector<HTMLElement>('.eden-avatar-motion-layer')!
const step=(ms:number)=>act(()=>vi.advanceTimersByTime(ms))
async function loaded(){await act(async()=>{loaders.at(-1)!.onload!()})}
const tree=(paused=false)=><AvatarMotionLayer definition={treasurerMotion} paused={paused}/>
async function integration(still=false,locked=false){
 const view=render(<PrivacyLockContext.Provider value={{...unlockedPrivacyLock,enabled:true,locked}}><AvatarAppearance avatarId="eden-treasurer" motionEnabled perched={false} attentive={false} still={still}/></PrivacyLockContext.Provider>)
 await act(async()=>{loaders[0].onload!();await import('./AvatarMotionLayer')})
 return view
}
it('does not load/decode an atlas or schedule timers under Reduced Motion/occlusion',()=>{
 const view=render(tree(true));expect(loaders).toHaveLength(0);expect(vi.getTimerCount()).toBe(0)
 view.rerender(tree(false));expect(loaders).toHaveLength(1)
 view.unmount();expect(loaders[0].onload).toBeNull();expect(loaders[0].onerror).toBeNull()
})
it('does no idle polling, renders real cells and cancels everything on Strict Mode unmount',async()=>{
 const commits=vi.fn(),view=render(<StrictMode><Profiler id="motion" onRender={commits}>{tree()}</Profiler></StrictMode>)
 await loaded();const idleCommits=commits.mock.calls.length
 expect(vi.getTimerCount()).toBe(1);step(6000);expect(commits).toHaveBeenCalledTimes(idleCommits)
 step(250);expect(layer().dataset.motionFrame).toBe('2')
 expect(layer().querySelector('svg')?.getAttribute('viewBox')).toBe('264 0 264 492')
 const removed=vi.spyOn(document,'removeEventListener')
 view.unmount();expect(vi.getTimerCount()).toBe(0)
 expect(removed).toHaveBeenCalledWith('visibilitychange',expect.any(Function))
 expect(removed).toHaveBeenCalledWith('freeze',expect.any(Function))
})
it('pauses hidden/frozen/pagehidden documents immediately and resumes with a new idle wait',async()=>{
 render(tree());await loaded();step(6250)
 visibility='hidden';act(()=>document.dispatchEvent(new Event('visibilitychange')))
 expect(vi.getTimerCount()).toBe(0);expect(layer().dataset.motionActive).toBe('false')
 step(120000);visibility='visible';act(()=>document.dispatchEvent(new Event('visibilitychange')))
 expect(layer().dataset.motionFrame).toBe('1');expect(vi.getTimerCount()).toBe(1)
 step(6199);expect(layer().dataset.motionAction).toBe('idle')
 step(1);expect(layer().dataset.motionAction).toBe('blink')
 for(const [target,pause,resume]of [[document,'freeze','resume'],[window,'pagehide','pageshow']]as const){
  act(()=>target.dispatchEvent(new Event(pause)));expect(vi.getTimerCount()).toBe(0)
  step(60000);act(()=>target.dispatchEvent(new Event(resume)))
  expect(vi.getTimerCount()).toBe(1);expect(layer().dataset.motionFrame).toBe('1')
 }
 expect(loaders).toHaveLength(1)
})
it('cancels pending stale decodes, preserves loaded resources across pauses and stops a paused action',async()=>{
 let finish!:()=>void
 const view=render(tree()),old=loaders[0]
 old.decode.mockReturnValueOnce(new Promise<void>(resolve=>{finish=resolve}))
 act(()=>old.onload!());view.rerender(tree(true))
 expect(old.onload).toBeNull();await act(async()=>finish())
 expect(layer().dataset.motionActive).toBe('false');expect(layer().dataset.motionAsset).toBe('loading')
 view.rerender(tree(false));await loaded();step(6250)
 const count=loaders.length;view.rerender(tree(true));expect(vi.getTimerCount()).toBe(0)
 view.rerender(tree(false));expect(loaders).toHaveLength(count);expect(layer().dataset.motionFrame).toBe('1')
})
it.each(['network','decode','display'])('retains the approved static Treasurer on %s motion failure and retries once online',async failure=>{
 await integration();expect(document.querySelector('.eden-avatar-appearance')?.getAttribute('data-avatar-id')).toBe('eden-treasurer')
 if(failure==='network')act(()=>loaders.at(-1)!.onerror!())
 else if(failure==='decode'){loaders.at(-1)!.decode.mockRejectedValueOnce(new Error('Bad atlas'));await loaded()}
 else{await loaded();fireEvent.error(layer().querySelector('image')!)}
 expect(layer().dataset.motionAsset).toBe('error');expect(layer().dataset.motionActive).toBe('false')
 expect(document.querySelector('.eden-avatar-static-image')?.getAttribute('src')).toContain('eden-treasurer-abacus-static')
 expect(document.querySelector('.eden-avatar-art')).toBeNull();expect(vi.getTimerCount()).toBe(0)
 const count=loaders.length;step(60000);expect(loaders).toHaveLength(count)
 act(()=>window.dispatchEvent(new Event('online')));expect(loaders).toHaveLength(count+1)
 await loaded();expect(layer().dataset.motionActive).toBe('true')
 const ready=loaders.length;act(()=>window.dispatchEvent(new Event('online')));expect(loaders).toHaveLength(ready)
})
it('keeps Finance Lock independent while a frame sequence is already in progress',async()=>{
 const view=await integration(false,true);await loaded();step(6250)
 expect(layer().dataset.motionFrame).toBe('2')
 view.rerender(<PrivacyLockContext.Provider value={{...unlockedPrivacyLock,enabled:true,locked:false}}><AvatarAppearance avatarId="eden-treasurer" motionEnabled perched={false} attentive={false} still={false}/></PrivacyLockContext.Provider>)
 step(80);expect(layer().dataset.motionFrame).toBe('3');expect(vi.getTimerCount()).toBe(1)
})
it('uses the original static Treasurer without loading motion in the integrated reduced path',async()=>{
 await integration(true)
 expect(loaders).toHaveLength(1)
 expect(document.querySelector('.eden-avatar-appearance')?.getAttribute('data-avatar-id')).toBe('eden-treasurer')
 expect(document.querySelector('.eden-avatar-appearance')?.getAttribute('data-avatar-mode')).toBe('static-prototype')
 expect(layer().dataset.motionActive).toBe('false');expect(vi.getTimerCount()).toBe(0)
})
it('removes a failed-atlas reconnect listener and never loads after unmount',()=>{
 const removed=vi.spyOn(window,'removeEventListener'),view=render(tree())
 act(()=>loaders[0].onerror!());expect(layer().dataset.motionAsset).toBe('error')
 view.unmount();act(()=>window.dispatchEvent(new Event('online')))
 expect(loaders).toHaveLength(1);expect(vi.getTimerCount()).toBe(0)
 expect(removed).toHaveBeenCalledWith('online',expect.any(Function))
})
