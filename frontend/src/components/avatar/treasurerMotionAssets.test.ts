// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import metadata from './assets/eden-treasurer-abacus-motion-v1.json'

const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
it('verifies the optimized atlas, 6 source mappings, transparency, stable anchors and untouched fallback',async()=>{
 const atlas=await readFile(new URL('./assets/eden-treasurer-abacus-motion-v1.webp',import.meta.url))
 const info=await sharp(atlas).metadata()
 expect(digest(atlas)).toBe(metadata.runtime.sha256);expect(atlas.length).toBe(metadata.runtime.bytes)
 expect(info).toMatchObject({width:792,height:984,hasAlpha:true})
 expect(metadata.frames.map(f=>f.file)).toEqual(['01_idle-open.png','02_blink-half.png','03_blink-closed.png','04_look-down.png','05_abacus-touch.png','06_recover-open.png'])
 expect(metadata.derivation).toMatchObject({crop:{left:158,top:0,width:252,height:506},uniformAcrossFrames:true})
 const headTop:number[]=[],footBottom:number[]=[]
 for(const [index,frame]of metadata.frames.entries()){
  const {data,info}=await sharp(atlas).extract({left:index%3*264,top:Math.floor(index/3)*492,width:264,height:492}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
  expect(digest(data)).toBe(frame.runtimeCellRawSha256);expect(frame.cell).toBe(index)
  let zero=0,top=492,bottom=0,visible=0
  for(let y=0;y<492;y++)for(let x=0;x<264;x++){
   const alpha=data[(y*info.width+x)*4+3];if(alpha===0)zero++
   if(x===0||y===0||x===263||y===491)expect(alpha).toBe(0)
   if(alpha>=16){visible++;top=Math.min(top,y);bottom=Math.max(bottom,y)}
  }
  expect(zero).toBeGreaterThan(50000);expect(visible).toBeGreaterThan(30000)
  headTop.push(top);footBottom.push(bottom)
 }
 expect(Math.max(...headTop)-Math.min(...headTop)).toBeLessThanOrEqual(2)
 expect(Math.max(...footBottom)-Math.min(...footBottom)).toBeLessThanOrEqual(2)
 const fallback=await readFile(new URL('./assets/eden-treasurer-abacus-static.webp',import.meta.url))
 expect(digest(fallback)).toBe('681f00353d7c9df19dd8f18d60964985e4d5a51b6df42e22eab0c1518b38abb3')
})
