import { NextResponse } from 'next/server';
import { processResetQuota } from '@/services/webhookService';

export const resetQuota = async (req: Request) => {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId (idempotency key)' }, { status: 400 });
    }

    const result = await processResetQuota(eventId);

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
