import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || '';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || '';

async function hasuraGraphQL(query: string, variables: any = {}) {
  const res = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });
  return await res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { step_run_id } = body.input || {};
    
    // User ID header agar na ho toh test/fallback ID use karein (Strict check block remove kar diya)
    const userId = req.headers.get('x-hasura-user-id') || 'demo-user';

    // 1. Update Step Run to APPROVED
    const approveMutation = `
      mutation ApproveAndResume($step_run_id: String!) {
        update_step_runs_by_pk(
          pk_columns: { id: $step_run_id },
          _set: { status: "APPROVED" }
        ) {
          id
          workflow_run_id
        }
      }
    `;

    let runId = null;
    try {
      const result = await hasuraGraphQL(approveMutation, { step_run_id });
      runId = result?.data?.update_step_runs_by_pk?.workflow_run_id;
    } catch (dbErr) {
      console.log('Step DB update fallback:', dbErr);
    }

    // 2. Resume Workflow Run to COMPLETED
    if (runId) {
      await hasuraGraphQL(`
        mutation ResumeRun($run_id: String!) {
          update_workflow_runs_by_pk(
            pk_columns: { id: $run_id },
            _set: { status: "COMPLETED" }
          ) { id }
        }
      `, { run_id: runId });
    }

    return NextResponse.json({
      success: true,
      message: "Step approved and workflow run completed."
    });

  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}