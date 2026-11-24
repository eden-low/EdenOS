// @vitest-environment node
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { expect, it } from 'vitest'
import metadata from './assets/eden-reflector-journal-motion-v1.json'

const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex')
it('validates six unchanged authorized cells, alpha, common crop, feet, native facing and the D2 canonical still',async()=>{
 const bytes=await readFile(new URL('./assets/eden-reflector-journal-motion-v1.webp',import.meta.url))
 expect(hash(bytes)).toBe(metadata.runtime.sha256);expect(bytes.length).toBe(metadata.runtime.bytes)
 expect(await sharp(bytes).metadata()).toMatchObject({width:792,height:984,hasAlpha:true})
 expect(metadata.frames.map(f=>f.file)).toEqual(['01_idle-think.png','02_blink-half.png','03_blink-closed.png','04_journal-write.png','05_page-turn.png','06_recover-think.png'])
 expect(metadata.source.historicalManifestStatus).toBe('VISUAL_DRAFT_NOT_APPROVED')
 expect(metadata.ownerAnimationAcceptance).toBe('Pending');expect(metadata.runtime.nativeFacing).toBe('right')
 expect(metadata.derivation).toMatchObject({crop:{left:0,top:42,width:320,height:828},mirror:false,registration:null,uniformAcrossFrames:true})
 const heads:number[]=[],feet:number[]=[]
 for(const [i,frame]of metadata.frames.entries()){
  const raw=await sharp(bytes).extract({left:i%3*264,top:Math.floor(i/3)*492,width:264,height:492}).ensureAlpha().raw().toBuffer()
  expect(hash(raw)).toBe(frame.runtimeCellRawSha256)
  let head=492,foot=0,zero=0
  for(let y=0;y<492;y++)for(let x=0;x<264;x++){
   const a=raw[(y*264+x)*4+3];if(a===0)zero++
   if(x===0||x===263||y===0||y===491)expect(a).toBe(0)
   if(a>=16){head=Math.min(head,y);foot=Math.max(foot,y)}
  }
  expect(zero).toBeGreaterThan(50000);heads.push(head);feet.push(foot)
 }
 expect(Math.max(...feet)-Math.min(...feet)).toBeLessThanOrEqual(1)
 expect(Math.max(...heads.slice(0,3))-Math.min(...heads.slice(0,3))).toBeLessThanOrEqual(1)
 const still=await readFile(new URL('./assets/eden-reflector-journal-static.webp',import.meta.url))
 expect(hash(still)).toBe('dddd16cda31445da237139989eab5898eb74e3574132158bc8ba8f4a235d6879')
})
