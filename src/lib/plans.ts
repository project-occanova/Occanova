export const subscriptionPlans={
 starter:{name:'Starter',monthlyRupees:199,portfolioLimit:10,categoryLimit:1,packageLimit:3,staffLimit:0,description:'For new and independent vendors.'},
 growth:{name:'Growth',monthlyRupees:299,portfolioLimit:25,categoryLimit:2,packageLimit:6,staffLimit:0,description:'For businesses ready to build trust and visibility.'},
 pro:{name:'Pro',monthlyRupees:499,portfolioLimit:50,categoryLimit:3,packageLimit:12,staffLimit:2,description:'For active vendors who want stronger promotion.'},
 premium:{name:'Premium',monthlyRupees:999,portfolioLimit:100,categoryLimit:null,packageLimit:null,staffLimit:5,description:'For established teams, venues and multi-branch businesses.'},
} as const;
export type PlanId=keyof typeof subscriptionPlans;
export const planIds=Object.keys(subscriptionPlans) as PlanId[];
export function isPlanId(value:unknown):value is PlanId{return typeof value==='string'&&Object.hasOwn(subscriptionPlans,value);}
