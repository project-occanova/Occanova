import {randomUUID} from 'node:crypto';
import {GetObjectCommand,PutObjectCommand,S3Client} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {hasStorage} from './config';

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
export async function createUpload(userId:string,kind:UploadKind,type:string,size:number){
  const policy=allowed[kind];if(!policy.types.includes(type as never)||size<1||size>policy.max)throw Error(`Choose an allowed ${kind} file within ${Math.floor(policy.max/1_000_000)} MB.`);
  const {bucket}=settings();const key=`vendors/${userId}/${kind}/${randomUUID()}.${extensions[type]}`;
  const uploadUrl=await getSignedUrl(client(),new PutObjectCommand({Bucket:bucket,Key:key,ContentType:type,ContentLength:size}),{expiresIn:300});
  return {key,uploadUrl,path:`/api/media?key=${encodeURIComponent(key)}`};
}
export async function createDownload(key:string){const {bucket}=settings();return getSignedUrl(client(),new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:300});}
export function validVendorKey(key:string){return /^vendors\/[a-f0-9-]+\/(logo|portfolio|document)\/[a-f0-9-]+\.(jpg|png|webp|pdf)$/.test(key);}
