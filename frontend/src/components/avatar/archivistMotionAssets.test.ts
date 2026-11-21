// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import metadata from './assets/eden-archivist-clipboard-motion-v1.json'

const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
it('verifies all true drawing cells, source order, transparency, registered shoes and static fallback',async()=>{
 const bytes=await readFile(new URL('./assets/eden-archivist-clipboard-motion-v1.webp',import.meta.url))
 expect(digest(bytes)).toBe(metadata.runtime.sha256);expect(bytes.length).toBe(metadata.runtime.bytes)
 expect(await sharp(bytes).metadata()).toMatchObject({width:792,height:984,hasAlpha:true})
 expect(metadata.frames.map(f=>f.pose)).toEqual(['idle-open','blink-half','blink-closed','clipboard-read','page-turn','recover-open'])
 expect(metadata.frames[2].file).toContain('21_02_05-5');expect(metadata.frames[4].file).toContain('21_02_00-3')
 const feet:number[]=[],centers:number[]=[],heads:number[]=[]
 for(const [i,frame]of metadata.frames.entries()){
  const raw=await sharp(bytes).extract({left:i%3*264,top:Math.floor(i/3)*492,width:264,height:492}).ensureAlpha().raw().toBuffer()
  expect(digest(raw)).toBe(frame.runtimeCellRawSha256)
  let bottom=0,head=492,minX=264,maxX=-1,zero=0
  for(let y=0;y<492;y++)for(let x=0;x<264;x++){
   const a=raw[(y*264+x)*4+3];if(a===0)zero++
   if(x===0||x===263||y===0||y===491)expect(a).toBe(0)
   if(a>=16){head=Math.min(head,y);bottom=Math.max(bottom,y);if(y>=430){minX=Math.min(minX,x);maxX=Math.max(maxX,x)}}
  }
  expect(zero).toBeGreaterThan(50000);feet.push(bottom);centers.push((minX+maxX)/2);heads.push(head)
 }
 expect(Math.max(...feet)-Math.min(...feet)).toBeLessThanOrEqual(1)
 expect(Math.max(...centers)-Math.min(...centers)).toBeLessThanOrEqual(1)
 expect(Math.max(...heads.slice(0,3))-Math.min(...heads.slice(0,3))).toBeLessThanOrEqual(2)
 expect(heads[3]-heads[0]).toBeGreaterThan(3) // Drawn look-down is intentional, not an idle jump.
 const still=await readFile(new URL('./assets/eden-archivist-clipboard-static.webp',import.meta.url))
 expect(digest(still)).toBe('75bef2ce7bfcd3e0175e7f7c5f367541084e45df391ac90ca0baefc9f88ebf83')
})
