"use client";

import React, { useState } from "react";
import { CheckCircle2, XCircle, AlertOctagon, Link2, ShieldCheck, RefreshCw, Flame, Info, Copy, Check } from "lucide-react";
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
  const [tamperSeqTarget, setTamperSeqTarget] = useState<number>(2);
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
      const res = await runTamperDrill(runId, tamperSeqTarget);
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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
      {/* Header & Controls */}
      <div className="px-6 py-5 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <h3 className="text-base font-semibold text-slate-100 tracking-wide">
              Cryptographic Audit Hash Chain & Tamper Center
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
              WOW MOMENT 2
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            SHA-256 canonical hash chain linked from Genesis. Any post-hoc mutation to stored events breaks the mathematical sequence.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Verify Chain Button */}
          <button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition-all disabled:opacity-50"
          >
            <ShieldCheck className={`w-3.5 h-3.5 ${isVerifying ? "animate-spin" : ""}`} />
            <span>{isVerifying ? "Verifying..." : "Verify Stored Chain"}</span>
          </button>

          {/* Tamper Drill Button */}
          <button
            onClick={handleTamperDrill}
            disabled={isDrilling}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-medium shadow-md transition-all disabled:opacity-50"
          >
            <Flame className={`w-3.5 h-3.5 ${isDrilling ? "animate-pulse" : ""}`} />
            <span>{isDrilling ? "Executing Drill..." : "Run Controlled Tamper Drill"}</span>
          </button>
        </div>
      </div>

      {/* Drill Result Alert (Tamper Caught!) */}
      {drillResult && (
        <div className="p-5 bg-rose-950/30 border-b border-rose-800/50">
          <div className="flex items-start space-x-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-rose-300 uppercase tracking-wide">
                  Tamper Caught by Independent Verifier!
                </span>
                <span className="px-1.5 py-0.5 rounded bg-rose-900/60 text-rose-200 font-mono text-[10px]">
                  Failing Sequence: #{drillResult.mismatch_seq}
                </span>
              </div>
              <p className="text-slate-300 mt-1 font-mono">{drillResult.explanation}</p>
              
              <div className="mt-3 p-3 bg-slate-950/80 rounded border border-rose-900/40 grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono">
                <div>
                  <span className="text-slate-500">Original Hash: </span>
                  <span className="text-slate-300">{drillResult.original_event_hash.slice(0, 24)}...</span>
                </div>
                <div>
                  <span className="text-rose-400 font-semibold">Mutated Recalculated Hash: </span>
                  <span className="text-rose-300">{drillResult.tampered_event_hash.slice(0, 24)}...</span>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-emerald-400 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 text-emerald-400 inline" />
                <span>Notice: The tamper test was executed safely against an isolated in-memory disposable copy. The genuine audit ledger in PostgreSQL / SQLite remains intact.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Verification Success Alert */}
      {verifyResult && verifyResult.is_valid && (
        <div className="p-4 bg-emerald-950/30 border-b border-emerald-800/50 flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-emerald-300">
              Chain Integrity Verified (100% of {verifyResult.total_events} events match cryptographic digest)
            </span>
            <p className="text-slate-400 font-mono mt-0.5">
              Verified from Genesis Hash (0000...0000) through Block #{verifyResult.total_events}.
            </p>
          </div>
        </div>
      )}

      {/* Visual Sequence of Hash Blocks */}
      <div className="p-6 overflow-x-auto">
        <div className="flex items-center space-x-3 min-w-max pb-4">
          {events.map((evt, idx) => {
            const isTamperedSeq = drillResult && drillResult.mismatch_seq === evt.seq;
            return (
              <React.Fragment key={evt.id || evt.seq}>
                {idx > 0 && (
                  <div className="flex flex-col items-center">
                    <Link2 className={`w-4 h-4 ${isTamperedSeq ? "text-rose-500 animate-pulse" : "text-cyan-500/70"}`} />
                    <span className="text-[9px] font-mono text-slate-500">SHA256</span>
                  </div>
                )}
                <div
                  className={`w-72 rounded-xl p-4 border transition-all ${
                    isTamperedSeq
                      ? "border-rose-500 bg-rose-950/40 glow-rose"
                      : "border-slate-800 bg-slate-950/70 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold">
                      Block #{evt.seq}
                    </span>
                    <span className="text-slate-500">{evt.actor}</span>
                  </div>

                  <div className="mt-2 text-xs font-semibold text-slate-200 truncate">
                    {evt.event_type}
                  </div>

                  <div className="mt-3 space-y-1.5 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500">Prev Hash:</span>
                      <div className="text-slate-400 truncate flex items-center justify-between bg-slate-900/60 p-1 rounded">
                        <span>{evt.prev_hash.slice(0, 16)}...</span>
                        <button
                          onClick={() => copyToClipboard(evt.prev_hash)}
                          className="hover:text-cyan-400 ml-1"
                        >
                          {copiedHash === evt.prev_hash ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500">Event Hash:</span>
                      <div className={`truncate flex items-center justify-between p-1 rounded ${
                        isTamperedSeq ? "bg-rose-950/80 text-rose-300 font-bold" : "bg-slate-900/60 text-emerald-400"
                      }`}>
                        <span>{evt.event_hash.slice(0, 16)}...</span>
                        <button
                          onClick={() => copyToClipboard(evt.event_hash)}
                          className="hover:text-cyan-400 ml-1"
                        >
                          {copiedHash === evt.event_hash ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-900 text-[10px] text-slate-500 font-mono">
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
