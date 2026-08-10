"use client";

import React, { useState } from "react";

export default function DashboardPage() {
  const [role, setRole] = useState<"owner" | "viewer">("owner");
  const [orgName, setOrgName] = useState("TechCorp (Org A)");
  const [quotaUsed, setQuotaUsed] = useState(4);
  const quotaLimit = 10;
  
  const [runId, setRunId] = useState<string | null>("f1405ed8-1ca8-4a45-8cb5-c4434688c3ce");
  const [executionStatus, setExecutionStatus] = useState("COMPLETED");
  const [stepStatuses, setStepStatuses] = useState({
    llm: "COMPLETED",
    http: "200 OK",
    approval: "APPROVED",
  });
  const [loading, setLoading] = useState(false);

  const switchOrg = (targetRole: "owner" | "viewer", org: string) => {
    setRole(targetRole);
    setOrgName(org);
  };

  const triggerWorkflow = async () => {
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
        body: JSON.stringify({ workflow_id: "sample-workflow-id" })
      });
      const data = await res.json();
      if (data.run_id) {
        setRunId(data.run_id);
        setExecutionStatus(data.status || "COMPLETED");
        setQuotaUsed((prev) => Math.min(prev + 1, quotaLimit));
      }
    } catch (err) {
      console.error(err);
      setExecutionStatus("FAILED");
    } finally {
      setLoading(false);
    }
  };

  const approveWorkflowStep = async () => {
    if (role === "viewer") {
      alert("Viewers cannot approve workflow gates!");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/approve-step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run_id: runId })
      });
      const data = await res.json();
      if (res.ok) {
        setExecutionStatus(data.status || "COMPLETED");
        alert(data.message || "Step approved successfully!");
      } else {
        alert(data.message || "Approval failed");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", padding: "30px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Header */}
        <h1 style={{ textAlign: "center", color: "#60a5fa", marginBottom: "20px" }}>AI Agent Workflow Builder</h1>

        {/* Organization & Role Switcher */}
        <div style={{ backgroundColor: "#1f2937", padding: "15px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px", border: "1px solid #374151" }}>
          <div>
            <span style={{ fontSize: "14px", color: "#9ca3af" }}>Current Organization Context:</span>
            <div style={{ fontSize: "18px", fontWeight: "bold", marginTop: "4px" }}>
              {orgName} <span style={{ fontSize: "12px", padding: "2px 8px", backgroundColor: role === "owner" ? "#1e3a8a" : "#7f1d1d", borderRadius: "4px", color: "#fff" }}>{role.toUpperCase()}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              onClick={() => switchOrg("owner", "TechCorp (Org A)")}
              style={{ padding: "8px 12px", backgroundColor: role === "owner" ? "#2563eb" : "#374151", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Switch to Org A (Owner)
            </button>
            <button 
              onClick={() => switchOrg("viewer", "RetailCo (Org B)")}
              style={{ padding: "8px 12px", backgroundColor: role === "viewer" ? "#dc2626" : "#374151", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
              Switch to Org B (Viewer)
            </button>
          </div>
        </div>

        {/* Main Control Panel */}
        <div style={{ backgroundColor: "#111827", padding: "25px", borderRadius: "10px", border: "1px solid #374151" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "20px", margin: 0 }}>Workflow Execution Control</h2>
            <div style={{ fontSize: "14px", color: "#9ca3af" }}>
              Quota Usage: <strong style={{ color: "#f3f4f6" }}>{quotaUsed} / {quotaLimit} calls</strong>
            </div>
          </div>

          {/* Workflow Steps Preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
            <div style={{ backgroundColor: "#1f2937", padding: "14px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #374151" }}>
              <span>1. LLM Prompt Analysis (<code>llm_call</code>)</span>
              <span style={{ color: "#34d399", fontSize: "14px" }}>Gemini 1.5 Flash</span>
            </div>
            <div style={{ backgroundColor: "#1f2937", padding: "14px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #374151" }}>
              <span>2. External API Request (<code>http_request</code>)</span>
              <span style={{ color: "#34d399", fontSize: "14px" }}>{stepStatuses.http}</span>
            </div>
            <div style={{ backgroundColor: "#1f2937", padding: "14px", borderRadius: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid #374151" }}>
              <span>3. Manager Approval Gate (<code>approval_gate</code>)</span>
              <span style={{ color: "#fbbf24", fontSize: "14px" }}>Role Gate</span>
            </div>
          </div>

          {/* Role Warning for Viewers */}
          {role === "viewer" && (
            <div style={{ backgroundColor: "rgba(220, 38, 38, 0.2)", border: "1px solid #dc2626", color: "#f87171", padding: "10px", borderRadius: "6px", textAlign: "center", marginBottom: "20px", fontSize: "14px" }}>
              🔒 Viewers in Org B cannot trigger or edit workflows. Cross-org isolation active.
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button 
              onClick={triggerWorkflow}
              disabled={role === "viewer" || loading}
              style={{ flex: 1, padding: "12px", backgroundColor: role === "viewer" ? "#4b5563" : "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: role === "viewer" ? "not-allowed" : "pointer" }}>
              {loading ? "Processing..." : "Trigger Workflow"}
            </button>
            <button 
              onClick={approveWorkflowStep}
              disabled={role === "viewer" || loading}
              style={{ padding: "12px 20px", backgroundColor: role === "viewer" ? "#4b5563" : "#059669", color: "#fff", border: "none", borderRadius: "6px", fontSize: "16px", fontWeight: "bold", cursor: role === "viewer" ? "not-allowed" : "pointer" }}>
              Approve Gate
            </button>
          </div>

          {/* Execution Status Output */}
          {runId && (
            <div style={{ backgroundColor: "#1f2937", padding: "15px", borderRadius: "6px", border: "1px solid #374151", fontSize: "14px" }}>
              <div style={{ color: "#9ca3af", marginBottom: "4px" }}>Run ID: <span style={{ color: "#e5e7eb" }}>{runId}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px" }}>
                <span>Execution Status:</span>
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