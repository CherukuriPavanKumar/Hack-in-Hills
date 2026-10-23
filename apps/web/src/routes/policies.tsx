import React, { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  FileCode2,
  PlusCircle,
  Lock,
  Eye,
  Shield,
  CheckCircle2,
  RefreshCw,
  Search,
  Key,
  Copy,
} from "lucide-react";
import { api, type PolicyResponse } from "../lib/api";
import { useRole } from "../lib/role-context";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/policies")({
  component: PoliciesPage,
});

function PoliciesPage() {
  const { role, canCreatePolicy, canSeePolicyInternals } = useRole();
  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Create Policy Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [policyName, setPolicyName] = useState("");
  const [policyVersion, setPolicyVersion] = useState("1.0.0");
  const [keywordsText, setKeywordsText] = useState(
    "ignore all previous instructions, reveal your instructions, system prompt, jailbreak, developer mode",
  );
  const [regexText, setRegexText] = useState(
    "(?i)print (your|the) system prompt\n(?i)you are now DAN",
  );
  const [canaryFiltering, setCanaryFiltering] = useState(true);
  const [maxPromptLength, setMaxPromptLength] = useState(4000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPolicies = async () => {
    try {
      setLoading(true);
      const data = await api.getPolicies();
      setPolicies(data || []);
    } catch (err) {
      console.error("Failed to load policies:", err);
      toast.error("Could not load policies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, [role]);

  const handleCreatePolicy = async () => {
    if (!canCreatePolicy) {
      toast.error(
        `Only Blue Team role can publish new defensive policies (current role: ${role}).`,
      );
      return;
    }
    if (!policyName.trim() || !policyVersion.trim()) {
      toast.error("Please provide policy name and version.");
      return;
    }

    const blockedKeywords = keywordsText
      .split(/[\n,]/)
      .map((k) => k.trim())
      .filter(Boolean);

    const regexPatterns = regexText
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      toast.info("Publishing immutable defensive policy to control plane...");

      await api.createPolicy({
        name: policyName.trim(),
        version: policyVersion.trim(),
        rules_json: {
          blocked_keywords: blockedKeywords,
          regex_patterns: regexPatterns,
          block_canary_tokens: canaryFiltering,
          max_prompt_length: maxPromptLength,
        },
        created_by: "blue_team",
      });

      toast.success("Policy published successfully!");
      setModalOpen(false);
      setPolicyName("");
      fetchPolicies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create policy";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const filtered = policies.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Defensive Policies & Guardrails
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Immutable policy specifications enforced by the Policy Gateway. Blue Team maintains
            defensive guardrails.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPolicies}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          {canCreatePolicy ? (
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 font-bold"
            >
              <PlusCircle className="w-4 h-4" />
              Publish New Policy
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              disabled
              title="Switch role to Blue Team to publish policies"
              className="opacity-60 text-xs"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              Publish (Blue Team Only)
            </Button>
          )}
        </div>
      </div>

      {/* Role Notice */}
      {!canSeePolicyInternals && (
        <div className="p-4 rounded-xl border bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-3">
          <Lock className="w-5 h-5 text-rose-600 shrink-0" />
          <div>
            <strong>Confidentiality Isolation Enforced:</strong> As Red Team, defensive keyword
            filters and regex rules are masked to mirror realistic black-box adversarial
            assessments.
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter policies by name or ID..."
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Policy Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-500" />
          Loading defensive policies...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CardContent className="text-xs text-slate-500">
            No published policies match your search.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((p) => {
            const rules = (p.rules_json as Record<string, unknown>) || {};
            const isRedacted = rules["redacted"] === true;
            const keywords: string[] = Array.isArray(rules["blocked_keywords"])
              ? (rules["blocked_keywords"] as string[])
              : [];
            const regexes: string[] = Array.isArray(rules["regex_patterns"])
              ? (rules["regex_patterns"] as string[])
              : [];
            const canary = rules["block_canary_tokens"] !== false;
            const maxLen =
              typeof rules["max_prompt_length"] === "number" ? rules["max_prompt_length"] : 4000;

            return (
              <Card
                key={p.id}
                className="border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {p.name}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs font-mono">
                      v{p.version}
                    </Badge>
                  </div>
                  <CardDescription className="font-mono text-xs text-slate-400">
                    ID: {p.id} • Created by {p.created_by}
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4 text-xs flex-1">
                  {isRedacted ? (
                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-center space-y-2 my-2">
                      <Lock className="w-8 h-8 text-rose-500 mx-auto" />
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        Policy Internals Redacted
                      </div>
                      <p className="text-slate-500 text-[11px] max-w-xs mx-auto">
                        Blue Team defensive logic is confidential and partitioned from Red Team
                        visibility.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Blocked Keywords */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          Blocked Keywords ({keywords.length})
                        </span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {keywords.map((kw: string, i: number) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                            >
                              {kw}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Regex Patterns */}
                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-700 dark:text-slate-300 block">
                          Regex Filters ({regexes.length})
                        </span>
                        <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[11px] text-slate-600 dark:text-slate-400">
                          {regexes.map((rx: string, i: number) => (
                            <div
                              key={i}
                              className="p-1 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 truncate"
                            >
                              /{rx}/i
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Canary & Length */}
                      <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span>
                          Canary Token Filter: <strong>{canary ? "Enabled" : "Disabled"}</strong>
                        </span>
                        <span>
                          Max Length: <strong>{maxLen} chars</strong>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Fingerprint */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-400">
                    <span className="truncate max-w-xs">SHA-256: {p.policy_hash}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(p.policy_hash, "Policy hash")}
                      className="text-indigo-600 hover:text-indigo-700 font-bold ml-2 shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Policy Dialog (Blue Team Only) */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold text-base flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Publish New Defensive Policy
            </DialogTitle>
            <DialogDescription className="text-xs">
              Publish an immutable versioned policy with keyword filters, regex patterns, and prompt
              limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-xs py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Policy Name</Label>
                <Input
                  value={policyName}
                  onChange={(e) => setPolicyName(e.target.value)}
                  placeholder="e.g. Enterprise Strict Guard"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Version</Label>
                <Input
                  value={policyVersion}
                  onChange={(e) => setPolicyVersion(e.target.value)}
                  placeholder="e.g. 1.0.0"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Blocked Keywords (comma-separated)</Label>
              <Textarea
                value={keywordsText}
                onChange={(e) => setKeywordsText(e.target.value)}
                rows={3}
                className="text-xs font-mono"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Regex Patterns (one per line)</Label>
              <Textarea
                value={regexText}
                onChange={(e) => setRegexText(e.target.value)}
                rows={3}
                className="text-xs font-mono"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  checked={canaryFiltering}
                  onCheckedChange={setCanaryFiltering}
                  id="canary-switch"
                />
                <Label htmlFor="canary-switch" className="text-xs font-medium cursor-pointer">
                  Block Canary Tokens
                </Label>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Max Prompt Length</Label>
                <Input
                  type="number"
                  value={maxPromptLength}
                  onChange={(e) => setMaxPromptLength(Number(e.target.value))}
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreatePolicy}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {isSubmitting ? "Publishing..." : "Publish Immutable Policy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
