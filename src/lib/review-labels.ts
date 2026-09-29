import type {VendorStatus} from './types';
export const reviewLabels:Record<VendorStatus,string>={draft:'Draft',pending:'Pending review',approved:'Approved',rejected:'Changes requested',suspended:'Suspended',inactive:'Inactive'};
