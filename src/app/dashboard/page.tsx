'use client';

import { useState, useEffect } from 'react';

type Assignment = {
  id: string;
  name: string;
  phoneNumber: string;
  city: string;
  service: string;
  assignedAt: string;
};

type ProviderData = {
  id: string;
  name: string;
  quota: number;
  leadsReceived: number;
  remainingQuota: number;
  assignments: Assignment[];
};

export default function Dashboard() {
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchDashboardData = async () => {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          if (mounted) setProviders(data);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Initial fetch
    void fetchDashboardData();

    // SSE for real-time updates
    const eventSource = new EventSource('/api/sse');
    
    eventSource.onmessage = () => {
      // Whenever we receive an update event, refetch the dashboard data
      void fetchDashboardData();
    };

    eventSource.onerror = (error) => {
      console.error('SSE Error:', error);
      eventSource.close();
      // Optional: attempt reconnect
    };

    return () => {
      mounted = false;
      eventSource.close();
    };
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Provider Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {providers.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">
              <div className="bg-gray-800 text-white p-4">
                <h2 className="text-xl font-bold">{p.name}</h2>
              </div>
              <div className="p-4 flex-1">
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-gray-500">Remaining Quota:</span>
                  <span className={`font-bold px-2 py-1 rounded-full ${p.remainingQuota > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {p.remainingQuota} / {p.quota}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-gray-500">Leads Received:</span>
                  <span className="font-bold text-gray-800">{p.leadsReceived}</span>
                </div>
                
                <h3 className="font-semibold text-gray-700 mb-2 mt-6 border-b pb-2">Assigned Leads ({p.assignments.length})</h3>
                {p.assignments.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">No leads assigned yet.</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {p.assignments.map((a) => (
                      <li key={a.id} className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                        <div className="font-medium text-gray-800">{a.name}</div>
                        <div className="text-blue-600 font-mono text-xs my-1">{a.phoneNumber}</div>
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>{a.city}</span>
                          <span className="font-medium bg-gray-200 px-2 py-0.5 rounded">{a.service}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
