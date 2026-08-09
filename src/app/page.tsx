'use client';

import { useState } from 'react';

export default function App() {
  const [activeOrg, setActiveOrg] = useState<'OrgA' | 'OrgB'>('OrgA');
  const [role, setRole] = useState<'owner' | 'viewer'>('owner');
  const [status, setStatus] = useState<string>('IDLE');
  const [runId, setRunId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [quota, setQuota] = useState<{ used: number; allowed: number }>({ used: 2, allowed: 10 });

  const triggerWorkflow = async () => {
    if (role === 'viewer') {
      alert('Access Denied: Viewers cannot trigger workflow runs.');
      return;
    }

    setLoading(true);
    setStatus('RUNNING');
    try {
      const res = await fetch('/api/trigger-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-user-id': activeOrg === 'OrgA' ? 'user-owner-a' : 'user-viewer-b',
        },
        body: JSON.stringify({ workflow_id: '11111111-1111-1111-1111-111111111111' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setRunId(data.run_id || `run-${Date.now()}`);
      setStatus(data.status || 'PAUSED');
      if (data.status === 'COMPLETED') {
        setQuota((prev) => ({ ...prev, used: prev.used + 1 }));
      }
    } catch (err: any) {
      alert(err.message || 'Error triggering workflow');
      setStatus('FAILED');
    } finally {
      setLoading(false);
    }
  };

  const approveStep = async () => {
    if (role === 'viewer') {
      alert('Access Denied: Viewers cannot approve steps!');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/approve-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-hasura-user-id': 'user-owner-a',
        },
        body: JSON.stringify({ step_run_id: 'step-run-123' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setStatus('COMPLETED');
      setQuota((prev) => ({ ...prev, used: prev.used + 1 }));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8 flex flex-col items-center">
      <h1 className="text-3xl font-bold text-blue-400 mb-6">AI Agent Workflow Builder</h1>

      {/* Org Context Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-8 w-full max-w-2xl flex justify-between items-center">
        <div>
          <span className="text-slate-400 text-sm block">Current Organization Context:</span>
          <span className="font-semibold text-lg">{activeOrg === 'OrgA' ? 'Org A (TechCorp)' : 'Org B (RetailCo)'}</span>
          <span className="text-xs bg-slate-800 text-blue-300 px-2 py-0.5 rounded ml-2 uppercase">{role}</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveOrg('OrgA'); setRole('owner'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${activeOrg === 'OrgA' ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            Switch to Org A (Owner)
          </button>
          <button
            onClick={() => { setActiveOrg('OrgB'); setRole('viewer'); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded ${activeOrg === 'OrgB' ? 'bg-red-600' : 'bg-slate-800'}`}
          >
            Switch to Org B (Viewer)
          </button>
        </div>
      </div>

      {/* Workflow Builder & Execution Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Workflow Execution Control</h2>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Quota Usage:</span>
            <span className="text-sm font-semibold">{quota.used} / {quota.allowed} calls</span>
          </div>
        </div>

        {/* Steps List */}
        <div className="space-y-3 mb-6">
          <div className="p-3 bg-slate-800 rounded flex justify-between items-center border border-slate-700">
            <span>1. LLM Prompt Analysis (llm_call)</span>
            <span className="text-xs text-emerald-400 font-mono">Gemini 1.5 Flash</span>
          </div>
          <div className="p-3 bg-slate-800 rounded flex justify-between items-center border border-slate-700">
            <span>2. External API Request (http_request)</span>
            <span className="text-xs text-emerald-400 font-mono">200 OK</span>
          </div>
          <div className="p-3 bg-slate-800 rounded flex justify-between items-center border border-slate-700">
            <span>3. Manager Approval Gate (approval_gate)</span>
            <span className="text-xs text-amber-400 font-mono">Role Gate</span>
          </div>
        </div>

        {/* Action Buttons */}
        {role !== 'viewer' ? (
          <button
            onClick={triggerWorkflow}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-lg font-semibold transition"
          >
            {loading ? 'Executing Engine...' : 'Trigger Workflow'}
          </button>
        ) : (
          <div className="p-3 bg-red-950/50 border border-red-800 text-red-300 rounded text-center text-sm font-medium">
            🔒 Viewers in Org B cannot trigger or edit workflows.
          </div>
        )}

        {/* Execution Output State */}
        {status !== 'IDLE' && (
          <div className="mt-6 p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-sm text-slate-400">Run ID: <span className="text-slate-200 font-mono">{runId || 'run-1786308540929'}</span></div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm">Execution Status:</span>
              <span className={`font-bold ${status === 'COMPLETED' ? 'text-emerald-400' : status === 'PAUSED' ? 'text-amber-400' : 'text-blue-400'}`}>
                {status}
              </span>
            </div>

            {status === 'PAUSED' && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between items-center">
                <span className="text-sm text-amber-300">Run paused at Approval Gate.</span>
                <button
                  onClick={approveStep}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-xs font-bold"
                >
                  Approve Step & Resume
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}