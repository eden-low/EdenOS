// Real drawings only. Registration aligns shoes; it does not manufacture motion.
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { bounds, readArchivistFrames, sha256 } from './inspectArchivistMotion.mjs'

const source=path.resolve(process.argv[2]??'C:/Users/Eden Low/Downloads')
const output=path.resolve('src/components/avatar/assets')
const frames=await readArchivistFrames(source),crop={left:150,top:0,width:750,height:1644}
const cell={width:264,height:492},layers=[],records=[]
const footCenter=(frames[0].feet.minX+frames[0].feet.maxX)/2,footBaseline=1632
for(const frame of frames){
 const dx=Math.round(footCenter-(frame.feet.minX+frame.feet.maxX)/2),dy=footBaseline-frame.feet.maxY
 const registered=Buffer.alloc(962*1644*4)
 let cleared=0
 for(let y=0;y<1635;y++)for(let x=0;x<962;x++){
  const at=(y*962+x)*4,a=frame.raw[at+3]
  if(a<4){if(a>0)cleared++;continue}
  const tx=x+dx,ty=y+dy
  assert(tx>=crop.left&&tx<crop.left+crop.width&&ty>=0&&ty<1644,'Never clip a visible source pixel')
  frame.raw.copy(registered,(ty*962+tx)*4,at,at+4)
 }
 const png=await sharp(registered,{raw:{width:962,height:1644,channels:4}}).extract(crop).resize(cell.width,cell.height,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).png().toBuffer()
 layers.push({input:png,left:frame.index%3*cell.width,top:Math.floor(frame.index/3)*cell.height})
 records.push({index:frame.index+1,file:frame.file,approvedName:frame.approvedName,pose:frame.pose,sourceSha256:frame.hash,sourceBytes:frame.bytes.length,sourceBounds:frame.bounds,sourceFeet:frame.feet,registration:{x:dx,y:dy},nearInvisibleAlphaCleared:cleared})
}
const webp={quality:92,alphaQuality:100,effort:6,smartSubsample:true}
const atlas=await sharp({create:{width:792,height:984,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp(webp).toBuffer()
for(const [i,frame]of records.entries()){
 const raw=await sharp(atlas).extract({left:i%3*264,top:Math.floor(i/3)*492,...cell}).ensureAlpha().raw().toBuffer()
 frame.runtimeCellRawSha256=sha256(raw);frame.runtimeBounds=bounds(raw,264,492);frame.runtimeFeet=bounds(raw,264,492,16,430)
}
const still=await readFile(path.join(output,'eden-archivist-clipboard-static.webp'))
assert.equal(sha256(still),'75bef2ce7bfcd3e0175e7f7c5f367541084e45df391ac90ca0baefc9f88ebf83')
const record={id:'eden-archivist',version:'4G-B-prototype-v1',ownerAnimationAcceptance:'Pending',source:{width:962,height:1635,hasAlpha:true,ordering:'By verified visual pose; downloaded -3 is page-turn, -5 is blink-closed',approvedStillSourceSha256:'ac632b474484cbdc7e2180530d5d7c681f109e7611fda83e122ceb999ccda47d'},derivation:{crop,cell,fit:'contain',uniformScale:true,registration:'Integer pixel translation to approved first-frame shoe center and shared shoe baseline before uniform downsampling; no deformation, rotation or CSS pose animation',footCenter,footBaseline,webp},frames:records,runtime:{file:'eden-archivist-clipboard-motion-v1.webp',width:792,height:984,columns:3,rows:2,cell,cssFrame:{width:88,height:164},bytes:atlas.length,sha256:sha256(atlas)},fallback:'eden-archivist-clipboard-static.webp'}
await writeFile(path.join(output,record.runtime.file),atlas)
await writeFile(path.join(output,'eden-archivist-clipboard-motion-v1.json'),JSON.stringify(record,null,2)+'\n')
const qa=path.resolve('artifacts/browser-validation/avatar-part4g-b/inspection');await mkdir(qa,{recursive:true})
const thumbs=await Promise.all(records.map((_,i)=>sharp(atlas).extract({left:i%3*264,top:Math.floor(i/3)*492,...cell}).resize(88,164).flatten({background:'#f4f1eb'}).png().toBuffer()))
await sharp({create:{width:7*100,height:180,channels:4,background:'#f4f1eb'}}).composite([{input:await sharp(still).resize(88,164).png().toBuffer(),left:6,top:8},...thumbs.map((input,i)=>({input,left:(i+1)*100+6,top:8}))]).png().toFile(path.join(qa,'runtime-and-static.png'))
console.log(JSON.stringify(record,null,2))
