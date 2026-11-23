// Deterministic derivation of the inspected six true frames; no drawing/warping.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=path.resolve(process.argv[2]??'artifacts/browser-validation/avatar-part4g-a/source')
const output=path.resolve('src/components/avatar/assets')
const hashes=['004ca91a5c2dcdbc0a9963af2c3de05257f9cb35d17c33b23f8d787f9ee7e788','44b21fc3c602399477b60b299eb3fdeff815acfa8fb9039aa5ad46c40bfa660a','f2af5d5ccd778a37588404381a1e9451a9d222c3bf21f4c2f69ff082424945f2','95d94ee1a0908fabe3b88f4a310172be2f8002d6602f1bcf12a9fd5890b4bf1c','a70482b7776e5d1887b7d09467ff8ac6000daaa55ebb113ab11f90e6df51e7de','d869aa199f6917dd60f6ee5ca61a47eba180b87b788fef8d94d643e6818976f0']
const files=['01_idle-open.png','02_blink-half.png','03_blink-closed.png','04_look-down.png','05_abacus-touch.png','06_recover-open.png']
const digest=b=>createHash('sha256').update(b).digest('hex')
const sheet=await readFile(path.join(source,'treasurer-motion-sixframe-source.png'))
assert.equal(digest(sheet),'2685cfca4fa03f5ff2dc4820281f88d888ef6fe3d7ec97a292154dc7793f1041')
const sheetMeta=await sharp(sheet,{failOn:'warning'}).metadata()
assert(sheetMeta.hasAlpha&&sheetMeta.width===1536&&sheetMeta.height===1024)
const ref=await readFile(path.join(source,'treasurer-original-approved-reference.png'))
assert.equal(digest(ref),'dc7b4e1b63f8e5a7dfe3240ad09325b4e78f5f5e0c0c7227cc97328a795288df')
// One common transform preserves the accepted still's body/foot placement.
// All alpha>=4 pixels in every source cell are inside this crop; no per-frame
// corrective translations, rotation, stretching or pose changes are applied.
const crop={left:158,top:0,width:252,height:506},cell={width:264,height:492}
const frames=[],layers=[]
for(const [index,file]of files.entries()){
 const input=await readFile(path.join(source,file));assert.equal(digest(input),hashes[index])
 const original=await sharp(input,{failOn:'warning'}).ensureAlpha().raw().toBuffer({resolveWithObject:true})
 assert(original.info.width===512&&original.info.height===512)
 const fromSheet=await sharp(sheet).extract({left:index%3*512,top:Math.floor(index/3)*512,width:512,height:512}).ensureAlpha().raw().toBuffer()
 assert.equal(Buffer.compare(original.data,fromSheet),0)
 let cleared=0
 for(let y=0;y<512;y++)for(let x=0;x<512;x++){
  const alphaAt=(y*512+x)*4+3,alpha=original.data[alphaAt]
  if(alpha>0&&alpha<4){original.data[alphaAt]=0;cleared++}
  if(alpha>=4)assert(x>=crop.left&&x<crop.left+crop.width&&y>=crop.top&&y<crop.top+crop.height,'No character pixels may be clipped')
 }
 const pixels=await sharp(original.data,{raw:{width:512,height:512,channels:4}}).extract(crop).resize(cell.width,cell.height,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).png().toBuffer()
 layers.push({input:pixels,left:index%3*cell.width,top:Math.floor(index/3)*cell.height})
 frames.push({index:index+1,cell:index,file,sourceSha256:hashes[index],sourceCellRawSha256:digest(fromSheet),nearInvisibleAlphaCleared:cleared})
}
const width=cell.width*3,height=cell.height*2
const bytes=await sharp({create:{width,height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp({quality:92,alphaQuality:100,effort:6,smartSubsample:true}).toBuffer()
for(const frame of frames){
 const raw=await sharp(bytes).extract({left:frame.cell%3*cell.width,top:Math.floor(frame.cell/3)*cell.height,...cell}).ensureAlpha().raw().toBuffer()
 frame.runtimeCellRawSha256=digest(raw)
}
const record={id:'eden-treasurer',version:'4G-A-candidate-v1',ownerAnimationAcceptance:'Pending',source:{zip:'Part4G_A_Treasurer_Motion_Asset_Pack.zip',zipSha256:'6455958377e9e7cae0ba50a87dabe1991e14a18cd6e50d9a763692667f1c6192',sheet:'treasurer-motion-sixframe-source.png',sha256:digest(sheet),width:1536,height:1024,bytes:sheet.length,reference:'treasurer-original-approved-reference.png',referenceSha256:digest(ref),historicalStillSourceSha256:'beeeac4d3a2b8a96119f6d8a84e83492f105fef7db01e1d26bda7b0e8450cf42',referenceExactPixelIdentityNotEstablished:true},derivation:{crop,cell,fit:'contain',position:'centre',uniformAcrossFrames:true,webp:{quality:92,alphaQuality:100,effort:6,smartSubsample:true}},frames,runtime:{file:'eden-treasurer-abacus-motion-v1.webp',width,height,cell,columns:3,rows:2,cssFrame:{width:88,height:164},bytes:bytes.length,sha256:digest(bytes)},fallback:'eden-treasurer-abacus-static.webp',visualReview:{technicalIntegrity:'passed',headTopSourcePixelRange:[7,8],footBottomSourcePixelRange:[497,498],blink:'visible at 88x164',abacus:'look-down and fingertip action visible; fine bead movement requires owner device acceptance'}}
await mkdir(output,{recursive:true})
await writeFile(path.join(output,record.runtime.file),bytes)
await writeFile(path.join(output,'eden-treasurer-abacus-motion-v1.json'),JSON.stringify(record,null,2)+'\n')
console.log(JSON.stringify(record,null,2))
