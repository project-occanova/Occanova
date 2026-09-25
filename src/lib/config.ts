export const databaseUrl=()=>process.env.MONGODB_URI||process.env.ATLAS_MONGODB_URI||process.env.ATLAS_URL||process.env.MONGODB_URL;
export const hasDatabase=()=>Boolean(databaseUrl());
export const hasEmail=()=>Boolean(process.env.RESEND_API_KEY&&process.env.EMAIL_FROM);
export const hasStorage=()=>Boolean(process.env.S3_BUCKET&&process.env.S3_REGION&&process.env.S3_ACCESS_KEY_ID&&process.env.S3_SECRET_ACCESS_KEY);
export const hasMobileOtp=()=>Boolean(process.env.TWILIO_ACCOUNT_SID&&process.env.TWILIO_AUTH_TOKEN&&process.env.TWILIO_VERIFY_SERVICE_SID);
export const backendReady=()=>hasDatabase();
export const siteIndexable=()=>process.env.SITE_INDEXABLE==='true';
export const localPreview=()=>process.env.VERCEL!=='1'&&(process.env.LOCAL_PREVIEW==='true'||process.env.NODE_ENV!=='production');
export const mobileOtpEnabled=()=>hasMobileOtp()||localPreview();
export const publicIntakeEnabled=()=>localPreview()||(backendReady()&&hasEmail()&&process.env.PUBLIC_INTAKE_ENABLED==='true');
export function siteUrl(){
  const vercelHost=process.env.VERCEL_PROJECT_PRODUCTION_URL||process.env.VERCEL_URL;
  return (process.env.NEXT_PUBLIC_SITE_URL||(vercelHost?`https://${vercelHost}`:'http://localhost:3000')).replace(/\/$/,'');
}
export function readOnlyDeployment(){
  if(process.env.OCCANOVA_READ_ONLY==='true')return true;
  if(localPreview())return false;
  return process.env.VERCEL==='1'&&!backendReady();
}
