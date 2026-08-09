'use client';

import React, { useState } from 'react';

interface WorkflowRunnerProps {
  workflowId: string;
  hasuraUrl?: string;
  accessToken?: string;
}

export default function WorkflowRunner({
  workflowId,
  hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || '',
  accessToken,
}: WorkflowRunnerProps) {
  const [loading, setLoading] = useState(false);
  const [currentRun, setCurrentRun] = useState<{ id: string; status: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const executeGraphQL = async (query: string, variables: any) => {
    // Hasura ko direct hit karne ke bajaye Next.js proxy route use karein
    const res = await fetch('/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(json.errors[0]?.message || 'GraphQL Execution Error');
    }

    return json.data;
  };

  const handleTriggerWorkflow = async () => {
    setLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation TriggerRun($workflow_id: String!) {
          triggerWorkflowRun(workflow_id: $workflow_id) {
            run_id
            status
          }
        }
      `;

      const data = await executeGraphQL(mutation, { workflow_id: workflowId });

      if (!data || !data.triggerWorkflowRun) {
        throw new Error('Hasura Action returned empty response. Check Hasura permissions or Admin Secret.');
      }

      const runResult = data.triggerWorkflowRun;
      setCurrentRun({
        id: runResult.run_id,
        status: runResult.status,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to trigger workflow');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveStep = async () => {
    setLoading(true);
    setError(null);

    try {
      const mutation = `
        mutation ApproveStep($step_run_id: String!) {
          approveStep(step_run_id: $step_run_id) {
            success
            message
          }
        }
      `;

      await executeGraphQL(mutation, { step_run_id: 'demo-step-run-id' });

      if (currentRun) {
        setCurrentRun({
          ...currentRun,
          status: 'COMPLETED',
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to approve step');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#111' }}>
      <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Workflow Execution Control</h2>

      {error && (
        <div style={{ color: '#ff4d4f', marginBottom: '12px', padding: '10px', backgroundColor: '#2a1215', borderRadius: '4px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <button
        onClick={handleTriggerWorkflow}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Processing...' : 'Trigger Workflow'}
      </button>

      {currentRun && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#1a1a1a', borderRadius: '6px' }}>
          <p>Run ID: <strong>{currentRun.id}</strong></p>
          <p>
            Status:{' '}
            <strong
              style={{
                color:
                  currentRun.status === 'COMPLETED'
                    ? '#52c41a'
                    : currentRun.status === 'PAUSED'
                    ? '#faad14'
                    : '#1890ff',
              }}
            >
              {currentRun.status}
            </strong>
          </p>

          {currentRun.status === 'PAUSED' && (
            <div style={{ marginTop: '12px' }}>
              <p style={{ color: '#faad14', marginBottom: '8px' }}>⚠️ Workflow is paused waiting for approval.</p>
              <button
                onClick={handleApproveStep}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#52c41a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Approve Step & Resume
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}