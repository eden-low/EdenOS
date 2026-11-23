// Read-only candidate gate. All generated inspection images stay in ignored QA
// artifacts; this script never writes a runtime asset or changes the registry.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const source=path.resolve(process.argv[2]??'artifacts/browser-validation/avatar-part4g-a/source')
const output=path.resolve('artifacts/browser-validation/avatar-part4g-a/inspection')
await mkdir(output,{recursive:true})
const digest=b=>createHash('sha256').update(b).digest('hex')
const manifest=JSON.parse(await readFile(path.join(source,'manifest.json'),'utf8'))
const provenance=JSON.parse(await readFile('src/components/avatar/assets/eden-treasurer-abacus-static.json','utf8'))
const sheetBytes=await readFile(path.join(source,manifest.generated_sprite.file))
assert.equal(digest(sheetBytes),manifest.generated_sprite.sha256)
const metadata=await sharp(sheetBytes,{failOn:'warning'}).metadata()
assert.equal(metadata.width,1536);assert.equal(metadata.height,1024);assert(metadata.hasAlpha)
const bounds=(data,width,height,threshold=4,region={x:0,y:0,width,height})=>{
 let minX=width,minY=height,maxX=-1,maxY=-1,visible=0,zero=0,opaque=0,edgeAlpha=0
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  const alpha=data[(y*width+x)*4+3];if(alpha===0)zero++;if(alpha===255)opaque++
  if((x===0||y===0||x===width-1||y===height-1)&&alpha>=threshold)edgeAlpha++
  if(alpha<threshold)continue;visible++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y)
 }
 return {minX,minY,maxX,maxY,visible,zero,opaque,edgeAlpha}
}
const frames=[]
for(const [at,item]of manifest.frames.entries()){
 const bytes=await readFile(path.join(source,item.file))
 assert.equal(digest(bytes),item.sha256)
 const meta=await sharp(bytes,{failOn:'warning'}).metadata()
 assert.equal(meta.width,512);assert.equal(meta.height,512);assert(meta.hasAlpha)
 const raw=await sharp(bytes,{failOn:'warning'}).ensureAlpha().raw().toBuffer()
 const cell=await sharp(sheetBytes).extract({left:at%3*512,top:Math.floor(at/3)*512,width:512,height:512}).ensureAlpha().raw().toBuffer()
 assert.equal(Buffer.compare(raw,cell),0,'Independent frame must be pixel-identical to its grid cell')
 frames.push({item,bytes,raw,metadata:meta,bounds:bounds(raw,512,512),head:bounds(raw,512,512,16,{x:120,y:0,width:280,height:180}),feet:bounds(raw,512,512,16,{x:120,y:435,width:280,height:77})})
}
const referenceBytes=await readFile(path.join(source,manifest.approved_still_reference.file))
assert.equal(digest(referenceBytes),manifest.approved_still_reference.sha256)
const referenceMetadata=await sharp(referenceBytes,{failOn:'warning'}).metadata()
const runtimeBytes=await readFile('src/components/avatar/assets/eden-treasurer-abacus-static.webp')
assert.equal(digest(runtimeBytes),provenance.runtime.sha256)
const recreatedReference=await sharp(referenceBytes).extract(provenance.derivation.crop).resize(352,656,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).webp(provenance.derivation.webp).toBuffer()
const runtimeRaw=await sharp(runtimeBytes).ensureAlpha().raw().toBuffer()
console.log(JSON.stringify({referenceReencodedMatchesTrustedStatic:digest(recreatedReference)===digest(runtimeBytes),referenceReencodedSha256:digest(recreatedReference),trustedBounds:bounds(runtimeRaw,352,656)}))
const left=Math.max(0,Math.min(...frames.map(f=>f.bounds.minX))-8)
const right=Math.min(512,Math.max(...frames.map(f=>f.bounds.maxX))+9)
// One common registration for all six cells. Extra transparent space to the
// right preserves the accepted Treasurer's horizontal/foot placement.
const crop={left:158,top:0,width:252,height:506}
assert(left>=crop.left&&right<=crop.left+crop.width)
assert(frames.every(f=>f.bounds.maxY<crop.height))
const regionDifference=(a,b,region)=>{
 let error=0,changed=0,visible=0
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  const offset=(y*512+x)*4,aa=a[offset+3]/255,ba=b[offset+3]/255
  if(aa<.02&&ba<.02)continue;visible++
  let pixelError=0
  for(let channel=0;channel<3;channel++)pixelError+=Math.abs(a[offset+channel]*aa-b[offset+channel]*ba)
  pixelError+=Math.abs(a[offset+3]-b[offset+3]);error+=pixelError/4
  if(pixelError/4>8)changed++
 }
 return {visiblePixels:visible,changedPixels:changed,meanPremultipliedChannelError:visible?error/visible:0}
}
const regions={head:{x:150,y:0,width:240,height:180},eyes:{x:190,y:105,width:145,height:60},abacus:{x:160,y:165,width:210,height:110},feet:{x:160,y:435,width:220,height:77}}
const frameReports=frames.map((f,at)=>({index:at+1,file:f.item.file,sha256:digest(f.bytes),bytes:f.bytes.length,width:512,height:512,hasAlpha:f.metadata.hasAlpha,cellRawSha256:digest(f.raw),pixelIdenticalToCell:true,bounds:f.bounds,head:f.head,feet:f.feet,differenceFromIdle:Object.fromEntries(Object.entries(regions).map(([name,region])=>[name,regionDifference(frames[0].raw,f.raw,region)]))}))
const normalized=[]
for(const frame of frames){
 const bytes=await sharp(frame.bytes).extract(crop).resize(88,164,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
 normalized.push(bytes)
 await writeFile(path.join(output,frame.item.name+'-88x164.png'),bytes)
 await sharp(frame.bytes).flatten({background:'#f4f1eb'}).png().toFile(path.join(output,frame.item.name+'-light.png'))
}
const referenceNormalized=await sharp(referenceBytes).extract(provenance.derivation.crop).resize(88,164,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
const staticNormalized=await sharp(runtimeBytes).resize(88,164).png().toBuffer()
const thumbs=[staticNormalized,referenceNormalized,...normalized]
const labels=['approved static','pack reference',...frames.map(f=>f.item.name)]
const contact=await sharp({create:{width:thumbs.length*116,height:210,channels:4,background:'#f4f1eb'}})
 .composite(thumbs.map((input,at)=>({input,left:at*116+14,top:30}))).png().toBuffer()
await writeFile(path.join(output,'runtime-scale-comparison.png'),contact)
await sharp(contact).resize(thumbs.length*232,420,{kernel:'nearest'}).png().toFile(path.join(output,'runtime-scale-comparison-2x.png'))
const referenceLarge=await sharp(referenceBytes).extract(provenance.derivation.crop).resize(352,656,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
const firstLarge=await sharp(frames[0].bytes).extract(crop).resize(352,656,{fit:'contain',position:'centre',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()
await sharp({create:{width:1056,height:656,channels:4,background:'#f4f1eb'}}).composite([{input:runtimeBytes,left:0,top:0},{input:referenceLarge,left:352,top:0},{input:firstLarge,left:704,top:0}]).png().toFile(path.join(output,'identity-comparison.png'))
for(const [name,area]of Object.entries({face:{left:180,top:75,width:170,height:100},handsAndAbacus:{left:165,top:170,width:155,height:100}})){
 const crops=await Promise.all(frames.map(f=>sharp(f.bytes).extract(area).flatten({background:'#f4f1eb'}).png().toBuffer()))
 await sharp({create:{width:area.width*6,height:area.height,channels:4,background:'#f4f1eb'}}).composite(crops.map((input,i)=>({input,left:i*area.width,top:0}))).png().toFile(path.join(output,name+'-all-six.png'))
}
const smallRaw=await Promise.all(normalized.map(bytes=>sharp(bytes).ensureAlpha().raw().toBuffer()))
const smallDifference=(a,b,region)=>{
 let changed=0,sum=0,maximum=0
 for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++){
  const offset=(y*88+x)*4,aa=a[offset+3]/255,ba=b[offset+3]/255
  let error=0;for(let c=0;c<3;c++)error+=Math.abs(a[offset+c]*aa-b[offset+c]*ba)
  error=(error+Math.abs(a[offset+3]-b[offset+3]))/4;sum+=error;maximum=Math.max(maximum,error);if(error>8)changed++
 }
 return {changedPixelsAbove8:changed,meanError:sum/(region.width*region.height),maximumError:maximum}
}
const smallComparisons=Object.fromEntries([[0,1],[0,2],[0,3],[3,4],[4,5],[5,0]].map(([a,b])=>[`${a+1}-${b+1}`,Object.fromEntries(Object.entries({whole:{x:0,y:0,width:88,height:164},face:{x:8,y:24,width:65,height:34},handsAndAbacus:{x:4,y:53,width:60,height:36},feet:{x:8,y:139,width:64,height:25}}).map(([name,region])=>[name,smallDifference(smallRaw[a],smallRaw[b],region)]))]))
const report={zipSha256:'6455958377e9e7cae0ba50a87dabe1991e14a18cd6e50d9a763692667f1c6192',sourceSheet:{file:manifest.generated_sprite.file,sha256:digest(sheetBytes),bytes:sheetBytes.length,width:metadata.width,height:metadata.height,hasAlpha:metadata.hasAlpha},reference:{file:manifest.approved_still_reference.file,sha256:digest(referenceBytes),bytes:referenceBytes.length,width:referenceMetadata.width,height:referenceMetadata.height,hasAlpha:referenceMetadata.hasAlpha,matchesHistoricSourceHash:digest(referenceBytes)===provenance.source.sha256},trustedStatic:provenance.runtime,commonDiagnosticCrop:crop,frameOrder:labels,frames:frameReports,smallComparisons,headTopRange:[Math.min(...frames.map(f=>f.head.minY)),Math.max(...frames.map(f=>f.head.minY))],footBottomRange:[Math.min(...frames.map(f=>f.feet.maxY)),Math.max(...frames.map(f=>f.feet.maxY))],decision:'Visual review required; no runtime asset generated'}
await writeFile(path.join(output,'inspection.json'),JSON.stringify(report,null,2))
console.log(JSON.stringify(report,null,2))
