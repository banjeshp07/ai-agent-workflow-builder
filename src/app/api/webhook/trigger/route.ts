import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workflow_id = body.workflow_id || '00000000-0000-0000-0000-000000000000';

    const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL;
    const adminSecret = process.env.HASURA_ADMIN_SECRET;

    if (!hasuraUrl) {
      return NextResponse.json({ error: 'Hasura GraphQL URL missing' }, { status: 500 });
    }

    // External Webhook request triggering triggerWorkflowRun Action
    const response = await fetch(hasuraUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret || '',
      },
      body: JSON.stringify({
        query: `
          mutation WebhookTrigger($workflow_id: String!) {
            triggerWorkflowRun(workflow_id: $workflow_id) {
              run_id
              status
            }
          }
        `,
        variables: { workflow_id },
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      message: 'Workflow triggered via external webhook',
      trigger_type: 'WEBHOOK',
      result: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}