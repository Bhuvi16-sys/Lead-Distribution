import { NextResponse } from 'next/server';
import { getDashboardData } from '@/services/dashboardService';

export const getDashboard = async () => {
  try {
    const data = await getDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
