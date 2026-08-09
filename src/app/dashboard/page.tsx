'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch Workflow Runs from Hasura via GraphQL
  const fetchRuns = async () => {
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || '', {
        method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': process.env.NEXT_PUBLIC_HASURA_GRAPHQL_ADMIN_SECRET || '', // Or public read role if configured
      },
      body: JSON.stringify({
        query: `
          query GetRuns {
            workflow_runs(order_by: { created_at: desc }) {
              id
              status
              workflow {
                name
              }
              created_at
            }
          }
        `
      })
    });
    const data = await res.json();
    setRuns(data?.data?.workflow_runs || []);
    } catch (err) {
      console.error('Error fetching runs:', err);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  // Handle Resume / Approve Action
  const handleResume = async (runId: string, action: 'APPROVE' | 'REJECT') => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/workflow/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: runId, action }),
      });
      const data = await res.json();
      setMessage(`Run ${runId} status: ${data.status} - ${data.message || ''}`);
      fetchRuns(); // Refresh list
    } catch (err: any) {
      setMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">AI Agent Workflow Dashboard</h1>
      
      {message && (
        <div className="mb-4 p-4 bg-blue-800 text-white rounded-md">
          {message}
        </div>
      )}

      <div className="bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700 text-gray-300 uppercase text-sm">
              <th className="p-4">Run ID</th>
              <th className="p-4">Workflow Name</th>
              <th className="p-4">Status</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-400">No workflow runs found. Trigger a webhook to see runs.</td>
              </tr>
            ) : (
              runs.map((run) => (
                <tr key={run.id} className="border-t border-gray-700 hover:bg-gray-750">
                  <td className="p-4 font-mono text-sm text-gray-300">{run.id}</td>
                  <td className="p-4">{run.workflow?.name || 'Unnamed Workflow'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      run.status === 'COMPLETED' ? 'bg-green-600 text-white' :
                      run.status === 'PAUSED' ? 'bg-yellow-600 text-white' :
                      run.status === 'FAILED' ? 'bg-red-600 text-white' : 'bg-gray-600 text-white'
                    }`}>
                      {run.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    {run.status === 'PAUSED' && (
                      <>
                        <button
                          disabled={loading}
                          onClick={() => handleResume(run.id, 'APPROVE')}
                          className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition"
                        >
                          Approve
                        </button>
                        <button
                          disabled={loading}
                          onClick={() => handleResume(run.id, 'REJECT')}
                          className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-medium transition"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}