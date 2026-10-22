"use client";

import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, Flame, Info, Copy, Check, Link as LinkIcon } from "lucide-react";
import { AuditEvent, VerifyResult, TamperDrillResult, verifyRunChain, runTamperDrill } from "@/lib/api";

interface HashChainViewerProps {
  runId: string;
  initialEvents: AuditEvent[];
}

export function HashChainViewer({ runId, initialEvents }: HashChainViewerProps) {
  const [events, setEvents] = useState<AuditEvent[]>(initialEvents);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [isDrilling, setIsDrilling] = useState(false);
  const [drillResult, setDrillResult] = useState<TamperDrillResult | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsVerifying(true);
    setDrillResult(null);
    try {
      const res = await verifyRunChain(runId);
      setVerifyResult(res);
    } catch (err) {
      console.error("Verification error:", err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleTamperDrill = async () => {
    setIsDrilling(true);
    try {
      const res = await runTamperDrill(runId, 2);
      setDrillResult(res);
    } catch (err) {
      console.error("Drill error:", err);
    } finally {
      setIsDrilling(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="bg-surface border border-edge rounded-lg overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-3.5 border-b border-edge bg-canvas/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-1.5 h-1.5 rounded-full bg-signal-emerald"></span>
            <h3 className="text-sm font-semibold text-label-primary tracking-wide">
              Cryptographic Audit Chain & Tamper Demonstration
            </h3>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-subtle text-label-secondary border border-edge">
              SHA-256
            </span>
          </div>
          <p className="text-xs text-label-muted mt-0.5">
            Sequential canonical hash chaining from Genesis. Any post-hoc mutation breaks subsequent block hashes.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-subtle hover:bg-edge border border-edge text-label-primary text-xs font-mono transition-colors disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 text-signal-emerald ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Verifying..." : "Verify Stored Chain"}</span>
          </button>

          <button
            onClick={handleTamperDrill}
            disabled={isDrilling}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-signal-rose/10 hover:bg-signal-rose/20 border border-signal-rose/30 text-signal-rose text-xs font-mono transition-colors disabled:opacity-50"
          >
            <Flame className={`w-3.5 h-3.5 ${isDrilling ? "animate-pulse" : ""}`} />
            <span>{isDrilling ? "Simulating..." : "Run Tamper Drill"}</span>
          </button>
        </div>
      </div>

      {/* Controlled Tamper Drill Alert */}
      {drillResult && (
        <div className="p-4 bg-signal-rose/5 border-b border-signal-rose/20 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-signal-rose">
              Tamper Detected at Block #{drillResult.mismatch_seq}
            </span>
            <span className="text-[10px] text-label-muted">Disposable Copy Test</span>
          </div>
          <p className="text-label-secondary mt-1">{drillResult.explanation}</p>

          <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 bg-canvas border border-edge rounded">
              <span className="text-label-muted block text-[10px]">ORIGINAL RECORD HASH</span>
              <span className="text-label-secondary">{drillResult.original_event_hash.slice(0, 24)}...</span>
            </div>
            <div className="p-2 bg-canvas border border-signal-rose/30 rounded">
              <span className="text-signal-rose block text-[10px]">MUTATED PAYLOAD RECALCULATED HASH</span>
              <span className="text-signal-rose">{drillResult.tampered_event_hash.slice(0, 24)}...</span>
            </div>
          </div>

          <div className="mt-2 text-[11px] text-label-muted flex items-center space-x-1">
            <Info className="w-3.5 h-3.5 text-label-muted inline" />
            <span>Note: Executed on an in-memory duplicate. Real PostgreSQL/SQLite audit table remains untouched.</span>
          </div>
        </div>
      )}

      {/* Chain Verification Pass Alert */}
      {verifyResult && verifyResult.is_valid && (
        <div className="p-3.5 bg-signal-emerald/5 border-b border-signal-emerald/20 flex items-center space-x-2 text-xs font-mono text-signal-emerald">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Full chain integrity verified: all {verifyResult.total_events} blocks match cryptographic digests from Genesis.</span>
        </div>
      )}

      {/* Chain Sequence Carousel */}
      <div className="p-5 overflow-x-auto">
        <div className="flex items-center space-x-3 min-w-max pb-2">
          {events.map((evt, idx) => {
            const isTampered = drillResult && drillResult.mismatch_seq === evt.seq;
            return (
              <React.Fragment key={evt.id || evt.seq}>
                {idx > 0 && (
                  <div className="flex flex-col items-center text-label-muted">
                    <LinkIcon className={`w-3.5 h-3.5 ${isTampered ? "text-signal-rose" : "text-label-muted"}`} />
                  </div>
                )}
                <div
                  className={`w-64 rounded p-3 border font-mono text-xs ${
                    isTampered
                      ? "border-signal-rose bg-signal-rose/5"
                      : "border-edge bg-canvas"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-label-muted">
                    <span className="font-bold text-label-primary">Block #{evt.seq}</span>
                    <span>{evt.actor}</span>
                  </div>

                  <div className="mt-1 text-xs font-semibold text-label-primary truncate">
                    {evt.event_type}
                  </div>

                  <div className="mt-2 space-y-1 text-[10px]">
                    <div className="flex items-center justify-between text-label-muted">
                      <span>Prev:</span>
                      <span className="text-label-secondary">{evt.prev_hash.slice(0, 14)}...</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-muted">Hash:</span>
                      <div className="flex items-center space-x-1">
                        <span className={isTampered ? "text-signal-rose font-bold" : "text-signal-emerald"}>
                          {evt.event_hash.slice(0, 14)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(evt.event_hash)}
                          className="text-label-muted hover:text-label-primary ml-1"
                        >
                          {copiedHash === evt.event_hash ? <Check className="w-2.5 h-2.5 text-signal-emerald" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-edge-subtle text-[10px] text-label-muted">
                    {evt.timestamp.slice(11, 19)} UTC
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
