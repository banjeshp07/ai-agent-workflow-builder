import { NextRequest, NextResponse } from 'next/server';

const HASURA_ENDPOINT = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL || '';
const ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET || process.env.NHOST_ADMIN_SECRET || process.env.HASURA_GRAPHQL_ADMIN_SECRET || '';

async function queryHasura(query: string, variables: any = {}) {
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
    const { step_run_id } = body.input || body;
    const userId = req.headers.get('x-hasura-user-id') || 'user-owner-a';

    // Layer 2 Role Check (Owner or Editor required)
    const memberCheck = await queryHasura(`
      query CheckRole($user_id: String!) {
        org_members(where: { user_id: { _eq: $user_id } }) {
          role
          org_id
        }
      }
    `, { user_id: userId });

    const role = memberCheck?.data?.org_members?.[0]?.role;
    if (role === 'viewer') {
      return NextResponse.json({ message: 'Unauthorized: Viewer cannot approve steps' }, { status: 403 });
    }

    // 1. Approve Step Run
    const approveMut = `
      mutation ApproveStep($id: uuid!, $user: String!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id },
          _set: { status: "APPROVED", approved_by: $user }
        ) {
          id
          workflow_run_id
        }
      }
    `;
    const approveRes = await queryHasura(approveMut, { id: step_run_id, user: userId });
    const runId = approveRes?.data?.update_step_runs_by_pk?.workflow_run_id;

    // 2. Set Workflow Run to COMPLETED
    if (runId) {
      await queryHasura(`
        mutation ResumeRun($id: uuid!) {
          update_workflow_runs_by_pk(pk_columns: { id: $id }, _set: { status: "COMPLETED" }) { id }
        }
      `, { id: runId });
    }

    return NextResponse.json({
      success: true,
      message: 'Step approved and workflow resumed to COMPLETED'
    });

  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}