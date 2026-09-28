import {subscriptionPlans,type PlanId} from '@/lib/plans';

export function TrialOffer({plan}:{plan:PlanId}){
 const details=subscriptionPlans[plan];
 return <aside className="trial-offer" aria-label="Two-month free trial">
  <div className="trial-offer-duration"><strong>2</strong><span>months free</span></div>
  <div><span className="trial-offer-label">Your welcome offer</span><h3>Start with a 2-month free trial</h3><p><strong>₹0 plan fee for the first two months.</strong> Then ₹{details.monthlyRupees}/month, including GST, on the {details.name} plan.</p><small>Your selected plan’s limits apply during the trial. Set up AutoPay now; cancel before your first scheduled debit. Your bank may process a small mandate authorization amount.</small></div>
 </aside>;
}
