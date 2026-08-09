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
    const workflow_id = body.input?.workflow_id || body.workflow_id || '11111111-1111-1111-1111-111111111111';

    // 1. Fetch Workflow & Org Details
    const wfQuery = `
      query GetWf($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          org_id
          organization {
            quota_allowed
            quota_used
          }
          workflow_steps(order_by: { position: asc }) {
            id
            step_type
            config
            position
          }
        }
      }
    `;
    const wfResult = await queryHasura(wfQuery, { id: workflow_id });
    
    if (wfResult?.errors) {
      return NextResponse.json({ 
        run_id: 'ERR_QUERY', 
        status: JSON.stringify(wfResult.errors).substring(0, 100)
      }, { status: 200 });
    }

    const wf = wfResult?.data?.workflows_by_pk;
    if (!wf) {
      return NextResponse.json({ 
        run_id: 'ERR_NOT_FOUND', 
        status: 'WF_NOT_FOUND_IN_DB'
      }, { status: 200 });
    }

    // 2. Create Workflow Run (RUNNING)
    const createRunMutation = `
      mutation CreateRun($wf_id: uuid!) {
        insert_workflow_runs_one(object: { workflow_id: $wf_id, status: "RUNNING" }) {
          id
        }
      }
    `;
    const runRes = await queryHasura(createRunMutation, { wf_id: workflow_id });
    
    // DB Insert error ko seedhe status field mein bhej rahe hain
    if (runRes?.errors || !runRes?.data?.insert_workflow_runs_one?.id) {
      const errText = JSON.stringify(runRes?.errors || runRes);
      console.error("DB Insert Failed:", errText);
      return NextResponse.json({ 
        run_id: 'ERR_DB_INSERT', 
        status: errText.substring(0, 200) // Hasura limits string size, keeping it safe
      }, { status: 200 });
    }

    const runId = runRes.data.insert_workflow_runs_one.id;

    // 3. Step Execution Loop
    let paused = false;
    const steps = wf.workflow_steps || [];
    
    for (const step of steps) {
      if (paused) break;

      let output: any = {};
      let stepStatus = 'COMPLETED';

      if (step.step_type === 'llm_call') {
        output = { result: 'Agent analyzed data successfully.' };
      } else if (step.step_type === 'approval_gate') {
        stepStatus = 'PENDING';
        paused = true;
      }

      await queryHasura(`
        mutation CreateStepRun($run_id: uuid!, $step_id: uuid!, $status: String!, $output: jsonb) {
          insert_step_runs_one(object: {
            workflow_run_id: $run_id,
            step_id: $step_id,
            status: $status,
            output: $output
          }) { id }
        }
      `, { run_id: runId, step_id: step.id, status: stepStatus, output });
    }

    // 4. Update Final Run Status
    const finalStatus = paused ? 'PAUSED' : 'COMPLETED';
    await queryHasura(`
      mutation UpdateRun($id: uuid!, $status: String!) {
        update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: $status }) { id }
      }
    `, { id: runId, status: finalStatus });

    // 5. Increment Quota
    if (!paused && wf.org_id) {
      await queryHasura(`
        mutation IncQuota($org_id: uuid!) {
          update_organizations_by_pk(pk_columns: { id: $org_id }, _inc: { quota_used: 1 }) { id }
        }
      `, { org_id: wf.org_id });
    }

    return NextResponse.json({
      run_id: String(runId),
      status: finalStatus
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ 
      run_id: 'ERR_EXCEPTION',
      status: error.message ? error.message.substring(0, 100) : 'SERVER_ERROR'
    }, { status: 200 });
  }
}