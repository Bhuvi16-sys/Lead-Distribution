import { NextResponse } from 'next/server';
import { getServiceById, createLead } from '@/services/leadService';
import { processLeadAssignment } from '@/lib/leadAllocation';

export const submitLead = async (req: Request) => {
  try {
    const { name, phoneNumber, city, description, serviceId } = await req.json();

    if (!name || !phoneNumber || !city || !serviceId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const service = await getServiceById(serviceId);
    if (!service) {
      return NextResponse.json({ error: 'Invalid service' }, { status: 400 });
    }

    let lead;
    try {
      lead = await createLead({ name, phoneNumber, city, description, serviceId });
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as {code: string}).code === 'P2002') {
        return NextResponse.json(
          { error: 'This phone number has already submitted a lead for this service.' },
          { status: 409 }
        );
      }
      throw e;
    }

    try {
      await processLeadAssignment(lead.id, serviceId, service.name);
    } catch (allocError) {
      console.error('Error during lead allocation:', allocError);
    }

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.error('Error creating lead:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
};
