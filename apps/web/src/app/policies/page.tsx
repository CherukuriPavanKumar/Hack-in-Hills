"use client";

import React, { useEffect, useState } from "react";
import { Shield, Plus, Lock, CheckCircle2, AlertTriangle, Code, Terminal, Key } from "lucide-react";
import { PolicyVersion, fetchPolicies, createPolicy } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

export default function PoliciesPage() {
  const { role: currentRole } = useRole();
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyVersion | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("3.0.0");
  const [keywords, setKeywords] = useState("confidential, secret_key, admin_override");
  const [regex, setRegex] = useState("(?i)bypass\\s+rules");
  const [blockCanary, setBlockCanary] = useState(true);
  const [maxLength, setMaxLength] = useState(2048);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isRedTeam = currentRole === "red_team";

  useEffect(() => {
    async function load() {
      try {
        const list = await fetchPolicies(currentRole);
        setPolicies(list);
        if (list.length > 0) setSelectedPolicy(list[0]);
      } catch (err) {
        console.error("Policy load error:", err);
      }
    }
    load();
  }, [currentRole]);

  const handleCreatePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      const kwList = keywords
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean);
      const regList = regex
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);

      const newP = await createPolicy(
        {
          name,
          version,
          rules_json: {
            blocked_keywords: kwList,
            regex_patterns: regList,
            block_canary_tokens: blockCanary,
            max_prompt_length: maxLength,
          },
        },
        currentRole
      );

      const updated = await fetchPolicies(currentRole);
      setPolicies(updated);
      setSelectedPolicy(newP);
      setShowCreateModal(false);
      setName("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create policy");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-edge pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Shield className="w-4 h-4 text-slate-300" />
            <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
              Defense Policies & Boundary Rules
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable inspection rules, token filters, and pattern matchers enforced by the Policy Gateway.
          </p>
        </div>

        {!isRedTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-signal-blue hover:bg-blue-600 text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New policy version</span>
          </button>
        )}
      </div>

      {/* Red Team Confidentiality Alert */}
      {isRedTeam && (
        <div className="p-3.5 rounded border border-signal-rose/30 bg-signal-rose/5 flex items-start space-x-3">
          <Lock className="w-4 h-4 text-signal-rose flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-signal-rose font-mono text-[11px]">
              Red Team confidentiality partition active
            </span>
            <p className="text-slate-300 mt-0.5 leading-relaxed font-sans text-xs">
              Blue Team rule implementations and regex heuristics are withheld by server-side authorization. Red team evaluations query the boundary strictly via black-box gateway proxying.
            </p>
          </div>
        </div>
      )}

      {/* Policies Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Left: Policy List */}
        <div className="space-y-2">
          <span className="text-xs font-mono text-slate-400 font-medium block">
            Registered policies
          </span>
          <div className="space-y-2">
            {policies.map((p) => {
              const isSelected = selectedPolicy?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPolicy(p)}
                  className={`p-3 rounded border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-signal-blue bg-surface"
                      : "border-edge bg-surface/50 hover:bg-surface hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-xs text-slate-200">{p.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-canvas border border-edge text-slate-300">
                      v{p.version}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] font-mono text-slate-400 truncate">
                    {p.id}
                  </div>
                  <div className="mt-0.5 text-[10px] font-mono text-slate-500">
                    SHA256: {p.policy_hash.slice(0, 16)}...
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Policy Rule Inspector */}
        <div className="md:col-span-2">
          {selectedPolicy && (
            <div className="bg-surface border border-edge rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-edge pb-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-100">{selectedPolicy.name}</h2>
                  <span className="text-xs font-mono text-slate-400">Version: {selectedPolicy.version}</span>
                </div>
                <div className="text-right text-xs font-mono text-slate-400">
                  <span>Author: {selectedPolicy.created_by}</span>
                  <div className="text-[10px] text-slate-500">SHA256: {selectedPolicy.policy_hash.slice(0, 24)}...</div>
                </div>
              </div>

              {/* Rules JSON display or redacted notice */}
              {isRedTeam ? (
                <div className="p-8 border border-edge rounded bg-canvas text-center space-y-2">
                  <Lock className="w-6 h-6 text-slate-500 mx-auto" />
                  <div className="text-xs font-medium text-slate-300">Policy logic masked for Red Team</div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    The detailed rules and regex patterns for this policy are protected to avoid bias in test suite execution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3 bg-canvas rounded border border-edge space-y-2">
                    <span className="text-[11px] text-slate-400 font-medium block">
                      Enforced rule configuration
                    </span>
                    <pre className="text-slate-300 text-xs overflow-x-auto p-2 bg-surface/80 rounded border border-edge/60">
                      {JSON.stringify(selectedPolicy.rules_json, null, 2)}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-canvas rounded border border-edge">
                      <span className="text-slate-500 text-[10px] block">Canary token filtering</span>
                      <span className="text-signal-emerald font-semibold">
                        {selectedPolicy.rules_json?.block_canary_tokens ? "Enabled (CANARY-*)" : "Disabled"}
                      </span>
                    </div>
                    <div className="p-3 bg-canvas rounded border border-edge">
                      <span className="text-slate-500 text-[10px] block">Max prompt length</span>
                      <span className="text-slate-200 font-semibold">
                        {selectedPolicy.rules_json?.max_prompt_length || 4096} characters
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-surface border border-edge rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-edge pb-3">
              <h2 className="font-semibold text-sm text-slate-100">Create policy version</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 rounded border border-edge"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="policyNameInput" className="block text-slate-300 font-mono font-medium mb-1">Policy name</label>
                <input
                  id="policyNameInput"
                  type="text"
                  required
                  placeholder="e.g. Production Perimeter Policy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-signal-blue"
                />
              </div>

              <div>
                <label htmlFor="policyVersionInput" className="block text-slate-300 font-mono font-medium mb-1">Version identifier</label>
                <input
                  id="policyVersionInput"
                  type="text"
                  required
                  placeholder="3.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-signal-blue"
                />
              </div>

              <div>
                <label htmlFor="policyKeywordsInput" className="block text-slate-300 font-mono font-medium mb-1">
                  Blocked keywords (comma-separated)
                </label>
                <input
                  id="policyKeywordsInput"
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-signal-blue"
                />
              </div>

              <div>
                <label htmlFor="policyRegexInput" className="block text-slate-300 font-mono font-medium mb-1">
                  Regex patterns (one per line)
                </label>
                <textarea
                  id="policyRegexInput"
                  rows={3}
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-slate-200 font-mono focus:outline-none focus:border-signal-blue"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="canaryCheck"
                  checked={blockCanary}
                  onChange={(e) => setBlockCanary(e.target.checked)}
                  className="rounded border-edge text-signal-blue focus:ring-0"
                />
                <label htmlFor="canaryCheck" className="text-slate-300 font-mono">
                  Block canary token exfiltration (CANARY-*)
                </label>
              </div>

              {errorMsg && <div className="text-signal-rose font-mono text-[11px]">{errorMsg}</div>}

              <button
                type="submit"
                className="w-full py-2 rounded bg-signal-blue hover:bg-blue-600 text-white font-medium font-mono text-xs transition-colors"
              >
                Compile and commit immutable version
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
