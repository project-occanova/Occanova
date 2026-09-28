import {NextRequest} from 'next/server';
import {paymentRequest} from '@/lib/payment-api';
export const runtime='nodejs';
export async function POST(req:NextRequest){return paymentRequest(req,'verify');}
