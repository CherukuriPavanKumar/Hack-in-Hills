import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  GitCompare,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Shield,
  Layers,
} from "lucide-react";
import { api, type RunResponse, type RunDiffResponse, type VerdictChangeItem } from "../lib/api";
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

interface CompareSearchParams {
  runAId?: string | undefined;
  runBId?: string | undefined;
}

export const Route = createFileRoute("/compare")({
  validateSearch: (search: Record<string, unknown>): CompareSearchParams => {
    const runAVal = search["runAId"];
    const runBVal = search["runBId"];
    return {
      runAId: typeof runAVal === "string" ? runAVal : undefined,
      runBId: typeof runBVal === "string" ? runBVal : undefined,
    };
  },
  component: ComparePage,
});

function ComparePage() {
  const searchParams = Route.useSearch();
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [runAId, setRunAId] = useState<string>(searchParams.runAId || "");
  const [runBId, setRunBId] = useState<string>(searchParams.runBId || "");

  const [diff, setDiff] = useState<RunDiffResponse | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoadingRuns(true);
        const data = await api.getRuns();
        setRuns(data || []);
        if (data && data.length >= 2) {
          if (!runAId && data[0]) setRunAId(data[0].id);
          if (!runBId && data[1]) setRunBId(data[1].id);
        }
      } catch (err) {
        console.error("Failed to load runs for comparison:", err);
      } finally {
        setLoadingRuns(false);
      }
    }
    load();
  }, []);

  const handleCompare = async () => {
    if (!runAId || !runBId) {
      toast.error("Please select two runs to compare.");
      return;
    }
    if (runAId === runBId) {
      toast.warning("Selected runs are identical. Choose different runs to inspect deltas.");
    }

    try {
      setComparing(true);
      const res = await api.compareRuns(runAId, runBId);
      setDiff(res);
      toast.success("Comparison completed!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to compare runs";
      toast.error(msg);
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    if (runAId && runBId && runAId !== runBId) {
      handleCompare();
    }
  }, [runAId, runBId]);

  const runA = runs.find((r) => r.id === runAId);
  const runB = runs.find((r) => r.id === runBId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2 border-b border-border">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-primary" />
          Comparative Run Diff
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Side-by-side delta evaluator demonstrating the empirical security impact of hardened
          defense policies or model updates.
        </p>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card p-4 rounded-xl border border-border shadow-2xs">
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Baseline Run (A):
          </span>
          <Select value={runAId} onValueChange={setRunAId}>
            <SelectTrigger className="w-full text-xs font-mono">
              <SelectValue placeholder="Select Run A..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id} className="font-mono text-xs">
                  {r.id} ({r.policy_id} - {r.model_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Hardened / Comparison Run (B):
          </span>
          <Select value={runBId} onValueChange={setRunBId}>
            <SelectTrigger className="w-full text-xs font-mono">
              <SelectValue placeholder="Select Run B..." />
            </SelectTrigger>
            <SelectContent>
              {runs.map((r) => (
                <SelectItem key={r.id} value={r.id} className="font-mono text-xs">
                  {r.id} ({r.policy_id} - {r.model_id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Comparability Warning */}
      {runA && runB && runA.suite_id !== runB.suite_id && (
        <div className="p-3.5 rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Suite Mismatch:</strong> Run A evaluated <code>{runA.suite_id}</code> while Run
            B evaluated <code>{runB.suite_id}</code>. For scientific control, compare runs evaluated
            under the identical benchmark suite.
          </span>
        </div>
      )}

      {/* Diff Results */}
      {comparing ? (
        <div className="p-16 text-center text-xs text-muted-foreground">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
          Computing configuration and verdict deltas...
        </div>
      ) : diff ? (
        <div className="space-y-6">
          {/* Side-by-side Configuration Comparison */}
          <Card className="border-border shadow-2xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">Configuration Differences</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-2">Parameter</th>
                      <th className="px-4 py-2 text-primary">Run A (Baseline)</th>
                      <th className="px-4 py-2 text-primary">Run B (Comparison)</th>
                      <th className="px-4 py-2 text-right">Delta Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-mono text-[11px]">
                    <tr>
                      <td className="px-4 py-2.5 font-medium font-sans">Policy ID</td>
                      <td className="px-4 py-2.5">{diff.run_a_policy}</td>
                      <td className="px-4 py-2.5">{diff.run_b_policy}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {diff.run_a_policy !== diff.run_b_policy ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                          >
                            Changed Policy
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium font-sans">Model Profile</td>
                      <td className="px-4 py-2.5">{diff.run_a_model}</td>
                      <td className="px-4 py-2.5">{diff.run_b_model}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {diff.run_a_model !== diff.run_b_model ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200"
                          >
                            Changed Model
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium font-sans">Latency (p50 / p95)</td>
                      <td className="px-4 py-2.5">
                        {diff.latency_comparison?.run_a_p50_ms || 0}ms /{" "}
                        {diff.latency_comparison?.run_a_p95_ms || 0}ms
                      </td>
                      <td className="px-4 py-2.5">
                        {diff.latency_comparison?.run_b_p50_ms || 0}ms /{" "}
                        {diff.latency_comparison?.run_b_p95_ms || 0}ms
                      </td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground font-sans">
                        Benchmark telemetry
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Verdict Changes Breakdown */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground">
              Verdict Transitions &amp; Security Impact
            </h2>

            {diff.verdict_changes && diff.verdict_changes.length > 0 ? (
              <div className="border border-border rounded-xl overflow-hidden bg-card shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold font-mono text-[11px]">
                    <tr>
                      <th className="px-4 py-2.5">Test Case ID</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Run A Verdict</th>
                      <th className="px-4 py-2.5">Run B Verdict</th>
                      <th className="px-4 py-2.5 text-right">Transition Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {diff.verdict_changes.map((vc: VerdictChangeItem, idx: number) => {
                      const isImproved = vc.run_a_verdict !== "PASS" && vc.run_b_verdict === "PASS";
                      const isRegressed =
                        vc.run_a_verdict === "PASS" && vc.run_b_verdict !== "PASS";

                      return (
                        <tr key={idx} className="hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono font-medium">
                            {vc.case_id || `Case #${idx + 1}`}
                          </td>
                          <td className="px-4 py-3 font-mono text-[10.5px] uppercase text-muted-foreground">
                            {vc.category || "General"}
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-xs">
                            {vc.run_a_verdict || "PASS"}
                          </td>
                          <td className="px-4 py-3 font-bold font-mono text-xs">
                            {vc.run_b_verdict || "PASS"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isImproved ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <TrendingUp className="w-3 h-3 mr-1" /> Improved
                              </Badge>
                            ) : isRegressed ? (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300">
                                <TrendingDown className="w-3 h-3 mr-1" /> Regressed
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground flex items-center justify-end gap-1 font-mono text-[11px]">
                                <Minus className="w-3 h-3" /> Unchanged
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-muted-foreground border-dashed">
                <CardContent>No individual verdict differences between these two runs.</CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed">
          <CardContent className="text-xs text-muted-foreground">
            Select two runs above to generate comparative diff analysis.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
