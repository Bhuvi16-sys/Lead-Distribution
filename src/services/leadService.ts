import { prisma } from '@/lib/prisma';

export const getServiceById = async (id: string) => {
  return await prisma.service.findUnique({ where: { id } });
};

export const createLead = async (data: { name: string, phoneNumber: string, city: string, description: string, serviceId: string }) => {
  return await prisma.lead.create({
    data,
  });
};
