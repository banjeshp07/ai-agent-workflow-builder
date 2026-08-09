import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // 1. Optional Admin Secret Verification (Security Check)
    const adminSecretHeader = req.headers.get('x-hasura-admin-secret');
    const expectedSecret = process.env.HASURA_ADMIN_SECRET;

    if (expectedSecret && adminSecretHeader !== expectedSecret) {
      return NextResponse.json(
        { message: 'Unauthorized request to workflow action' },
        { status: 401 }
      );
    }

    // 2. Hasura Action Payload Parse Karo
    const body = await req.json();
    const { workflow_id } = body.input || {};

    console.log(`[Workflow Trigger] Executing run for workflow: ${workflow_id}`);

    // 3. Status PAUSED/RUNNING Return karo (Hasura Action schema ke according)
    const runId = `run-${Date.now()}`;

    return NextResponse.json({
      run_id: runId,
      status: 'PAUSED',
    });
  } catch (error: any) {
    console.error('[Workflow Trigger Error]:', error);
    return NextResponse.json(
      { message: error.message || 'Internal server error while executing workflow' },
      { status: 500 }
    );
  }
}