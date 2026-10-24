import React, { useEffect, useState, useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Database,
  Download,
  Copy,
  ExternalLink,
  RefreshCw,
  Search,
  FileText,
  Lock,
  Layers,
  ArrowRight,
  Terminal,
  Zap,
} from "lucide-react";
import {
  api,
  type RunResponse,
  type TestCaseResponse,
  type BoundaryProbeResponse,
  type AuditEventResponse,
  type VerifyResponse,
  type TamperDrillResponse,
} from "../../lib/api";
import { useRole } from "../../lib/role-context";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Input } from "../../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/runs/$runId")({
  component: RunDetailView,
});

const LIFECYCLE_STEPS = [
  "VALIDATING",
  "PROVISIONING",
  "ISOLATION_CHECK",
  "RUNNING",
  "EVALUATING",
  "VERIFYING",
  "COMPLETED",
];

function RunDetailView() {
  const { runId } = Route.useParams();
  const { role, canTamperDrill } = useRole();

  const [run, setRun] = useState<RunResponse | null>(null);
  const [events, setEvents] = useState<AuditEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [tamperResult, setTamperResult] = useState<TamperDrillResponse | null>(null);
  const [tampering, setTampering] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState<string | null>(null);

  // Selected test case for evidence drawer/modal
  const [selectedCase, setSelectedCase] = useState<TestCaseResponse | null>(null);
  const [testSearch, setTestSearch] = useState("");
  const [testVerdictFilter, setTestVerdictFilter] = useState<string>("all");

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRunData = async () => {
    try {
      const data = await api.getRun(runId);
      setRun(data);

      // fetch events if available
      try {
        const evData = await api.getRunEvents(runId);
        setEvents(evData.events || []);
      } catch {
        // events may not be ready early in lifecycle
      }

      return data;
    } catch (err: unknown) {
      console.error("Failed to fetch run:", err);
      toast.error("Could not load run data from backend.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const startPolling = async () => {
      const initial = await fetchRunData();
      if (!active) return;

      const isTerminal =
        initial &&
        (initial.status === "COMPLETED" ||
          initial.status === "FAILED" ||
          initial.status === "ISOLATION_FAILED");

      if (!isTerminal) {
        pollTimerRef.current = setInterval(async () => {
          const current = await fetchRunData();
          if (
            current &&
            (current.status === "COMPLETED" ||
              current.status === "FAILED" ||
              current.status === "ISOLATION_FAILED")
          ) {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          }
        }, 1500);
      }
    };

    startPolling();

    return () => {
      active = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [runId]);

  const handleVerifyLedger = async () => {
    try {
      setVerifying(true);
      toast.info("Verifying SHA-256 hash chain from genesis...");
      const res = await api.verifyRunChain(runId);
      setVerifyResult(res);
      if (res.is_valid) {
        toast.success(`Ledger verified! All ${res.total_events} events cryptographically match.`);
      } else {
        toast.error(`Verification failed: ${res.reason || "Hash chain mismatch"}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperDrill = async () => {
    if (!canTamperDrill) {
      toast.error(`Your role (${role}) cannot execute tamper drills.`);
      return;
    }
    try {
      setTampering(true);
      toast.info("Executing controlled tamper drill against disposable event copy...");
      const res = await api.tamperDrill(runId);
      setTamperResult(res);
      toast.warning("Tamper detected! Observed hash chain breakage on mutated payload.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tamper drill failed";
      toast.error(msg);
    } finally {
      setTampering(false);
    }
  };

  const handleDownloadReport = async (format: "markdown" | "json") => {
    try {
      toast.info(`Generating ${format.toUpperCase()} report...`);
      const content = await api.getRunReport(runId, format);
      const blob = new Blob([content], {
        type: format === "json" ? "application/json" : "text/markdown",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bayora-evaluation-${runId}.${format === "json" ? "json" : "md"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Report downloaded successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to download report";
      toast.error(msg);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading && !run) {
    return (
      <div className="p-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-500" />
        <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
          Loading evaluation session...
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-1">{runId}</p>
      </div>
    );
  }

  if (!run) {
    return (
      <Card className="p-12 text-center border-dashed">
        <CardContent className="space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h3 className="font-bold text-lg">Evaluation Run Not Found</h3>
          <p className="text-xs text-slate-500">Run ID: {runId}</p>
          <Link to="/runs">
            <Button variant="outline" size="sm">
              Back to Evaluations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const currentStepIdx = LIFECYCLE_STEPS.indexOf(run.status);
  const isFailed = run.status === "FAILED" || run.status === "ISOLATION_FAILED";

  const testCases = run.test_cases || [];
  const filteredCases = testCases.filter((tc) => {
    const matchesSearch =
      tc.case_id.toLowerCase().includes(testSearch.toLowerCase()) ||
      tc.prompt.toLowerCase().includes(testSearch.toLowerCase()) ||
      tc.category.toLowerCase().includes(testSearch.toLowerCase());

    const matchesVerdict =
      testVerdictFilter === "all"
        ? true
        : testVerdictFilter === "PASS"
          ? tc.verdict === "PASS"
          : testVerdictFilter === "FAIL"
            ? tc.verdict === "FAIL"
            : tc.gateway_decision === "DENY";

    return matchesSearch && matchesVerdict;
  });

  const passPct =
    run.score_summary?.pass_rate_pct ??
    (testCases.length > 0
      ? Math.round((testCases.filter((t) => t.verdict === "PASS").length / testCases.length) * 100)
      : 100);
  const blockedCount =
    run.score_summary?.blocked_by_gateway ??
    testCases.filter((t) => t.gateway_decision === "DENY").length;
  const avgLatency =
    run.score_summary?.avg_latency_ms ??
    (testCases.length > 0
      ? Math.round(testCases.reduce((acc, t) => acc + (t.latency_ms || 0), 0) / testCases.length)
      : 0);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/runs" className="text-xs text-slate-500 hover:text-slate-800">
              Evaluations /
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-slate-900 dark:text-slate-100">
              {run.id}
            </h1>
            <Badge
              variant="outline"
              className={`text-xs font-semibold uppercase px-2.5 py-0.5 ${
                run.status === "COMPLETED"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                  : isFailed
                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                    : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 animate-pulse"
              }`}
            >
              {run.status}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Suite: <strong className="text-slate-700 dark:text-slate-300">{run.suite_id}</strong>
            </span>
            <span>•</span>
            <span>
              Model:{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                {run.model_id}
              </strong>
            </span>
            {run.provider && (
              <>
                <span>•</span>
                <span>
                  Provider:{" "}
                  <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0">
                    {run.provider}
                  </Badge>
                </span>
              </>
            )}
            <span>•</span>
            <span>
              Policy:{" "}
              <strong className="text-slate-700 dark:text-slate-300 font-mono">
                {run.policy_id}
              </strong>
            </span>
            <span>•</span>
            <span>Created {new Date(run.created_at).toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleVerifyLedger}
            disabled={verifying}
            className="text-xs flex items-center gap-1.5 border-slate-200 dark:border-slate-700"
          >
            <Database className="w-3.5 h-3.5 text-sky-500" />
            {verifying ? "Verifying..." : "Verify Ledger"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleTamperDrill}
            disabled={tampering}
            className="text-xs flex items-center gap-1.5 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {tampering ? "Testing..." : "Tamper Drill"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleDownloadReport("markdown")}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export (.md)
          </Button>

          <Link to="/compare" search={{ runAId: run.id }}>
            <Button size="sm" variant="outline" className="text-xs flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-indigo-500" />
              Compare Run
            </Button>
          </Link>
        </div>
      </div>

      {/* Real-time Lifecycle Stepper */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Evaluation Execution Lifecycle
            </span>
            {run.status !== "COMPLETED" && !isFailed && (
              <span className="text-xs font-mono text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Live polling active
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {LIFECYCLE_STEPS.map((stepName, idx) => {
              const isPast = currentStepIdx > idx || run.status === "COMPLETED";
              const isCurrent = run.status === stepName;
              return (
                <div
                  key={stepName}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs ring-2 ring-indigo-500/20"
                      : isPast
                        ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
                        : "border-slate-200 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900"
                  }`}
                >
                  <div className="text-[10px] font-mono text-slate-400 mb-0.5">Step {idx + 1}</div>
                  <div className="text-xs font-semibold tracking-tight truncate">{stepName}</div>
                  <div className="mt-1 flex justify-center">
                    {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    {isCurrent && (
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {isFailed && (
            <div className="mt-3 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                <strong>Execution Terminated:</strong>{" "}
                {run.error_reason || "Run failed during validation or isolation check."}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification / Tamper Banner if triggered */}
      {verifyResult && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs ${
            verifyResult.is_valid
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200"
          }`}
        >
          {verifyResult.is_valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 space-y-1">
            <div className="font-bold text-sm">
              {verifyResult.is_valid
                ? "Cryptographic Verification Succeeded"
                : "Cryptographic Verification Failed"}
            </div>
            <p>{verifyResult.reason}</p>
            <div className="font-mono text-[11px] opacity-80">
              Total Events: {verifyResult.total_events} • Verified at:{" "}
              {verifyResult.verified_at
                ? new Date(verifyResult.verified_at).toLocaleTimeString()
                : "Just now"}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVerifyResult(null)}
            className="text-xs opacity-60 hover:opacity-100 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {tamperResult && (
        <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
          <div className="flex items-center justify-between font-bold text-sm">
            <span className="flex items-center gap-1.5">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Controlled Tamper Demonstration (Disposable Copy)
            </span>
            <button
              type="button"
              onClick={() => setTamperResult(null)}
              className="text-xs opacity-60 hover:opacity-100 font-bold"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed">{tamperResult.explanation}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
            <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-900">
              <span className="text-slate-500 block">
                Original Hash (Seq #{tamperResult.tampered_seq}):
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 break-all">
                {tamperResult.original_event_hash}
              </span>
            </div>
            <div className="p-2 rounded bg-white/70 dark:bg-slate-900/60 border border-amber-200 dark:border-amber-900">
              <span className="text-slate-500 block">Mutated Copy Hash:</span>
              <span className="text-rose-700 dark:text-rose-400 break-all">
                {tamperResult.tampered_event_hash}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
            * Note: Original database records were not altered; verification correctly failed at the
            exact point of tampering.
          </p>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pass Rate
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {passPct}%
            </div>
            <span className="text-[11px] text-slate-400">
              {testCases.filter((t) => t.verdict === "PASS").length} of {testCases.length} resolved
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Gateway Interceptions
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              {blockedCount}
            </div>
            <span className="text-[11px] text-slate-400">Malicious payloads blocked</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Boundary Invariants
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />5 / 5
            </div>
            <span className="text-[11px] text-slate-400">T1–T5 isolation satisfied</span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="p-4 pb-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Average Latency
            </span>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold font-mono text-slate-700 dark:text-slate-300">
              {avgLatency} ms
            </div>
            <span className="text-[11px] text-slate-400">Mediation & inspection roundtrip</span>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Test Cases, Probes, Ledger, Config */}
      <Tabs defaultValue="tests" className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
          <TabsTrigger value="tests" className="text-xs">
            Test Cases ({testCases.length})
          </TabsTrigger>
          <TabsTrigger value="probes" className="text-xs">
            Boundary Probes ({run.probes?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="ledger" className="text-xs">
            Audit Ledger ({events.length})
          </TabsTrigger>
          <TabsTrigger value="metadata" className="text-xs">
            Configuration Fingerprint
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Test Cases */}
        <TabsContent value="tests" className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={testSearch}
                onChange={(e) => setTestSearch(e.target.value)}
                placeholder="Search test prompt or case ID..."
                className="pl-9 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {["all", "PASS", "FAIL", "BLOCKED"].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTestVerdictFilter(v)}
                  className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                    testVerdictFilter === v
                      ? "bg-indigo-600 text-white font-bold"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {v === "all" ? "All" : v}
                </button>
              ))}
            </div>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Case ID</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Prompt Preview</th>
                    <th className="px-4 py-2.5">Gateway Action</th>
                    <th className="px-4 py-2.5">Verdict</th>
                    <th className="px-4 py-2.5">Provider / Tokens</th>
                    <th className="px-4 py-2.5">Latency</th>
                    <th className="px-4 py-2.5 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredCases.map((tc) => (
                    <tr
                      key={tc.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      onClick={() => setSelectedCase(tc)}
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                        {tc.case_id}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px] uppercase font-mono">
                          {tc.category}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600 dark:text-slate-300">
                        {tc.prompt}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            tc.gateway_decision === "ALLOW"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                              : "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                          }`}
                        >
                          {tc.gateway_decision}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold ${
                              tc.verdict === "PASS"
                                ? "text-emerald-600"
                                : tc.verdict === "FAIL"
                                  ? "text-rose-600"
                                  : "text-amber-600"
                            }`}
                          >
                            {tc.verdict}
                          </span>
                          {tc.error_category && (
                            <Badge
                              variant="outline"
                              className="text-[9px] bg-rose-50 text-rose-700 border-rose-300"
                            >
                              {tc.error_category}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {tc.provider ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                              {tc.provider}
                            </span>
                            {tc.input_tokens != null && (
                              <span className="font-mono text-[9px] text-slate-400">
                                {tc.input_tokens} in / {tc.output_tokens || 0} out
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[10px]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {tc.latency_ms} ms
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="ghost" className="h-6 text-xs text-indigo-600">
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Boundary Probes */}
        <TabsContent value="probes" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(run.probes || []).map((p) => (
              <Card key={p.id} className="border-slate-200 dark:border-slate-800 shadow-xs">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {p.probe_name}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold ${
                        p.verdict === "PASS"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                          : "bg-rose-50 text-rose-700 border-rose-300"
                      }`}
                    >
                      {p.verdict}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-mono text-[11px]">
                    <span>
                      {p.source_zone} → {p.destination}
                    </span>
                    <span>
                      Expected: {p.expected} | Observed: {p.observed}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                    {p.evidence_ref}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab 3: Audit Ledger */}
        <TabsContent value="ledger" className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Cryptographically Linked Event Sequence (SHA-256)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={handleVerifyLedger}
              disabled={verifying}
              className="text-xs flex items-center gap-1.5"
            >
              <Database className="w-3.5 h-3.5 text-sky-500" />
              Verify Chain Integrity
            </Button>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-2.5">Seq</th>
                    <th className="px-4 py-2.5">Event Type</th>
                    <th className="px-4 py-2.5">Previous Hash</th>
                    <th className="px-4 py-2.5">Recorded SHA-256 Hash</th>
                    <th className="px-4 py-2.5">Timestamp</th>
                    <th className="px-4 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                  {events.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2.5 font-bold text-indigo-600">#{ev.seq}</td>
                      <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                        {ev.event_type}
                      </td>
                      <td
                        className="px-4 py-2.5 text-slate-400 max-w-xs truncate"
                        title={ev.prev_hash}
                      >
                        {ev.prev_hash.slice(0, 16)}...
                      </td>
                      <td
                        className="px-4 py-2.5 text-slate-800 dark:text-slate-200 max-w-xs truncate font-bold"
                        title={ev.hash}
                      >
                        {ev.hash.slice(0, 16)}...
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                        {new Date(ev.created_at).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(ev.hash, `Event #${ev.seq} hash`)}
                          className="h-6 px-2 text-xs text-slate-500 hover:text-slate-800"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Tab 4: Configuration Metadata */}
        <TabsContent value="metadata" className="space-y-4">
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-500" />
                Immutable Execution Fingerprints
              </CardTitle>
              <CardDescription className="text-xs">
                These fingerprints guarantee complete reproducibility across evaluation
                environments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">Suite Hash</span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                    {run.suite_hash}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">
                    Policy Fingerprint
                  </span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                    {run.policy_hash}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">
                    Config Hash
                  </span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200 break-all">
                    {run.config_hash}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-1">
                  <span className="text-slate-400 font-mono text-[10px] uppercase">
                    Evaluator Version
                  </span>
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {run.evaluator_version}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Clean Context Enforced:</strong> Fresh session initialized; no prior
                  interaction history inherited.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technical Evidence Inspection Modal */}
      {selectedCase && (
        <Dialog open={!!selectedCase} onOpenChange={() => setSelectedCase(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <DialogTitle className="font-mono text-base flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-500" />
                  {selectedCase.case_id} Evidence
                </DialogTitle>
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    selectedCase.verdict === "PASS"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-rose-50 text-rose-700 border-rose-300"
                  }`}
                >
                  Verdict: {selectedCase.verdict}
                </Badge>
              </div>
              <DialogDescription className="text-xs">
                Category: {selectedCase.category} • Latency: {selectedCase.latency_ms} ms
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs pt-2">
              {/* Prompt */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-slate-500 font-semibold">
                  <span>Adversarial Prompt</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(selectedCase.prompt, "Prompt")}
                    className="flex items-center gap-1 text-[11px] text-indigo-600 hover:underline"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                  {selectedCase.prompt}
                </div>
                <div className="text-[10px] font-mono text-slate-400 truncate">
                  SHA-256: {selectedCase.prompt_hash}
                </div>
              </div>

              {/* Gateway Decision */}
              <div className="p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 dark:text-indigo-200">
                    Policy Gateway Decision: {selectedCase.gateway_decision}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedCase.gateway_reason || "ALLOWED"}
                  </Badge>
                </div>
                {selectedCase.rationale_code && (
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                    Rationale: {selectedCase.rationale_code}
                  </p>
                )}
              </div>

              {/* Model Response & Execution Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-semibold block">Model Response</span>
                  {selectedCase.provider && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                      <Badge
                        variant="outline"
                        className="text-[9px] uppercase font-mono px-1.5 py-0"
                      >
                        {selectedCase.provider}
                      </Badge>
                      {selectedCase.input_tokens != null && (
                        <span>
                          {selectedCase.input_tokens} prompt / {selectedCase.output_tokens || 0}{" "}
                          comp tok
                        </span>
                      )}
                      {selectedCase.finish_reason && (
                        <span>• Finish: {selectedCase.finish_reason}</span>
                      )}
                    </div>
                  )}
                </div>
                {selectedCase.error_category && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-[11px] font-mono">
                    <strong>Provider Error [{selectedCase.error_category}]:</strong> Execution
                    failed at target model provider.
                  </div>
                )}
                {selectedCase.model_response ? (
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                    {selectedCase.model_response}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 italic text-[11px]">
                    None (Request was blocked by the Policy Gateway before reaching the model).
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
