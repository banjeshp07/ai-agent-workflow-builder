"use client";

import React, { useState } from "react";

export default function DashboardPage() {
  const [role, setRole] = useState<"owner" | "viewer">("owner");

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0b0f19", color: "#f3f4f6", padding: "30px", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ color: "#60a5fa" }}>Dashboard Page</h1>
        <p>Dashboard is working correctly!</p>
      </div>
    </div>
  );
}