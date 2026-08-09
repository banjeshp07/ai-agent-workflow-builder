import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    // Seeded Workflow ID matching your Nhost DB
    const workflow_id = body.workflow_id || '11111111-1111-1111-1111-111111111111';

    const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL;
    const adminSecret = process.env.HASURA_ADMIN_SECRET;

    if (!hasuraUrl) {
      return NextResponse.json({ error: 'Hasura GraphQL URL missing in environment variables' }, { status: 500 });
    }

    // External Webhook request triggering triggerWorkflowRun Action via Hasura
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
      message: 'Workflow triggered successfully via external webhook',
      trigger_type: 'WEBHOOK',
      result: data,
    }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Webhook trigger failed' }, { status: 500 });
  }
}

// Browser Testing / Healthcheck
export async function GET() {
  return NextResponse.json({
    status: 'Webhook endpoint active',
    usage: 'Send a POST request to this endpoint to trigger workflow execution via Webhook.',
  });
}