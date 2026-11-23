// Decode and compare the six owner-supplied drawings. Originals stay outside Git.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

export const archivistMotionSources = [
  {file:'ChatGPT 图像 2026年11月21日 21_01_55-1.png',approvedName:'伊登档案员全身立绘.png',pose:'idle-open',hash:'4fb00c74ecbaf2afe1faabdd12434bf8ee1ce748b4571a25951d06377968827e'},
  {file:'ChatGPT 图像 2026年11月21日 21_01_57-2.png',approvedName:'档案员伊登的温柔半眨眼.png',pose:'blink-half',hash:'c2a3a00899bd22cb1c2b31125c771695ea028d7d18bb9432366ad1425eb8708a'},
  {file:'ChatGPT 图像 2026年11月21日 21_02_05-5.png',approvedName:'闭眼微笑的档案员伊登.png',pose:'blink-closed',hash:'4564c0c5c5dae81f3df31a07e7cc39b08e7f82bfc1c8d85b6340cbdc878e6104'},
  {file:'ChatGPT 图像 2026年11月21日 21_02_02-4.png',approvedName:'专注阅读的档案员伊登.png',pose:'clipboard-read',hash:'8c7f40d1ceb9d04af2f878a9f4a96a4738dd819b3abadfd55261548867558228'},
  {file:'ChatGPT 图像 2026年11月21日 21_02_00-3.png',approvedName:'档案管理员伊甸翻页记录.png',pose:'page-turn',hash:'b11fb11324b83482f9ba8372f286e42f2d9e68bf05da1cde4928a47509b79e5f'},
  {file:'ChatGPT 图像 2026年11月21日 21_02_07-6.png',approvedName:'档案员伊登_翻页后温和回归.png',pose:'recover-open',hash:'642df324a54cbf5abb9e043f64a526a48f55680770fbf9660a2298ea8f0ecfc6'},
]
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex')
export function bounds(data,width,height,threshold=16,top=0){
 let minX=width,minY=height,maxX=-1,maxY=-1,zero=0,edge=0
 for(let y=top;y<height;y++)for(let x=0;x<width;x++){
  const a=data[(y*width+x)*4+3];if(a===0)zero++
  if(a>=threshold){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);if(x===0||y===0||x===width-1||y===height-1)edge++}
 }
 return{minX,minY,maxX,maxY,zero,edge}
}
export async function readArchivistFrames(root){
 return Promise.all(archivistMotionSources.map(async(item,index)=>{
  const bytes=await readFile(path.join(root,item.file));assert.equal(sha256(bytes),item.hash)
  const meta=await sharp(bytes,{failOn:'warning'}).metadata()
  assert(meta.width===962&&meta.height===1635&&meta.hasAlpha&&meta.channels===4)
  const raw=await sharp(bytes).ensureAlpha().raw().toBuffer()
  return{...item,index,bytes,raw,meta,bounds:bounds(raw,962,1635),feet:bounds(raw,962,1635,16,1440)}
 }))
}
if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const root=path.resolve(process.argv[2]??'C:/Users/Eden Low/Downloads')
 const output=path.resolve('artifacts/browser-validation/avatar-part4g-b/inspection');await mkdir(output,{recursive:true})
 const frames=await readArchivistFrames(root)
 const panels=[]
 for(const frame of frames){
  panels.push(await sharp(frame.bytes).resize(192,327).flatten({background:'#f4f1eb'}).png().toBuffer())
 }
 await sharp({create:{width:192*6,height:327,channels:4,background:'#f4f1eb'}}).composite(panels.map((input,i)=>({input,left:i*192,top:0}))).png().toFile(path.join(output,'source-six-poses.png'))
 const report=frames.map(({bytes,raw:_raw,meta,...f})=>({...f,bytes:bytes.length,width:meta.width,height:meta.height,hasAlpha:meta.hasAlpha}))
 await writeFile(path.join(output,'inspection.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2))
}
