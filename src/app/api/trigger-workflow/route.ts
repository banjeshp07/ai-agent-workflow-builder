import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[Workflow Action Received]:', JSON.stringify(body));

    // Hasura Action schema ke exact fields return karo
    return NextResponse.json({
      run_id: `run-${Date.now()}`,
      status: 'PAUSED',
    });
  } catch (error: any) {
    console.error('[Workflow Route Error]:', error);
    return NextResponse.json(
      { message: error.message || 'Internal error' },
      { status: 500 }
    );
  }
}