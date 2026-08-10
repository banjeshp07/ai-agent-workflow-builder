"use client";

import React, { useState } from "react";

interface WorkflowStep {
  id: string;
  type: "llm_call" | "http_request" | "db_write" | "notify" | "conditional_branch" | "approval_gate";
  config: string;
}

export default function AdvancedWorkflowBuilder() {
  const [role, setRole] = useState<"owner" | "editor" | "viewer">("owner");
  const [orgName, setOrgName] = useState("TechCorp (Org A)");
  const [quotaUsed, setQuotaUsed] = useState(4);
  const quotaLimit = 10;

  // Workflow Builder State
  const [workflowName, setWorkflowName] = useState("Automated Customer Support Flow");
  const [triggerType, setTriggerType] = useState<"manual" | "webhook" | "scheduled" | "database_event">("manual");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "1", type: "llm_call", config: "Prompt: Analyze support ticket sentiment" },
    { id: "2", type: "http_request", config: "POST https://api.shipping.com/verify" },
    { id: "3", type: "approval_gate", config: "Manager Approval for Refund > 5000" },
  ]);

  // Execution State
  const [runId, setRunId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] = useState<string>("IDLE");
  const [loading, setLoading] = useState(false);

  const addStep = (type: WorkflowStep["type"]) => {
    if (role === "viewer") return;
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type,
      config: `Default config for ${type}`,
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (index: number) => {
    if (role === "viewer") return;
    const updated = steps.filter((_, i) => i !== index);
    setSteps(updated);
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    if (role === "viewer") return;
    if ((direction === "up" && index === 0) || (direction === "down" && index === steps.length - 1)) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...steps];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSteps(updated);
  };

  const triggerWorkflowRun = async () => {
    if (role === "viewer") {
      alert("Viewers cannot trigger workflows!");
      return;
    }
    setLoading(true);
    setExecutionStatus("RUNNING");

    try {
      const res = await fetch("/api/trigger-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflow_name: workflowName, trigger_type: triggerType, steps }),
      });
      const data = await res.json();
      if (data.run_id) {
        setRunId(data.run_id);
        setExecutionStatus(data.status || "PAUSED");
        setQuotaUsed((prev) => Math.min(prev + 1, quotaLimit));
      } else {
        setExecutionStatus("COMPLETED");
        setRunId("mock-run-" + Date.now());
      }
    } catch (err) {
      console.error(err);
      setExecutionStatus("FAILED");
    } finally {
      setLoading(false);
    }
  };

  const approveStepAction = async () => {
    if (role === "viewer") {
      alert("Viewers cannot approve workflow gates!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/approve-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId }),
      });
      const data = await res.json();
      if (res.ok) {
        setExecutionStatus("COMPLETED");
        alert(data.message || "Approval Gate cleared successfully!");
      } else {
        alert(data.message || "Approval failed due to insufficient permissions");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", padding: "30px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        
        {/* Header & Org Context Switcher */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", borderBottom: "1px solid #1f2937", paddingBottom: "15px" }}>
          <div>
            <h1 style={{ fontSize: "24px", color: "#60a5fa", margin: 0 }}>AI Agent Workflow Builder</h1>
            <p style={{ fontSize: "13px", color: "#9ca3af", margin: "4px 0 0 0" }}>Nhost + Hasura + Next.js Engine</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button 
              onClick={() => { setRole("owner"); setOrgName("TechCorp (Org A)"); }}
              style={{ padding: "6px 12px", background: role === "owner" ? "#2563eb" : "#1f2937", color: "#fff", border: "1px solid #374151", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
              Org A (Owner)
            </button>
            <button 
              onClick={() => { setRole("editor"); setOrgName("TechCorp (Org A)"); }}
              style={{ padding: "6px 12px", background: role === "editor" ? "#2563eb" : "#1f2937", color: "#fff", border: "1px solid #374151", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
              Org A (Editor)
            </button>
            <button 
              onClick={() => { setRole("viewer"); setOrgName("RetailCo (Org B)"); }}
              style={{ padding: "6px 12px", background: role === "viewer" ? "#dc2626" : "#1f2937", color: "#fff", border: "1px solid #374151", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
              Org B (Viewer)
            </button>
          </div>
        </div>

        {/* Top Status Bar */}
        <div style={{ backgroundColor: "#111827", padding: "15px 20px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", border: "1px solid #374151" }}>
          <div>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Active Context:</span>
            <div style={{ fontSize: "16px", fontWeight: "bold" }}>
              {orgName} <span style={{ fontSize: "11px", padding: "2px 6px", background: role === "viewer" ? "#7f1d1d" : "#1e3a8a", borderRadius: "4px", marginLeft: "6px" }}>{role.toUpperCase()}</span>
            </div>
          </div>
          <div>
            <span style={{ fontSize: "12px", color: "#9ca3af" }}>Monthly Quota Usage:</span>
            <div style={{ fontSize: "16px", fontWeight: "bold", textAlign: "right" }}>
              {quotaUsed} / {quotaLimit} calls
            </div>
          </div>
        </div>

        {/* Workflow Setup & Builder Section */}
        <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "8px", border: "1px solid #374151", marginBottom: "20px" }}>
          <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "15px" }}>Workflow Configuration</h2>
          
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "15px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "5px" }}>Workflow Name</label>
              <input 
                type="text" 
                value={workflowName} 
                onChange={(e) => setWorkflowName(e.target.value)}
                disabled={role === "viewer"}
                style={{ width: "100%", padding: "10px", background: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", color: "#9ca3af", marginBottom: "5px" }}>Trigger Type</label>
              <select 
                value={triggerType} 
                onChange={(e: any) => setTriggerType(e.target.value)}
                disabled={role === "viewer"}
                style={{ width: "100%", padding: "10px", background: "#1f2937", border: "1px solid #374151", color: "#fff", borderRadius: "6px" }}>
                <option value="manual">Manual Button Click</option>
                <option value="webhook">Inbound Webhook</option>
                <option value="scheduled">Cron / Scheduled</option>
                <option value="database_event">Database Event Trigger</option>
              </select>
            </div>
          </div>

          <h3 style={{ fontSize: "14px", color: "#60a5fa", marginBottom: "10px" }}>Chained Steps (Add & Reorder)</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "15px" }}>
            {steps.map((step, idx) => (
              <div key={step.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1f2937", padding: "12px", borderRadius: "6px", border: "1px solid #374151" }}>
                <div>
                  <span style={{ color: "#9ca3af", marginRight: "10px", fontSize: "12px" }}>#{idx + 1}</span>
                  <strong style={{ color: "#f3f4f6" }}>{step.type}</strong>
                  <span style={{ fontSize: "12px", color: "#9ca3af", marginLeft: "10px" }}>({step.config})</span>
                </div>
                {role !== "viewer" && (
                  <div style={{ display: "flex", gap: "5px" }}>
                    <button onClick={() => moveStep(idx, "up")} style={{ background: "#374151", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>↑</button>
                    <button onClick={() => moveStep(idx, "down")} style={{ background: "#374151", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>↓</button>
                    <button onClick={() => removeStep(idx)} style={{ background: "#dc2626", color: "#fff", border: "none", padding: "4px 8px", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Step Buttons */}
          {role !== "viewer" && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button onClick={() => addStep("llm_call")} style={{ background: "#374151", color: "#60a5fa", border: "1px solid #4b5563", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Add llm_call</button>
              <button onClick={() => addStep("http_request")} style={{ background: "#374151", color: "#60a5fa", border: "1px solid #4b5563", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Add http_request</button>
              <button onClick={() => addStep("db_write")} style={{ background: "#374151", color: "#60a5fa", border: "1px solid #4b5563", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Add db_write</button>
              <button onClick={() => addStep("notify")} style={{ background: "#374151", color: "#60a5fa", border: "1px solid #4b5563", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Add notify</button>
              <button onClick={() => addStep("approval_gate")} style={{ background: "#374151", color: "#fbbf24", border: "1px solid #4b5563", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>+ Add approval_gate</button>
            </div>
          )}
        </div>

        {/* Execution & Run Controls */}
        <div style={{ backgroundColor: "#111827", padding: "20px", borderRadius: "8px", border: "1px solid #374151" }}>
          <h2 style={{ fontSize: "18px", marginTop: 0, marginBottom: "15px" }}>Live Run & Subscription Simulation</h2>

          {role === "viewer" && (
            <div style={{ background: "rgba(220, 38, 38, 0.2)", border: "1px solid #dc2626", color: "#f87171", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px" }}>
              🔒 Cross-org isolation active: Viewers cannot run workflows or approve gates for Org A.
            </div>
          )}

          <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
            <button 
              onClick={triggerWorkflowRun} 
              disabled={role === "viewer" || loading}
              style={{ flex: 1, padding: "12px", background: role === "viewer" ? "#374151" : "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: role === "viewer" ? "not-allowed" : "pointer" }}>
              {loading ? "Executing..." : "Run Workflow"}
            </button>
            <button 
              onClick={approveStepAction} 
              disabled={role === "viewer" || loading}
              style={{ padding: "12px 20px", background: role === "viewer" ? "#374151" : "#059669", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: role === "viewer" ? "not-allowed" : "pointer" }}>
              Approve Gate
            </button>
          </div>

          {runId && (
            <div style={{ background: "#1f2937", padding: "15px", borderRadius: "6px", border: "1px solid #374151", fontSize: "13px" }}>
              <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Run ID: <span style={{ color: "#e5e7eb" }}>{runId}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "6px" }}>
                <span>Live Status (Subscription Stream):</span>
                <span style={{ fontWeight: "bold", color: executionStatus === "COMPLETED" ? "#34d399" : "#fbbf24" }}>
                  {executionStatus}
                </span>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}