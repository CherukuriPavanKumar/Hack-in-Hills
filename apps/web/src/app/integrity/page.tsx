"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Flame, Database, Lock, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import { TestRun, AuditEvent, fetchRuns, fetchRunEvents } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";
import { HashChainViewer } from "@/components/HashChainViewer";
import { WhatThisProves } from "@/components/WhatThisProves";

function IntegrityContent() {
  const { role: currentRole } = useRole();
  const searchParams = useSearchParams();
  const requestedRunId = searchParams?.get("run_id") || null;

  const [runs, setRuns] = useState<TestRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(requestedRunId);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        const allRuns = await fetchRuns(currentRole);
        setRuns(allRuns);

        const targetId = selectedRunId || (allRuns.length > 0 ? allRuns[0].id : null);
        if (targetId) {
          setSelectedRunId(targetId);
          const ev = await fetchRunEvents(targetId);
          setEvents(ev);
        }
      } catch (err) {
        console.error("Integrity Center load error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [selectedRunId, currentRole]);

  const handleSelectRun = async (id: string) => {
    setSelectedRunId(id);
    try {
      const ev = await fetchRunEvents(id);
      setEvents(ev);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Evidence Integrity Center & Cryptographic Hash Chain
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Proves the authenticity and tamper-evident lineage of all evaluation results, access decisions, and boundary checks.
          </p>
        </div>

        {/* Run Selector */}
        <div className="flex items-center space-x-3">
          <span className="text-xs font-mono text-slate-400">TARGET RUN:</span>
          <select
            value={selectedRunId || ""}
            onChange={(e) => handleSelectRun(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hash Chain Viewer & Tamper Drill Component */}
      {selectedRunId && (
        <HashChainViewer runId={selectedRunId} initialEvents={events} />
      )}

      {/* Educational Walkthrough for Judges */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 backdrop-blur-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono flex items-center space-x-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span>How the Bayora SHA-256 Audit Chain Operates</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold">1. Canonical Serialization</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Every audit event is normalized to canonical JSON with deterministically sorted keys, no whitespace padding, and the event&apos;s own hash field excluded.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold">2. Cryptographic Linkage</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              <code>event_hash = SHA256(prev_hash || &apos;:&apos; || canonical_json)</code>. The initial event anchors to a fixed Genesis hash (64 zeros).
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="text-cyan-400 font-bold">3. Independent Verification</div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              The verifier recalculates each block from Genesis to Head. Modifying even 1 byte in a past event invalidates all downstream blocks immediately.
            </p>
          </div>
        </div>
      </div>

      <WhatThisProves />
    </div>
  );
}

export default function IntegrityCenterPage() {
  return (
    <Suspense fallback={<div className="text-xs font-mono text-slate-500">Loading Integrity Center...</div>}>
      <IntegrityContent />
    </Suspense>
  );
}
