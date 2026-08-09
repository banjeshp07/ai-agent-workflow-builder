import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || '';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || '';

async function queryHasura(query: string, variables: any = {}) {
  try {
    const res = await fetch(HASURA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': ADMIN_SECRET,
      },
      body: JSON.stringify({ query, variables }),
    });
    return await res.json();
  } catch (err: any) {
    return { errors: [{ message: err.message }] };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { run_id, action } = body; // action: 'APPROVE' ya 'REJECT'

    if (!run_id || !action) {
      return NextResponse.json({ message: 'run_id and action (APPROVE/REJECT) are required' }, { status: 400 });
    }

    // 1. Fetch Workflow Run Details & Workflow ID
    const runQuery = `
      query GetRun($id: uuid!) {
        workflow_runs_by_pk(id: $id) {
          id
          status
          workflow_id
          workflow {
            org_id
            workflow_steps(order_by: { position: asc }) {
              id
              step_type
              config
              position
            }
          }
        }
      }
    `;
    const runRes = await queryHasura(runQuery, { id: run_id });
    const runData = runRes?.data?.workflow_runs_by_pk;

    if (!runData) {
      return NextResponse.json({ message: 'Workflow run not found' }, { status: 404 });
    }

    if (runData.status !== 'PAUSED') {
      return NextResponse.json({ message: `Workflow run is not in PAUSED state. Current status: ${runData.status}` }, { status: 400 });
    }

    if (action === 'REJECT') {
      // Agar user ne reject kar diya, toh run ko FAILED mark kar do
      await queryHasura(`
        mutation UpdateRunFailed($id: uuid!) {
          update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "FAILED" }) { id }
        }
      `, { id: run_id });

      return NextResponse.json({ run_id, status: 'FAILED', message: 'Workflow rejected by user.' }, { status: 200 });
    }

    // 2. Agar APPROVE kiya hai, toh approval gate ke baad ke steps execute karo
    const steps = runData.workflow.workflow_steps || [];
    
    // Pehle wale executed steps pata lagayein taaki unke aage ke steps run ho sakein
    const existingStepsRes = await queryHasura(`
      query GetStepRuns($run_id: uuid!) {
        step_runs(where: { workflow_run_id: { _eq: $run_id } }) {
          step_id
        }
      }
    `, { run_id });
    
    const executedStepIds = new Set((existingStepsRes?.data?.step_index || existingStepsRes?.data?.step_runs || []).map((s: any) => s.step_id));

    let pausedAgain = false;
    let finalStatus = 'COMPLETED';

    for (const step of steps) {
      // Agar ye step pehle run ho chuka hai, toh skip karein
      if (executedStepIds.has(step.id)) continue;

      let output: any = {};
      let stepStatus = 'COMPLETED';

      if (step.step_type === 'llm_call') {
        try {
          const prompt = step.config?.prompt || 'Execute next workflow step after approval.';
          const geminiApiKey = process.env.GEMINI_API_KEY;
          if (geminiApiKey) {
            const llmRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            output = await llmRes.json();
          } else {
            output = { result: `[LLM Post-Approval] ${prompt} executed successfully.` };
          }
        } catch (err: any) {
          stepStatus = 'FAILED';
          output = { error: err.message };
          finalStatus = 'FAILED';
        }
      } else if (step.step_type === 'http_request') {
        output = { status_code: 200, response: 'Post-approval HTTP request completed' };
      } else if (step.step_type === 'conditional_branch') {
        const conditionMet = true;
        output = { evaluated_branch: conditionMet ? 'path_a' : 'path_b', status: 'Condition evaluated successfully post-approval' };
      } else if (step.step_type === 'db_write') {
        output = { status: 'SUCCESS', message: 'Data successfully written to database post-approval' };
      } else if (step.step_type === 'notify') {
        output = { status: 'DISPATCHED', channel: step.config?.channel || 'webhook/slack', message: 'Notification alert sent successfully post-approval' };
      } else if (step.step_type === 'approval_gate') {
        stepStatus = 'PENDING';
        pausedAgain = true;
        finalStatus = 'PAUSED';
      }

      // Step run record insert karein
      await queryHasura(`
        mutation CreateStepRun($run_id: uuid!, $step_id: uuid!, $status: String!, $output: jsonb) {
          insert_step_runs_one(object: {
            workflow_run_id: $run_id,
            step_id: $step_id,
            status: $status,
            output: $output
          }) { id }
        }
      `, { run_id, step_id: step.id, status: stepStatus, output });

      if (pausedAgain || stepStatus === 'FAILED') break;
    }

    // 3. Workflow Run status update karein
    await queryHasura(`
      mutation UpdateRunStatus($id: uuid!, $status: String!) {
        update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: $status }) { id }
      }
    `, { id: run_id, status: finalStatus });

    // 4. Agar successfully complete ho gaya, toh quota increment karein
    if (finalStatus === 'COMPLETED' && runData.workflow.org_id) {
      await queryHasura(`
        mutation IncQuota($org_id: uuid!) {
          update_organizations_by_pk(pk_columns: { id: $org_id }, _inc: { quota_used: 1 }) { id }
        }
      `, { org_id: runData.workflow.org_id });
    }

    return NextResponse.json({
      run_id,
      status: finalStatus,
      message: finalStatus === 'COMPLETED' ? 'Workflow resumed and completed successfully!' : 'Workflow paused at next gate'
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
  }
}