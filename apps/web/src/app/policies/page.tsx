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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
            <h1 className="text-2xl font-extrabold text-white tracking-wide">
              Blue Team Defense Policies & Versioning
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Immutable defense policy bundles containing regex heuristics, canary filters, and pattern blocking rules.
          </p>
        </div>

        {!isRedTeam && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Policy Version</span>
          </button>
        )}
      </div>

      {/* Red Team Confidentiality Alert */}
      {isRedTeam && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/30 flex items-start space-x-3">
          <Lock className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-bold text-rose-300 uppercase font-mono tracking-wide">
              Red Team Confidentiality Partition Active
            </span>
            <p className="text-slate-300 mt-1 leading-relaxed">
              As a Red Team assessor, internal Blue Team defense rules, keywords, and regex definitions are redacted by server-side authorization. Red assessors evaluate the boundary black-box through the Policy Gateway.
            </p>
          </div>
        </div>
      )}

      {/* Policies Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Policy List */}
        <div className="space-y-3">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Versioned Policy Bundles
          </span>
          <div className="space-y-2">
            {policies.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPolicy(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedPolicy?.id === p.id
                    ? "border-indigo-500 bg-indigo-950/20 glow-purple"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">{p.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-400 border border-slate-700">
                    v{p.version}
                  </span>
                </div>
                <div className="mt-2 text-[11px] font-mono text-slate-500 truncate">
                  ID: {p.id}
                </div>
                <div className="mt-1 text-[10px] font-mono text-slate-400">
                  Hash: {p.policy_hash.slice(0, 16)}...
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Policy Rule Inspector */}
        <div className="md:col-span-2">
          {selectedPolicy && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-base font-bold text-white">{selectedPolicy.name}</h3>
                  <span className="text-xs font-mono text-indigo-400">Version: {selectedPolicy.version}</span>
                </div>
                <div className="text-right text-xs font-mono text-slate-500">
                  <span>Author: {selectedPolicy.created_by}</span>
                  <div className="text-[10px] text-slate-400">SHA256: {selectedPolicy.policy_hash}</div>
                </div>
              </div>

              {/* Rules JSON display or redacted notice */}
              {isRedTeam ? (
                <div className="p-8 border border-slate-800 rounded-lg bg-slate-950/60 text-center space-y-2">
                  <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                  <div className="text-sm font-bold text-slate-400">Policy Logic Masked for Red Team</div>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    The detailed rules and regex patterns for this policy are protected to avoid bias in test suite execution.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block">
                      Enforced Rule Parameters
                    </span>
                    <pre className="text-slate-300 text-xs overflow-x-auto p-2 bg-slate-900/50 rounded">
                      {JSON.stringify(selectedPolicy.rules_json, null, 2)}
                    </pre>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">CANARY FILTERING</span>
                      <span className="text-emerald-400 font-bold">
                        {selectedPolicy.rules_json?.block_canary_tokens ? "ENABLED" : "DISABLED"}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">MAX PROMPT LENGTH</span>
                      <span className="text-cyan-400 font-bold">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Create Versioned Defense Policy</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 font-mono text-xs px-2 py-1 rounded bg-slate-800"
              >
                CANCEL
              </button>
            </div>

            <form onSubmit={handleCreatePolicy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-mono font-bold mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. NextGen Perimeter Filter"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono font-bold mb-1">Version String</label>
                <input
                  type="text"
                  required
                  placeholder="3.0.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono font-bold mb-1">
                  Blocked Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono font-bold mb-1">
                  Regex Patterns (one per line)
                </label>
                <textarea
                  rows={3}
                  value={regex}
                  onChange={(e) => setRegex(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-slate-200 font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="canaryCheck"
                  checked={blockCanary}
                  onChange={(e) => setBlockCanary(e.target.checked)}
                  className="accent-indigo-500"
                />
                <label htmlFor="canaryCheck" className="text-slate-300 font-mono">
                  Block Canary Token Exfiltration (CANARY-*)
                </label>
              </div>

              {errorMsg && <div className="text-rose-400 font-mono text-[11px]">{errorMsg}</div>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold font-mono text-xs transition-colors"
              >
                Compile & Commit Immutable Version
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
