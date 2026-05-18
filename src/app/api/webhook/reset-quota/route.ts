import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';

export async function POST(req: Request) {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return NextResponse.json({ error: 'Missing eventId (idempotency key)' }, { status: 400 });
    }

    // Wrap in a transaction to handle idempotency safely
    const result = await prisma.$transaction(async (tx) => {
      // Check if event was already processed
      const existingEvent = await tx.webhookEvent.findUnique({
        where: { id: eventId }
      });

      if (existingEvent) {
        return { status: 'already_processed' };
      }

      // Record the event
      await tx.webhookEvent.create({
        data: {
          id: eventId,
          type: 'RESET_QUOTA',
        }
      });

      // Reset the quota (leadsReceived = 0)
      await tx.provider.updateMany({
        data: {
          leadsReceived: 0
        }
      });

      return { status: 'processed' };
    });

    if (result.status === 'processed') {
      // Emit event so the dashboard can reflect the reset immediately
      eventEmitter.emit('new_lead_assignment'); // Reusing same event name to trigger refresh
    }

    return NextResponse.json({ success: true, status: result.status });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
