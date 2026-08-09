import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { query, variables } = await req.json();

    const hasuraUrl = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL;
    const adminSecret = process.env.HASURA_ADMIN_SECRET;

    if (!hasuraUrl) {
      return NextResponse.json({ errors: [{ message: 'Hasura URL not configured' }] }, { status: 500 });
    }

    // Server-Side Fetch: Admin secret safely attach hoga
    const res = await fetch(hasuraUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hasura-admin-secret': adminSecret || '',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { errors: [{ message: err.message || 'Internal Proxy Error' }] },
      { status: 500 }
    );
  }
}