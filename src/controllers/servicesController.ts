import { NextResponse } from 'next/server';
import { getAllServices } from '@/services/servicesService';

export const getServices = async () => {
  try {
    const services = await getAllServices();
    return NextResponse.json(services);
  } catch {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
