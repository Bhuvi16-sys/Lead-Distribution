'use client';

import { useState, useEffect } from 'react';

export default function TestTools() {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState<{id: string, name: string}[]>([]);

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
  };

  useEffect(() => {
    fetch('/api/services')
      .then(res => res.json())
      .then(data => setServices(data))
      .catch(err => addLog(`Failed to load services: ${err instanceof Error ? err.message : String(err)}`));
  }, []);



  const handleResetQuota = async () => {
    setLoading(true);
    const eventId = `reset-${Date.now()}`;
    addLog(`Sending webhook with eventId: ${eventId}`);
    
    try {
      const res = await fetch('/api/webhook/reset-quota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, timestamp: new Date().toISOString() })
      });
      const data = await res.json();
      addLog(`Response: ${JSON.stringify(data)}`);
    } catch (err: unknown) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleIdempotencyTest = async () => {
    setLoading(true);
    const eventId = `idempotent-test-${Date.now()}`;
    addLog(`Testing Idempotency with eventId: ${eventId}`);
    
    const sendRequest = () => fetch('/api/webhook/reset-quota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, timestamp: new Date().toISOString() })
    }).then(res => res.json());

    try {
      // Fire 3 identical webhook requests concurrently
      addLog(`Firing 3 identical webhook requests simultaneously...`);
      const results = await Promise.all([sendRequest(), sendRequest(), sendRequest()]);
      
      results.forEach((res, i) => {
        addLog(`Request ${i + 1} Result: ${res.status || res.error || 'unknown'}`);
      });
      
      const processedCount = results.filter(r => r.status === 'processed').length;
      const alreadyProcessedCount = results.filter(r => r.status === 'already_processed').length;
      
      if (processedCount === 1 && alreadyProcessedCount === 2) {
        addLog(`✅ Idempotency Test Passed! Only 1 request was processed.`);
      } else {
        addLog(`❌ Idempotency Test Failed! Processed: ${processedCount}, Already Processed: ${alreadyProcessedCount}`);
      }
    } catch (err: unknown) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateConcurrentLeads = async () => {
    if (services.length === 0) {
      addLog('Cannot generate leads: Services not loaded yet.');
      return;
    }

    setLoading(true);
    addLog(`Generating 10 concurrent leads...`);

    const requests = Array.from({ length: 10 }).map((_, i) => {
      // Generate a unique phone number for each to bypass the DB unique constraint, 
      // allowing us to purely test the allocation concurrency logic.
      const uniquePhone = `555${Date.now().toString().slice(-4)}${i.toString().padStart(3, '0')}`;
      // Randomly pick a service
      const serviceId = services[i % services.length].id;
      
      return fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Concurrent Lead ${i}`,
          phoneNumber: uniquePhone,
          city: 'Test City',
          serviceId,
          description: 'Testing concurrency'
        })
      }).then(res => res.json());
    });

    try {
      const results = await Promise.all(requests);
      let successCount = 0;
      let errorCount = 0;

      results.forEach((res) => {
        if (res.success) successCount++;
        else errorCount++;
      });

      addLog(`✅ Concurrency Test Complete. Success: ${successCount}, Errors: ${errorCount}`);
      if (errorCount > 0) {
        addLog(`Sample error: ${JSON.stringify(results.find(r => !r.success))}`);
      }
    } catch (err: unknown) {
      addLog(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-md flex flex-col gap-4 h-fit">
        <h1 className="text-2xl font-bold mb-4">Testing Panel</h1>
        
        <button 
          onClick={handleResetQuota}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          Reset Quota (Webhook)
        </button>

        <button 
          onClick={handleIdempotencyTest}
          disabled={loading}
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          Test Idempotency (3x Concurrent)
        </button>

        <button 
          onClick={handleGenerateConcurrentLeads}
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded transition-colors disabled:opacity-50"
        >
          Generate 10 Leads Instantly
        </button>
      </div>

      <div className="w-full md:w-2/3 bg-gray-900 text-green-400 p-4 rounded-xl shadow-md h-[80vh] flex flex-col">
        <div className="flex justify-between items-center border-b border-gray-700 pb-2 mb-2">
          <h2 className="font-mono text-sm uppercase font-bold text-gray-400">Terminal Output</h2>
          <button onClick={() => setLogs([])} className="text-xs text-gray-400 hover:text-white">Clear</button>
        </div>
        <div className="flex-1 overflow-y-auto font-mono text-sm flex flex-col gap-1">
          {logs.length === 0 ? (
            <span className="text-gray-600 italic">No logs yet. Click a button to test.</span>
          ) : (
            logs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
