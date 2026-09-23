import {randomUUID} from 'node:crypto';
import {DeleteObjectsCommand,GetObjectCommand,ListObjectsV2Command,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {hasStorage} from './config';
import type {Vendor} from './types';

const globals=globalThis as typeof globalThis&{occanovaS3?:S3Client};
const allowed={
  logo:{types:['image/jpeg','image/png','image/webp'],max:5_000_000},
  portfolio:{types:['image/jpeg','image/png','image/webp'],max:8_000_000},
  document:{types:['application/pdf','image/jpeg','image/png'],max:10_000_000},
} as const;
export type UploadKind=keyof typeof allowed;

function settings(){
  if(!hasStorage())throw Error('Private file storage is not configured.');
  return {bucket:process.env.S3_BUCKET!,region:process.env.S3_REGION!,endpoint:process.env.S3_ENDPOINT};
}
function client(){
  const config=settings();
  return globals.occanovaS3??=new S3Client({region:config.region,endpoint:config.endpoint||undefined,forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true',credentials:{accessKeyId:process.env.S3_ACCESS_KEY_ID!,secretAccessKey:process.env.S3_SECRET_ACCESS_KEY!}});
}
const extensions:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf'};
function uploadTarget(userId:string,kind:UploadKind,type:string,size:number){
  const policy=allowed[kind];if(!policy.types.includes(type as never)||size<1||size>policy.max)throw Error(`Choose an allowed ${kind} file within ${Math.floor(policy.max/1_000_000)} MB.`);
  const {bucket}=settings();const key=`vendors/${userId}/${kind}/${randomUUID()}.${extensions[type]}`;
  return {bucket,key,path:`/api/media?key=${encodeURIComponent(key)}`};
}
export async function createUpload(userId:string,kind:UploadKind,type:string,size:number){
  const {bucket,key,path}=uploadTarget(userId,kind,type,size);
  const uploadUrl=await getSignedUrl(client(),new PutObjectCommand({Bucket:bucket,Key:key,ContentType:type,ContentLength:size}),{expiresIn:300});
  return {key,uploadUrl,path};
}
export async function storeUpload(userId:string,kind:UploadKind,type:string,size:number,body:Uint8Array){
  const {bucket,key,path}=uploadTarget(userId,kind,type,size);
  await client().send(new PutObjectCommand({Bucket:bucket,Key:key,ContentType:type,ContentLength:size,Body:body}));
  return {key,path};
}
export async function createDownload(key:string){const {bucket}=settings();return getSignedUrl(client(),new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:300});}
export function validVendorKey(key:string){return /^vendors\/[a-f0-9-]+\/(logo|portfolio|document)\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key);}
export function storageKeyFromPath(value:string){
  if(!value.startsWith('/api/media?'))return undefined;
  try{const key=new URL(value,'http://local').searchParams.get('key')||'';return validVendorKey(key)?key:undefined;}catch{return undefined;}
}
export function vendorStorageKeys(vendor:Pick<Vendor,'image'|'gallery'|'documents'>){
  return [vendor.image,...vendor.gallery,...vendor.documents].map(storageKeyFromPath).filter((key):key is string=>Boolean(key));
}
export async function deleteUploads(keys:string[]){
  const safe=[...new Set(keys.filter(validVendorKey))];if(!safe.length)return 0;
  const {bucket}=settings();let deleted=0;
  for(let index=0;index<safe.length;index+=1000){const batch=safe.slice(index,index+1000);const result=await client().send(new DeleteObjectsCommand({Bucket:bucket,Delete:{Objects:batch.map(Key=>({Key})),Quiet:true}}));if(result.Errors?.length)throw Error(`Storage rejected ${result.Errors.length} file deletions.`);deleted+=batch.length;}
  return deleted;
}
export async function cleanupOrphanedUploads(referenced:Set<string>,olderThan:Date){
  const {bucket}=settings();let continuationToken:string|undefined;let scanned=0;const orphaned:string[]=[];
  do{
    const page=await client().send(new ListObjectsV2Command({Bucket:bucket,Prefix:'vendors/',ContinuationToken:continuationToken,MaxKeys:1000}));
    for(const object of page.Contents??[]){const key=object.Key;if(!key)continue;scanned++;if(validVendorKey(key)&&!referenced.has(key)&&object.LastModified&&object.LastModified<olderThan)orphaned.push(key);}
    continuationToken=page.IsTruncated?page.NextContinuationToken:undefined;
  }while(continuationToken);
  return {scanned,deleted:await deleteUploads(orphaned)};
}
