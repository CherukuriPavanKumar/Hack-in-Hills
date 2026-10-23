import React, { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  PlusCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  Database,
  GitCompare,
  RefreshCw,
  Clock,
} from "lucide-react";
import { api, type RunResponse } from "../../lib/api";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";

export const Route = createFileRoute("/runs/")({
  component: RunsIndex,
});

function RunsIndex() {
  const [runs, setRuns] = useState<RunResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [suiteFilter, setSuiteFilter] = useState("all");

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getRuns();
      setRuns(data || []);
    } catch (err) {
      console.error("Failed to fetch runs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
  }, []);

  const filteredRuns = runs.filter((r) => {
    const matchesSearch =
      r.id.toLowerCase().includes(search.toLowerCase()) ||
      r.suite_id.toLowerCase().includes(search.toLowerCase()) ||
      r.model_id.toLowerCase().includes(search.toLowerCase()) ||
      r.policy_id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "COMPLETED"
          ? r.status === "COMPLETED"
          : statusFilter === "FAILED"
            ? r.status === "FAILED" || r.status === "ISOLATION_FAILED"
            : r.status !== "COMPLETED" && r.status !== "FAILED" && r.status !== "ISOLATION_FAILED";

    const matchesSuite = suiteFilter === "all" ? true : r.suite_id === suiteFilter;

    return matchesSearch && matchesStatus && matchesSuite;
  });

  const suites = Array.from(new Set(runs.map((r) => r.suite_id)));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Security Evaluations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Audit history of adversarial security evaluations, model test runs, and boundary checks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRuns}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link to="/runs/new">
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              New Evaluation
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Run ID, suite, model or policy..."
            className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="ACTIVE">In-Flight / Active</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
            </SelectContent>
          </Select>

          {suites.length > 0 && (
            <Select value={suiteFilter} onValueChange={setSuiteFilter}>
              <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                <SelectValue placeholder="Benchmark Suite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suites</SelectItem>
                {suites.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Evaluations Table */}
      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading security evaluations...
        </div>
      ) : filteredRuns.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-300 dark:border-slate-700 p-12 text-center">
          <CardContent className="space-y-3">
            <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-bold text-base text-slate-800 dark:text-slate-200">
              No matching evaluations found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {search || statusFilter !== "all" || suiteFilter !== "all"
                ? "Try clearing filters to find recorded evaluations."
                : "No evaluation runs exist in the database yet. Launch your first one!"}
            </p>
            <Link to="/runs/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2">
                Launch Evaluation
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Run Identifier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Benchmark Suite</th>
                  <th className="px-4 py-3">Target Model</th>
                  <th className="px-4 py-3">Policy Applied</th>
                  <th className="px-4 py-3">Pass Rate / Score</th>
                  <th className="px-4 py-3">Budget & Timeout</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRuns.map((r) => {
                  const total = r.score_summary?.total_cases ?? 0;
                  const passed = r.score_summary?.passed ?? 0;
                  const passPct = total > 0 ? Math.round((passed / total) * 100) : null;
                  const blockedCount = r.score_summary?.blocked_by_gateway ?? 0;
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        <Link
                          to="/runs/$runId"
                          params={{ runId: r.id }}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                        >
                          {r.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            r.status === "COMPLETED"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800"
                              : r.status === "FAILED" || r.status === "ISOLATION_FAILED"
                                ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-300"
                                : "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-300 animate-pulse"
                          }`}
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                        <span className="font-medium">{r.suite_id}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          v{r.suite_version}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {r.model_id}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {r.policy_id}
                      </td>
                      <td className="px-4 py-3">
                        {total > 0 && passPct !== null ? (
                          <div className="space-y-0.5">
                            <span
                              className={`font-bold ${
                                passPct >= 80
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-amber-600 dark:text-amber-400"
                              }`}
                            >
                              {passPct}% ({passed}/{total})
                            </span>
                            {blockedCount > 0 && (
                              <span className="text-[10px] text-slate-400 block">
                                ({blockedCount} blocked)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {r.request_budget} reqs / {r.timeout_ms}ms
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(r.created_at).toLocaleDateString()}{" "}
                        <span className="text-[10px] text-slate-400">
                          {new Date(r.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link to="/runs/$runId" params={{ runId: r.id }}>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800"
                            >
                              Details
                            </Button>
                          </Link>
                          <Link to="/audit" search={{ runId: r.id }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900"
                              title="Audit Ledger"
                            >
                              <Database className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
