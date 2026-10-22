"use client";

import React from "react";
import { CheckCircle2, Circle, AlertTriangle, XCircle } from "lucide-react";

interface LifecycleProgressProps {
  currentStatus: string;
}

const LIFECYCLE_STAGES = [
  { id: "CREATED", label: "Created" },
  { id: "VALIDATING", label: "Validating" },
  { id: "PROVISIONING", label: "Provisioning" },
  { id: "ISOLATION_CHECK", label: "Isolation Check" },
  { id: "RUNNING", label: "Running Suite" },
  { id: "EVALUATING", label: "Evaluating" },
  { id: "VERIFYING", label: "Chain Verify" },
  { id: "COMPLETED", label: "Completed" },
];

export function LifecycleProgress({ currentStatus }: LifecycleProgressProps) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.id === currentStatus);
  const isFailed = currentStatus === "FAILED" || currentStatus === "ISOLATION_FAILED";

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-xl p-4 shadow-md backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-2">
        <span className="uppercase tracking-wider">Run Orchestrator Lifecycle</span>
        <span className={`px-2 py-0.5 rounded font-bold ${
          currentStatus === "COMPLETED"
            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
            : isFailed
            ? "bg-rose-950 text-rose-400 border border-rose-800"
            : "bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse"
        }`}>
          STATUS: {currentStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between mt-3">
        {/* Horizontal connector line */}
        <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-slate-800 z-0"></div>

        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = currentIndex > idx || currentStatus === "COMPLETED";
          const isCurrent = currentIndex === idx;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center group">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isPassed
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : isCurrent
                    ? isFailed
                      ? "bg-rose-500 text-white animate-bounce"
                      : "bg-cyan-500 text-slate-950 ring-4 ring-cyan-500/30 animate-pulse"
                    : "bg-slate-800 text-slate-500 border border-slate-700"
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isCurrent && isFailed ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <span className="text-[10px] font-bold font-mono">{idx + 1}</span>
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-medium transition-colors ${
                  isCurrent
                    ? "text-cyan-400 font-bold"
                    : isPassed
                    ? "text-slate-300"
                    : "text-slate-500"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
