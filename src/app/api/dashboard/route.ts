import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: {
        assignedLeads: {
          include: {
            lead: {
              include: {
                service: true,
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    const data = providers.map(p => ({
      id: p.id,
      name: p.name,
      quota: p.quota,
      leadsReceived: p.leadsReceived,
      remainingQuota: p.quota - p.leadsReceived,
      assignments: p.assignedLeads.map(al => ({
        id: al.lead.id,
        name: al.lead.name,
        phoneNumber: al.lead.phoneNumber,
        city: al.lead.city,
        service: al.lead.service.name,
        assignedAt: al.assignedAt,
      }))
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
