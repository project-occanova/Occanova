import {normalizeIndianMobile} from './mobile-otp';

export function matchesLoginIdentity(account:{email:string;phone:string;phoneVerified?:boolean},identity:string){
 const entered=identity.trim();
 if(entered.includes('@'))return account.email.trim().toLowerCase()===entered.toLowerCase();
 const mobile=normalizeIndianMobile(entered);
 return Boolean(mobile&&account.phoneVerified&&normalizeIndianMobile(account.phone)===mobile);
}
