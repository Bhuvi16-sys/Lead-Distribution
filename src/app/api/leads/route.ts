import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processLeadAssignment } from '@/lib/leadAllocation';

export async function POST(req: Request) {
  try {
    const { name, phoneNumber, city, description, serviceId } = await req.json();

    if (!name || !phoneNumber || !city || !serviceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    // 1. Create the lead
    // Due to the composite unique constraint @@unique([phoneNumber, serviceId]),
    // this will throw a PrismaClientKnownRequestError with code P2002 if it's a duplicate.
    let lead;
    try {
      lead = await prisma.lead.create({
        data: {
          name,
          phoneNumber,
          city,
          description,
          serviceId,
        },
      });
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as {code: string}).code === 'P2002') {
        return NextResponse.json(
          { error: 'This phone number has already submitted a lead for this service.' },
          { status: 409 }
        );
      }
      throw e;
    }

    // 2. Automatically assign providers based on rules
    try {
      await processLeadAssignment(lead.id, serviceId, service.name);
    } catch (allocError) {
      console.error('Error during lead allocation:', allocError);
      // We still return success for the lead creation, but log the allocation error.
      // In a real robust system, we might queue this for retry.
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
