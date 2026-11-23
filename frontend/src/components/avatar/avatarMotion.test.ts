import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createAvatarMotion } from './avatarMotion'
import { treasurerMotion } from './treasurerMotion'

beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(0)})
afterEach(()=>vi.useRealTimers())
it('uses one low-frequency deadline and the true open/half/closed/half/open order',()=>{
 const motion=createAvatarMotion(treasurerMotion),trace:number[]=[]
 const listener=vi.fn(()=>{const state=motion.getSnapshot();if(state.action==='blink')trace.push(state.frame)})
 motion.subscribe(listener);motion.setActive(true)
 expect(vi.getTimerCount()).toBe(1)
 vi.advanceTimersByTime(6199);expect(listener).toHaveBeenCalledTimes(1)
 vi.advanceTimersByTime(1);expect(trace).toEqual([0])
 vi.advanceTimersByTime(380);expect(trace).toEqual([0,1,2,1,0])
 expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0,active:true})
 expect(vi.getTimerCount()).toBe(1)
 motion.setActive(false);expect(vi.getTimerCount()).toBe(0)
})
it('plays look-down, abacus touch and recovery in order without overlapping actions',()=>{
 const motion=createAvatarMotion(treasurerMotion),trace:number[]=[]
 motion.subscribe(()=>{const state=motion.getSnapshot();if(state.action==='abacus')trace.push(state.frame)})
 motion.setActive(true);vi.advanceTimersByTime(22000)
 expect(trace).toEqual([0]);expect(vi.getTimerCount()).toBe(1)
 vi.advanceTimersByTime(1600);expect(trace).toEqual([0,3,4,5,0])
 expect(motion.getSnapshot()).toMatchObject({action:'idle',frame:0})
 for(let i=0;i<120;i++){vi.advanceTimersByTime(1000);expect(vi.getTimerCount()).toBe(1)}
 motion.setActive(false)
})
it('cancels a mid-motion timer and restarts fresh deadlines without replaying missed work',()=>{
 const motion=createAvatarMotion(treasurerMotion)
 motion.setActive(true);vi.advanceTimersByTime(6250)
 expect(motion.getSnapshot().frame).toBe(1)
 motion.setActive(false);expect(motion.getSnapshot()).toMatchObject({frame:0,action:'idle',active:false})
 const listener=vi.fn();const unsubscribe=motion.subscribe(listener)
 vi.advanceTimersByTime(120000);expect(listener).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0)
 motion.setActive(true);motion.setActive(true);expect(vi.getTimerCount()).toBe(1)
 vi.advanceTimersByTime(6199);expect(motion.getSnapshot().action).toBe('idle')
 vi.advanceTimersByTime(1);expect(motion.getSnapshot().action).toBe('blink')
 unsubscribe();motion.setActive(false)
})
it('cannot leave a timer behind if a subscriber stops it synchronously during a tick',()=>{
 const motion=createAvatarMotion(treasurerMotion)
 motion.subscribe(()=>{if(motion.getSnapshot().action==='blink')motion.setActive(false)})
 motion.setActive(true);vi.advanceTimersByTime(6200)
 expect(motion.getSnapshot().active).toBe(false);expect(vi.getTimerCount()).toBe(0)
})
