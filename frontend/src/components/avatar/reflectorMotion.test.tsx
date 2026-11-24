import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Profiler, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAvatarMotion } from './avatarMotion'
import { reflectorMotion } from './reflectorMotion'
import AvatarMotionLayer from './AvatarMotionLayer'
import { AvatarAppearance } from './AvatarAppearance'
import { PrivacyLockContext, unlockedPrivacyLock } from '../../privacy/privacyLockContext'

class Loader {
 onload:(()=>void)|null=null;onerror:(()=>void)|null=null;src='';decode=vi.fn(async()=>{})
 constructor(){loaders.push(this)}
}
let loaders:Loader[]
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(0);loaders=[];vi.stubGlobal('Image',Loader)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()})
const layer=()=>document.querySelector<HTMLElement>('.eden-avatar-motion-layer')!
it('plays the approved open/half/closed/half/open sequence in 380ms',()=>{
 const motion=createAvatarMotion(reflectorMotion),frames:number[]=[]
 motion.subscribe(()=>{const s=motion.getSnapshot();if(s.action==='blink')frames.push(s.frame)})
 motion.setActive(true);vi.advanceTimersByTime(6800+380)
 expect(frames).toEqual([0,1,2,1,0]);expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0})
 motion.setActive(false);expect(vi.getTimerCount()).toBe(0)
})
it('serializes a 1.8-second page turn without an inserted blink or overlapping timer',()=>{
 const motion=createAvatarMotion(reflectorMotion),frames:number[]=[],actions:string[]=[]
 motion.subscribe(()=>{const s=motion.getSnapshot();if(s.action==='pageTurn')frames.push(s.frame);actions.push(s.action)})
 motion.setActive(true);vi.advanceTimersByTime(26000);actions.length=0
 vi.advanceTimersByTime(1800)
 expect(frames).toEqual([0,3,4,5,0]);expect(actions).not.toContain('blink')
 expect(actions).not.toContain('abacus');expect(motion.getSnapshot().action).toBe('idle')
 for(let i=0;i<120;i++){vi.advanceTimersByTime(1000);expect(vi.getTimerCount()).toBe(1)}
 motion.setActive(false)
})
it('resumes a paused page turn at idle with fresh deadlines and no catch-up',()=>{
 const motion=createAvatarMotion(reflectorMotion)
 motion.setActive(true);vi.advanceTimersByTime(26700);expect(motion.getSnapshot().frame).toBe(4)
 motion.setActive(false);vi.advanceTimersByTime(120000);motion.setActive(true)
 expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0})
 vi.advanceTimersByTime(6799);expect(motion.getSnapshot().action).toBe('idle')
 motion.setActive(false);expect(vi.getTimerCount()).toBe(0)
})
it('uses real page cells, no idle commits, Reduced Motion pause and Strict Mode cleanup',async()=>{
 const commits=vi.fn(),tree=(paused=false)=><StrictMode><Profiler id="reflector" onRender={commits}><AvatarMotionLayer definition={reflectorMotion} paused={paused}/></Profiler></StrictMode>
 const view=render(tree(true));expect(loaders).toHaveLength(0)
 view.rerender(tree());await act(async()=>{loaders.at(-1)!.onload!()});fireEvent.load(layer().querySelector('image')!)
 const before=commits.mock.calls.length;act(()=>vi.advanceTimersByTime(6000));expect(commits).toHaveBeenCalledTimes(before)
 act(()=>vi.advanceTimersByTime(20700));expect(layer().dataset.motionAction).toBe('pageTurn')
 expect(layer().querySelector('svg')?.getAttribute('viewBox')).toBe('264 492 264 492')
 view.rerender(tree(true));expect(layer().dataset.motionActive).toBe('false');expect(vi.getTimerCount()).toBe(0)
 view.rerender(tree());expect(layer().dataset.motionFrame).toBe('1')
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})
it('keeps the approved static Reflector if the atlas fails and recovers once online',async()=>{
 render(<AvatarAppearance avatarId="eden-reflector" motionEnabled faceInward perched={false} attentive={false} still={false}/>)
 expect(document.querySelector('.eden-avatar-facing')?.hasAttribute('data-mirrored')).toBe(true) // Inward default during base load.
 await act(async()=>{loaders[0].onload!();await import('./AvatarMotionLayer')})
 expect(document.querySelector('.eden-avatar-facing')?.hasAttribute('data-mirrored')).toBe(false)
 act(()=>loaders.at(-1)!.onerror!())
 expect(layer().dataset.motionAsset).toBe('error')
 expect(document.querySelector('.eden-avatar-appearance')?.getAttribute('data-avatar-id')).toBe('eden-reflector')
 expect(document.querySelector('img')?.getAttribute('src')).toContain('eden-reflector-journal-static')
 expect(document.querySelector('.eden-avatar-art')).toBeNull()
 expect(document.querySelector('.eden-avatar-facing')?.hasAttribute('data-mirrored')).toBe(false)
 const count=loaders.length;act(()=>vi.advanceTimersByTime(60000));expect(loaders).toHaveLength(count)
 act(()=>dispatchEvent(new Event('online')));expect(loaders).toHaveLength(count+1)
 await act(async()=>{loaders.at(-1)!.onload!()});expect(layer().dataset.motionActive).toBe('false')
 fireEvent.load(layer().querySelector('image')!);expect(layer().dataset.motionActive).toBe('true')
})
it('ignores an old decode after unmount and removes its lifecycle/online listeners',async()=>{
 let finish!:()=>void
 const view=render(<AvatarMotionLayer definition={reflectorMotion} paused={false}/>),image=loaders[0]
 image.decode.mockReturnValueOnce(new Promise<void>(resolve=>{finish=resolve}))
 act(()=>image.onload!());view.unmount();await act(async()=>finish())
 expect(image.onload).toBeNull();expect(image.onerror).toBeNull();expect(vi.getTimerCount()).toBe(0)
 act(()=>dispatchEvent(new Event('online')));expect(loaders).toHaveLength(1)
})
it('does not interrupt a Reflector action on a Finance Lock context change',async()=>{
 const tree=(locked:boolean)=><PrivacyLockContext.Provider value={{...unlockedPrivacyLock,locked}}><AvatarMotionLayer definition={reflectorMotion} paused={false}/></PrivacyLockContext.Provider>
 const view=render(tree(true));await act(async()=>{loaders[0].onload!()});fireEvent.load(layer().querySelector('image')!)
 act(()=>vi.advanceTimersByTime(6850));expect(layer().dataset.motionFrame).toBe('2')
 view.rerender(tree(false));act(()=>vi.advanceTimersByTime(80))
 expect(layer().dataset.motionFrame).toBe('3');expect(vi.getTimerCount()).toBe(1)
})
it('does not start motion when the wardrobe uses its default static appearance path',async()=>{
 render(<AvatarAppearance avatarId="eden-reflector" perched={false} attentive={false} still={false}/>)
 await act(async()=>{loaders[0].onload!()})
 expect(document.querySelector('.eden-avatar-motion-layer')).toBeNull();expect(loaders).toHaveLength(1)
 expect(vi.getTimerCount()).toBe(0)
})
