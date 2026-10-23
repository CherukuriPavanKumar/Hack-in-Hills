import React, { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import {
  Database,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Search,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  api,
  type RunResponse,
  type AuditEventResponse,
  type VerifyResponse,
  type TamperDrillResponse,
} from "../lib/api";
import { useRole } from "../lib/role-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";

interface AuditSearchParams {
  runId?: string | undefined;
}

export const Route = createFileRoute("/audit")({
  validateSearch: (search: Record<string, unknown>): AuditSearchParams => {
    const runIdVal = search["runId"];
    return {
      runId: typeof runIdVal === "string" ? runIdVal : undefined,
    };
  },
  component: AuditLedgerPage,
});

function AuditLedgerPage() {
  const { runId: searchRunId } = useSearch({ from: "/audit" });
  const { role, canTamperDrill } = useRole();

  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>(searchRunId || "");
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);

  const [tamperResult, setTamperResult] = useState<TamperDrillResponse | null>(null);
  const [tampering, setTampering] = useState(false);

  const [expandedPayload, setExpandedPayload] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadRuns() {
      try {
        setLoadingRuns(true);
        const data = await api.getRuns();
        setRuns(data || []);
        if (data && data.length > 0) {
          if (!selectedRunId || !data.some((r) => r.id === selectedRunId)) {
            setSelectedRunId(data[0]?.id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load runs for audit:", err);
      } finally {
        setLoadingRuns(false);
      }
    }
    loadRuns();
  }, []);

  useEffect(() => {
    if (!selectedRunId) return;

    async function loadEvents() {
      try {
        setLoadingEvents(true);
        setVerifyResult(null);
        setTamperResult(null);
        const res = await api.getRunEvents(selectedRunId);
        setEvents(res.events || []);
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [selectedRunId]);

  const handleVerify = async () => {
    if (!selectedRunId) return;
    try {
      setVerifying(true);
      toast.info("Computing SHA-256 hash chain from genesis...");
      const res = await api.verifyRunChain(selectedRunId);
      setVerifyResult(res);
      if (res.is_valid) {
        toast.success(`Verification passed! All ${res.total_events} events match.`);
      } else {
        toast.error(`Verification failed: ${res.reason}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification error";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperDrill = async () => {
    if (!selectedRunId) return;
    if (!canTamperDrill) {
      toast.error(`Your role (${role}) cannot run tamper demonstrations.`);
      return;
    }
    try {
      setTampering(true);
      toast.info("Mutating disposable copy of event seq #2 to test detection...");
      const res = await api.tamperDrill(selectedRunId);
      setTamperResult(res);
      toast.warning("Tamper detected! Downstream hash chain broken as expected.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Drill failed";
      toast.error(msg);
    } finally {
      setTampering(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const togglePayload = (seq: number) => {
    setExpandedPayload((prev) => ({ ...prev, [seq]: !prev[seq] }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Cryptographic Audit Ledger & Chain Integrity
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Append-only SHA-256 event sequences mathematically proving that evaluation evidence has
            not been tampered with.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleVerify}
            disabled={verifying || !selectedRunId}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 shadow-sm text-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            {verifying ? "Verifying..." : "Verify Ledger Chain"}
          </Button>

          <Button
            onClick={handleTamperDrill}
            disabled={tampering || !selectedRunId}
            variant="outline"
            className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs flex items-center gap-1.5"
          >
            <ShieldAlert className="w-4 h-4" />
            {tampering ? "Testing..." : "Tamper Demo"}
          </Button>
        </div>
      </div>

      {/* Select Run Dropdown Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
          Target Evaluation:
        </span>
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-full sm:w-96 text-xs font-mono">
            <SelectValue placeholder="Select run to audit..." />
          </SelectTrigger>
          <SelectContent>
            {runs.map((r) => (
              <SelectItem key={r.id} value={r.id} className="font-mono text-xs">
                {r.id} ({r.suite_id} - {r.status})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Verification Result Banner */}
      {verifyResult && (
        <div
          className={`p-5 rounded-xl border flex items-start gap-3.5 text-xs ${
            verifyResult.is_valid
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-950 dark:text-rose-200"
          }`}
        >
          {verifyResult.is_valid ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1.5">
            <div className="font-bold text-sm">
              {verifyResult.is_valid
                ? "Cryptographic Chain Verified Valid"
                : "Cryptographic Chain Invalid"}
            </div>
            <p className="leading-relaxed">{verifyResult.reason}</p>
            <div className="flex items-center gap-4 font-mono text-[11px] opacity-80 pt-1">
              <span>Total Events Verified: {verifyResult.total_events}</span>
              <span>•</span>
              <span>First Mismatch: {verifyResult.mismatch_seq ?? "None"}</span>
              <span>•</span>
              <span>Verified: {new Date(verifyResult.verified_at).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tamper Drill Result Box */}
      {tamperResult && (
        <div className="p-5 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-200 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="font-bold text-sm flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Controlled Tamper Demonstration (Disposable Copy)
            </div>
            <Badge variant="outline" className="border-amber-400 text-amber-700">
              Database Unaltered
            </Badge>
          </div>

          <p className="leading-relaxed">{tamperResult.explanation}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900 border border-amber-200 dark:border-amber-900 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Original Event Hash (Seq #{tamperResult.tampered_seq}):
              </span>
              <div className="font-mono text-emerald-600 break-all text-[11px]">
                {tamperResult.original_event_hash}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-white/80 dark:bg-slate-900 border border-amber-200 dark:border-amber-900 space-y-1">
              <span className="font-bold text-slate-700 dark:text-slate-300">
                Mutated Copy Hash (Seq #{tamperResult.tampered_seq}):
              </span>
              <div className="font-mono text-rose-600 break-all text-[11px]">
                {tamperResult.tampered_event_hash}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded bg-amber-100/60 dark:bg-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <strong>Why this works:</strong> The subsequent event (Seq #
            {tamperResult.tampered_seq + 1}) permanently locked the original hash into its{" "}
            <code>prev_hash</code> field. Any retrospective change to Seq #
            {tamperResult.tampered_seq} breaks that link, causing independent verification to
            immediately flag the discrepancy.
          </div>
        </div>
      )}

      {/* Events Chain Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Audit Ledger Events ({events.length})
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Genesis Anchor: 0000000000000000...
          </span>
        </div>

        {loadingEvents ? (
          <div className="p-12 text-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            Loading cryptographic audit records...
          </div>
        ) : events.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <CardContent>No audit events found for selected run.</CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((ev) => {
              const isPayloadOpen = expandedPayload[ev.seq];
              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950/60 font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                        #{ev.seq}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                        {ev.event_type}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => togglePayload(ev.seq)}
                        className="h-7 text-xs text-indigo-600"
                      >
                        {isPayloadOpen ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" /> Hide Payload
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" /> View Payload
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => copyToClipboard(ev.hash, `Event #${ev.seq} hash`)}
                        className="h-7 px-2 text-xs"
                        title="Copy Hash"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1" /> Copy Hash
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-500 truncate">
                      <span className="text-slate-400 block text-[10px]">Previous Hash:</span>
                      {ev.prev_hash}
                    </div>

                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold truncate">
                      <span className="text-slate-400 block text-[10px]">Current Event Hash:</span>
                      {ev.hash}
                    </div>
                  </div>

                  {isPayloadOpen && (
                    <div className="p-3 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(ev.payload, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Explainer on Guarantees & Limitations */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs bg-slate-50/50 dark:bg-slate-900/40">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-500" />
            Cryptographic Ledger Guarantees & Limitations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          <p>
            <strong>Guarantees:</strong> Every audit event records the SHA-256 hash of its entire
            canonical JSON payload and the cryptographic digest of the prior event. Any historical
            revision, event deletion, or reordering breaks the chain downstream.
          </p>
          <p>
            <strong>Limitations:</strong> While the hash chain prevents undetectable mutation of
            recorded evidence, it does not prevent an adversary with root database write access from
            completely dropping the entire table. For high-assurance compliance, snapshots can be
            anchored to public blockchains or immutable cold storage.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
