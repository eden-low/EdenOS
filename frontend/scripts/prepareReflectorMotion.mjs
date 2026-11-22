// B2 candidate gate + reproducible export. No drawing, mirroring or pose repair.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const root=path.resolve(process.argv[2]??'artifacts/browser-validation/avatar-part4g-b2/source')
const output=path.resolve('src/components/avatar/assets'),qa=path.resolve('artifacts/browser-validation/avatar-part4g-b2/inspection')
const digest=bytes=>createHash('sha256').update(bytes).digest('hex')
const files=['01_idle-think.png','02_blink-half.png','03_blink-closed.png','04_journal-write.png','05_page-turn.png','06_recover-think.png']
const hashes=['ecb96b1362d3f54f6924968138e478ba9e7c2987806c5422b59d3a6aec1a5f13','10a4549b755ae8beb4976478ec3d3a559aeee6c2ccf3942cfa5f4ae813abb7e9','8143a4c7e9dbbe639b0fad4e87e1aab6ff3501fa5ba03ce7ff85658748d10a51','b63450a8b2ed72d30387a2ae9bdfa17f4992332e10012bbf18834d91c0a6a5ef','8c2e0a1493601344b1a2bc1188e587155105397695055ca9e7283c2c0bbd2de0','054b298bdfa2d718ebb311af6f8a567bc8e259881416197b706494762c42dc21']
const manifestBytes=await readFile(path.join(root,'manifest.json')),manifest=JSON.parse(manifestBytes)
const sheet=await readFile(path.join(root,'reflector-sixframe-CANDIDATE.png'))
assert.equal(digest(sheet),'d43dc94b4977e44c08d4c2facd16a2250544f2d815059f85a5c509a4e11f6c9e')
const sheetMeta=await sharp(sheet,{failOn:'warning'}).metadata()
assert(sheetMeta.width===1920&&sheetMeta.height===900&&sheetMeta.hasAlpha)
for(const [file,entry]of Object.entries(manifest.files)){
 const input=await readFile(path.join(root,file));assert.equal(digest(input),entry.sha256)
 const m=await sharp(input,{failOn:'warning'}).metadata();assert.deepEqual([m.width,m.height],entry.dimensions)
}
const crop={left:0,top:42,width:320,height:828},cell={width:264,height:492},layers=[],frames=[]
for(const [i,file]of files.entries()){
 const input=await readFile(path.join(root,file));assert.equal(digest(input),hashes[i])
 const m=await sharp(input,{failOn:'warning'}).metadata();assert(m.width===320&&m.height===900&&m.hasAlpha&&m.channels===4)
 const raw=await sharp(input).ensureAlpha().raw().toBuffer()
 const sourceCell=await sharp(sheet).extract({left:i*320,top:0,width:320,height:900}).ensureAlpha().raw().toBuffer()
 assert(sourceCell.equals(raw),'Independent frame must match its six-column source cell')
 let cleared=0,minY=900,maxY=-1,zero=0,edge=0
 for(let y=0;y<900;y++)for(let x=0;x<320;x++){
  const at=(y*320+x)*4+3,a=raw[at]
  if(a===0)zero++
  if(a>0&&a<4){raw[at]=0;cleared++;continue}
  if(a>=4){assert(y>=crop.top&&y<crop.top+crop.height,'No visible artwork may be cropped');if(x===0||x===319||y===0||y===899)edge++}
  if(a>=16){minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 }
 assert.equal(edge,0)
 const png=await sharp(raw,{raw:{width:320,height:900,channels:4}}).extract(crop).resize(cell.width,cell.height,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).png().toBuffer()
 layers.push({input:png,left:i%3*264,top:Math.floor(i/3)*492})
 frames.push({index:i+1,file,sourceSha256:hashes[i],sourceBytes:input.length,sourceCellRawSha256:digest(sourceCell),sourceAlpha:{zero,edgeVisiblePixels:edge,headTop:minY,shoeBottom:maxY,nearInvisibleCleared:cleared}})
}
const webp={quality:92,alphaQuality:100,effort:6,smartSubsample:true}
const atlas=await sharp({create:{width:792,height:984,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(layers).webp(webp).toBuffer()
for(const [i,frame]of frames.entries()){
 const raw=await sharp(atlas).extract({left:i%3*264,top:Math.floor(i/3)*492,...cell}).ensureAlpha().raw().toBuffer()
 frame.runtimeCellRawSha256=digest(raw)
}
const still=await readFile(path.join(output,'eden-reflector-journal-static.webp'))
assert.equal(digest(still),'c19601cedd49beabf63ea3017eecc050010e5c3e3ed98684eee3e156d83b7ca3')
const metadata={id:'eden-reflector',version:'4G-B2-candidate-v1',ownerAnimationAcceptance:'Pending',source:{zip:'EdenOS_Part4G_B2_Reflector_Visual_Review.zip',zipBytes:6900599,zipSha256:'bdb5a0b806080d988fe23af0121ca9836c9f1792f6514be293f89995740a521d',historicalManifestStatus:manifest.status,manifestSha256:digest(manifestBytes),currentAuthorization:'Owner explicitly authorized B2 staging candidate integration on 2026-11-22; historical draft label retained, not final visual acceptance',sheet:'reflector-sixframe-CANDIDATE.png',sheetSha256:digest(sheet),width:1920,height:900,columns:6,cell:{width:320,height:900},referenceSha256:manifest.files['approved-reflector-REFERENCE.png'].sha256,historicalApprovedSourceSha256:'c9aa5e052b165961f1c54eb7352eb98f284cc70c7a01aae21a6559c1ac0dad1a'},derivation:{crop,cell,fit:'contain',uniformAcrossFrames:true,mirror:false,registration:null,alphaCleanup:'Only 1–3/255 export speckles; all alpha >=4 artwork retained',webp},frames,runtime:{file:'eden-reflector-journal-motion-v1.webp',width:792,height:984,columns:3,rows:2,cell,cssFrame:{width:88,height:164},nativeFacing:'right',bytes:atlas.length,sha256:digest(atlas)},fallback:'eden-reflector-journal-static.webp',limitations:['Candidate lapel/collar/folds differ from accepted still with owner staging permission','Frame 04 is a writing pose, not multiple independently drawn pen strokes']}
await writeFile(path.join(output,metadata.runtime.file),atlas)
await writeFile(path.join(output,'eden-reflector-journal-motion-v1.json'),JSON.stringify(metadata,null,2)+'\n')
await mkdir(qa,{recursive:true})
const panels=[await sharp(still).resize(88,164).png().toBuffer(),...await Promise.all(frames.map((_,i)=>sharp(atlas).extract({left:i%3*264,top:Math.floor(i/3)*492,...cell}).resize(88,164).png().toBuffer()))]
await sharp({create:{width:700,height:180,channels:4,background:'#10131f'}}).composite(panels.map((input,i)=>({input,left:i*100+6,top:8}))).png().toFile(path.join(qa,'static-and-runtime-88x164.png'))
console.log(JSON.stringify(metadata,null,2))
