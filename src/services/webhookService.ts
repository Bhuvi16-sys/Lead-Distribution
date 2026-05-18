import { prisma } from '@/lib/prisma';
import { eventEmitter } from '@/lib/events';

export const processResetQuota = async (eventId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const existingEvent = await tx.webhookEvent.findUnique({
      where: { id: eventId }
    });

    if (existingEvent) {
      return { status: 'already_processed' };
    }

    await tx.webhookEvent.create({
      data: {
        id: eventId,
        type: 'RESET_QUOTA',
      }
    });

    await tx.provider.updateMany({
      data: {
        leadsReceived: 0
      }
    });

    return { status: 'processed' };
  });

  if (result.status === 'processed') {
    eventEmitter.emit('new_lead_assignment');
  }

  return result;
};
