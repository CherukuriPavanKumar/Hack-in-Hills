"use client";

import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";

interface LifecycleProgressProps {
  currentStatus: string;
}

const LIFECYCLE_STAGES = [
  { id: "CREATED", label: "Created" },
  { id: "VALIDATING", label: "Validating" },
  { id: "PROVISIONING", label: "Provisioning" },
  { id: "ISOLATION_CHECK", label: "Isolation Check" },
  { id: "RUNNING", label: "Running" },
  { id: "EVALUATING", label: "Evaluating" },
  { id: "VERIFYING", label: "Verifying" },
  { id: "COMPLETED", label: "Completed" },
];

export function LifecycleProgress({ currentStatus }: LifecycleProgressProps) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.id === currentStatus);
  const isFailed = currentStatus === "FAILED" || currentStatus === "ISOLATION_FAILED";

  return (
    <div className="bg-surface border border-edge rounded-lg p-4">
      <div className="flex items-center justify-between text-xs font-mono text-label-secondary mb-3">
        <span className="text-[11px] font-semibold text-label-primary">Run Orchestrator Lifecycle</span>
        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
          currentStatus === "COMPLETED"
            ? "bg-signal-emerald/10 text-signal-emerald"
            : isFailed
            ? "bg-signal-rose/10 text-signal-rose"
            : "bg-signal-blue/10 text-signal-blue"
        }`}>
          {currentStatus}
        </span>
      </div>

      <div className="relative flex items-center justify-between">
        {/* Progress track */}
        <div className="absolute left-2 right-2 top-3 h-0.5 bg-edge -z-0"></div>

        {LIFECYCLE_STAGES.map((stage, idx) => {
          const isPassed = currentIndex > idx || currentStatus === "COMPLETED";
          const isCurrent = currentIndex === idx;

          return (
            <div key={stage.id} className="relative z-10 flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] transition-colors ${
                  isPassed
                    ? "bg-signal-emerald text-canvas font-bold"
                    : isCurrent
                    ? isFailed
                      ? "bg-signal-rose text-canvas font-bold"
                      : "bg-signal-blue text-canvas font-bold ring-2 ring-signal-blue/30"
                    : "bg-canvas border border-edge text-label-muted"
                }`}
              >
                {isPassed ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent && isFailed ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={`mt-1.5 text-[10px] font-mono ${
                  isCurrent
                    ? "text-label-primary font-semibold"
                    : isPassed
                    ? "text-label-secondary"
                    : "text-label-muted"
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
