import React, { useEffect, useState } from "react";
import { createFileRoute, useSearch } from "@tanstack/react-router";
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
import { api, type RunResponse, type RunDiffResponse } from "../lib/api";
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
  component: CompareRunsPage,
});

function CompareRunsPage() {
  const searchParams = useSearch({ from: "/compare" });
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <GitCompare className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Comparative Evaluation Analysis
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Compare two evaluation runs side-by-side to measure the empirical security impact of
          defensive policies or model updates.
        </p>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
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
          <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Comparison Run (B):
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
        <div className="p-4 rounded-xl border bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Suite Mismatch Warning:</strong> Run A evaluated <code>{runA.suite_id}</code>{" "}
            while Run B evaluated <code>{runB.suite_id}</code>. For pure scientific control, compare
            runs using the identical benchmark suite.
          </span>
        </div>
      )}

      {/* Diff Results */}
      {comparing ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Comparing evaluation datasets...
        </div>
      ) : diff ? (
        <div className="space-y-6">
          {/* Side-by-side Configuration Comparison */}
          <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold">Configuration Differences</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-2">Parameter</th>
                      <th className="px-4 py-2 text-indigo-600 dark:text-indigo-400">Run A</th>
                      <th className="px-4 py-2 text-sky-600 dark:text-sky-400">Run B</th>
                      <th className="px-4 py-2 text-right">Delta Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="px-4 py-2.5 font-medium">Policy ID</td>
                      <td className="px-4 py-2.5 font-mono">{diff.run_a_policy}</td>
                      <td className="px-4 py-2.5 font-mono">{diff.run_b_policy}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {diff.run_a_policy !== diff.run_b_policy ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-indigo-50 text-indigo-600"
                          >
                            Changed Policy
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Identical</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2.5 font-medium">Model Profile</td>
                      <td className="px-4 py-2.5 font-mono">{diff.run_a_model}</td>
                      <td className="px-4 py-2.5 font-mono">{diff.run_b_model}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        {diff.run_a_model !== diff.run_b_model ? (
                          <Badge variant="outline" className="text-[10px] bg-sky-50 text-sky-600">
                            Changed Model
                          </Badge>
                        ) : (
                          <span className="text-slate-400">Identical</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Verdict Changes Breakdown */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-200">
              Verdict Transitions & Security Impact
            </h2>

            {diff.verdict_changes && diff.verdict_changes.length > 0 ? (
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Test Case ID</th>
                      <th className="px-4 py-2.5">Category</th>
                      <th className="px-4 py-2.5">Run A Verdict</th>
                      <th className="px-4 py-2.5">Run B Verdict</th>
                      <th className="px-4 py-2.5 text-right">Transition Direction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {diff.verdict_changes.map((vc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-medium">
                          {vc.case_id || `Case #${idx + 1}`}
                        </td>
                        <td className="px-4 py-3 font-mono text-[10px] uppercase text-slate-500">
                          {vc.category || "General"}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono">
                          {vc.run_a_verdict || "PASS"}
                        </td>
                        <td className="px-4 py-3 font-bold font-mono">
                          {vc.run_b_verdict || "PASS"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {vc.direction === "improved" ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300">
                              <TrendingUp className="w-3 h-3 mr-1" /> Improved
                            </Badge>
                          ) : vc.direction === "regressed" ? (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-300">
                              <TrendingDown className="w-3 h-3 mr-1" /> Regressed
                            </Badge>
                          ) : (
                            <span className="text-slate-400 flex items-center justify-end gap-1">
                              <Minus className="w-3 h-3" /> Unchanged
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-slate-500 border-dashed">
                <CardContent>No individual verdict differences between these two runs.</CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed">
          <CardContent className="text-xs text-slate-500">
            Select two runs above to generate comparative diff analysis.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
