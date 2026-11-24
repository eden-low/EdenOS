import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Profiler, StrictMode } from 'react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAvatarMotion } from './avatarMotion'
import { archivistMotion } from './archivistMotion'
import AvatarMotionLayer from './AvatarMotionLayer'
import { AvatarAppearance } from './AvatarAppearance'

class Loader {
 onload:(()=>void)|null=null;onerror:(()=>void)|null=null;src='';decode=vi.fn(async()=>{})
 constructor(){loaders.push(this)}
}
let loaders:Loader[]
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(0);loaders=[];vi.stubGlobal('Image',Loader)})
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers()})
const layer=()=>document.querySelector<HTMLElement>('.eden-avatar-motion-layer')!
it('plays the approved open/half/closed/half/open sequence in 380ms',()=>{
 const motion=createAvatarMotion(archivistMotion),frames:number[]=[]
 motion.subscribe(()=>{const s=motion.getSnapshot();if(s.action==='blink')frames.push(s.frame)})
 motion.setActive(true);vi.advanceTimersByTime(6200+380)
 expect(frames).toEqual([0,1,2,1,0]);expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0})
 motion.setActive(false);expect(vi.getTimerCount()).toBe(0)
})
it('serializes a 1.7-second page turn without an inserted blink or overlapping timer',()=>{
 const motion=createAvatarMotion(archivistMotion),frames:number[]=[],actions:string[]=[]
 motion.subscribe(()=>{const s=motion.getSnapshot();if(s.action==='pageTurn')frames.push(s.frame);actions.push(s.action)})
 motion.setActive(true);vi.advanceTimersByTime(22000);actions.length=0
 vi.advanceTimersByTime(1700)
 expect(frames).toEqual([0,3,4,5,0]);expect(actions).not.toContain('blink')
 expect(actions).not.toContain('abacus');expect(motion.getSnapshot().action).toBe('idle')
 for(let i=0;i<120;i++){vi.advanceTimersByTime(1000);expect(vi.getTimerCount()).toBe(1)}
 motion.setActive(false)
})
it('resumes a paused page turn at idle with fresh deadlines and no catch-up',()=>{
 const motion=createAvatarMotion(archivistMotion)
 motion.setActive(true);vi.advanceTimersByTime(22580);expect(motion.getSnapshot().frame).toBe(4)
 motion.setActive(false);vi.advanceTimersByTime(120000);motion.setActive(true)
 expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0})
 vi.advanceTimersByTime(6199);expect(motion.getSnapshot().action).toBe('idle')
 motion.setActive(false);expect(vi.getTimerCount()).toBe(0)
})
it('uses real page cells, no idle commits, Reduced Motion pause and Strict Mode cleanup',async()=>{
 const commits=vi.fn(),tree=(paused=false)=><StrictMode><Profiler id="archivist" onRender={commits}><AvatarMotionLayer definition={archivistMotion} paused={paused}/></Profiler></StrictMode>
 const view=render(tree(true));expect(loaders).toHaveLength(0)
 view.rerender(tree());await act(async()=>{loaders.at(-1)!.onload!()});fireEvent.load(layer().querySelector('image')!)
 const before=commits.mock.calls.length;act(()=>vi.advanceTimersByTime(6000));expect(commits).toHaveBeenCalledTimes(before)
 act(()=>vi.advanceTimersByTime(16580));expect(layer().dataset.motionAction).toBe('pageTurn')
 expect(layer().querySelector('svg')?.getAttribute('viewBox')).toBe('264 492 264 492')
 view.rerender(tree(true));expect(layer().dataset.motionActive).toBe('false');expect(vi.getTimerCount()).toBe(0)
 view.rerender(tree());expect(layer().dataset.motionFrame).toBe('1')
 view.unmount();expect(vi.getTimerCount()).toBe(0)
})
it('keeps the approved static Archivist if the atlas fails and recovers once online',async()=>{
 render(<AvatarAppearance avatarId="eden-archivist" motionEnabled perched={false} attentive={false} still={false}/>)
 await act(async()=>{loaders[0].onload!();await import('./AvatarMotionLayer')})
 act(()=>loaders.at(-1)!.onerror!())
 expect(layer().dataset.motionAsset).toBe('error')
 expect(document.querySelector('.eden-avatar-appearance')?.getAttribute('data-avatar-id')).toBe('eden-archivist')
 expect(document.querySelector('img')?.getAttribute('src')).toContain('eden-archivist-clipboard-static')
 expect(document.querySelector('.eden-avatar-art')).toBeNull()
 const count=loaders.length;act(()=>vi.advanceTimersByTime(60000));expect(loaders).toHaveLength(count)
 act(()=>dispatchEvent(new Event('online')));expect(loaders).toHaveLength(count+1)
 await act(async()=>{loaders.at(-1)!.onload!()});expect(layer().dataset.motionActive).toBe('false')
 fireEvent.load(layer().querySelector('image')!);expect(layer().dataset.motionActive).toBe('true')
})
it('does not start motion when the wardrobe uses its default static appearance path',async()=>{
 render(<AvatarAppearance avatarId="eden-archivist" perched={false} attentive={false} still={false}/>)
 await act(async()=>{loaders[0].onload!()})
 expect(document.querySelector('.eden-avatar-motion-layer')).toBeNull();expect(loaders).toHaveLength(1)
 expect(vi.getTimerCount()).toBe(0)
})
