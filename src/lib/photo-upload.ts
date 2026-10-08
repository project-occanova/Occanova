const MAX_UPLOAD_BYTES=4_000_000;
const supported=new Set(['image/jpeg','image/png','image/webp']);

async function openImage(file:File):Promise<{source:CanvasImageSource;width:number;height:number;close:()=>void}>{
  if(typeof createImageBitmap==='function'){
    try{const bitmap=await createImageBitmap(file);return {source:bitmap,width:bitmap.width,height:bitmap.height,close:()=>bitmap.close()};}catch{/* Safari may decode HEIC through an image element instead. */}
  }
  const url=URL.createObjectURL(file);
  try{
    const image=new Image();image.src=url;await image.decode();
    return {source:image,width:image.naturalWidth,height:image.naturalHeight,close:()=>URL.revokeObjectURL(url)};
  }catch{URL.revokeObjectURL(url);throw Error('This photo could not be opened. Please choose a JPG, PNG or WebP image, or export your iPhone photo as JPG.');}
}

export async function preparePhotoForUpload(file:File):Promise<File>{
  const isHeic=/\.hei[cf]$/i.test(file.name)||['image/heic','image/heif'].includes(file.type);
  if(!isHeic&&!supported.has(file.type))throw Error('Choose a JPG, PNG, WebP or iPhone HEIC photo.');
  if(!isHeic&&file.size<=MAX_UPLOAD_BYTES)return file;
  const opened=await openImage(file);
  try{
    const canvas=document.createElement('canvas');
    const scale=Math.min(1,1920/Math.max(opened.width,opened.height));
    canvas.width=Math.max(1,Math.round(opened.width*scale));canvas.height=Math.max(1,Math.round(opened.height*scale));
    const context=canvas.getContext('2d');if(!context)throw Error('This browser could not prepare the photo. Please use a JPG under 4 MB.');
    const outputType=file.type==='image/png'||file.type==='image/webp'?'image/webp':'image/jpeg';
    if(outputType==='image/jpeg'){context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);}
    context.drawImage(opened.source,0,0,canvas.width,canvas.height);
    for(const quality of [0.82,0.68,0.5]){
      const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,outputType,quality));
      if(blob&&blob.size>0&&blob.size<=MAX_UPLOAD_BYTES){const extension=outputType==='image/webp'?'webp':'jpg';return new File([blob],file.name.replace(/\.[^.]+$/,'')+`.${extension}`,{type:outputType});}
    }
    throw Error('This photo is still too large after resizing. Please choose a smaller photo.');
  }finally{opened.close();}
}
