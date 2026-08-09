'use client';

import WorkflowRunner from '@/components/WorkflowRunner';

export default function Home() {
  return (
    <main style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>AI Agent Workflow Builder</h1>
      <WorkflowRunner workflowId="123e4567-e89b-12d3-a456-426614174000" />
    </main>
  );
}