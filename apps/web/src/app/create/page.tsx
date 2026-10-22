"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Play, Lock, AlertCircle, Info, Sparkles, CheckCircle2 } from "lucide-react";
import { createRun, startRun, fetchPolicies, PolicyVersion } from "@/lib/api";
import { useRole } from "@/lib/RoleContext";

export default function CreateRunPage() {
  const { role: currentRole } = useRole();
  const router = useRouter();
  const [suiteId, setSuiteId] = useState("bayora-adv-safety-v1");
  const [modelId, setModelId] = useState("mock-deterministic-v1");
  const [policyId, setPolicyId] = useState("baseline-guard-v1.0");
  const [requestBudget, setRequestBudget] = useState(20);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [policies, setPolicies] = useState<PolicyVersion[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPolicies() {
      try {
        const pList = await fetchPolicies(currentRole);
        setPolicies(pList);
      } catch (err) {
        console.error("Failed to load policies:", err);
      }
    }
    loadPolicies();
  }, [currentRole]);

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLaunching(true);
    setErrorMsg(null);

    try {
      // 1. Create run
      const run = await createRun(
        {
          suite_id: suiteId,
          model_id: modelId,
          policy_id: policyId,
          request_budget: requestBudget,
          timeout_ms: timeoutMs,
        },
        currentRole
      );

      // 2. Trigger lifecycle start
      await startRun(run.id);

      // 3. Navigate to Live View
      router.push(`/live?run_id=${run.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize run");
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
          <h1 className="text-2xl font-extrabold text-white tracking-wide">
            Create Isolated Adversarial Run
          </h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Configure benchmark suite, target model profile, defensive policies, and resource bounds. Configuration will be cryptographically frozen upon submission.
        </p>
      </div>

      <form onSubmit={handleLaunch} className="space-y-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl space-y-6 backdrop-blur-sm">
          
          {/* Suite Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-2">
              1. Benchmark Suite
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  suiteId === "bayora-adv-safety-v1"
                    ? "border-cyan-500 bg-cyan-950/20 glow-cyan"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Bayora Core Safety v1</span>
                  <input
                    type="radio"
                    name="suite"
                    value="bayora-adv-safety-v1"
                    checked={suiteId === "bayora-adv-safety-v1"}
                    onChange={() => setSuiteId("bayora-adv-safety-v1")}
                    className="accent-cyan-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  8 standardized test cases: Direct prompt injection, hypothetical persona jailbreak, canary probe, SQL embedding, system prompt exfiltration & benign controls.
                </p>
                <div className="mt-3 text-[11px] font-mono text-cyan-400">
                  Fixed SHA-256 Digest: a3f7491b...
                </div>
              </label>

              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  suiteId === "owasp-llm-top10-bench"
                    ? "border-cyan-500 bg-cyan-950/20 glow-cyan"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">OWASP LLM Top 10 Bench</span>
                  <input
                    type="radio"
                    name="suite"
                    value="owasp-llm-top10-bench"
                    checked={suiteId === "owasp-llm-top10-bench"}
                    onChange={() => setSuiteId("owasp-llm-top10-bench")}
                    className="accent-cyan-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Focused adversarial suite aligned to OWASP LLM 01-04 (Prompt Injection, Insecure Output Handling, Sensitive Info Disclosure).
                </p>
                <div className="mt-3 text-[11px] font-mono text-cyan-400">
                  Fixed SHA-256 Digest: d8e14f2a...
                </div>
              </label>
            </div>
          </div>

          {/* Model Profile Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-2">
              2. Target Model Profile
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  modelId === "mock-deterministic-v1"
                    ? "border-emerald-500 bg-emerald-950/20"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Mock Deterministic v1</span>
                  <input
                    type="radio"
                    name="model"
                    value="mock-deterministic-v1"
                    checked={modelId === "mock-deterministic-v1"}
                    onChange={() => setModelId("mock-deterministic-v1")}
                    className="accent-emerald-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Standard robust target adapter. Highly reproducible, zero external API keys needed, simulated ~50ms latency.
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  RECOMMENDED FOR EVALUATION
                </span>
              </label>

              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  modelId === "mock-adversarial-weak-v1"
                    ? "border-rose-500 bg-rose-950/20"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Mock Weak / Gullible v1</span>
                  <input
                    type="radio"
                    name="model"
                    value="mock-adversarial-weak-v1"
                    checked={modelId === "mock-adversarial-weak-v1"}
                    onChange={() => setModelId("mock-adversarial-weak-v1")}
                    className="accent-rose-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Simulates a vulnerable base model. Ideal for proving how Blue Team Gateway policies intercept exploits when the model is gullible.
                </p>
                <span className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  DEMONSTRATES POLICY EFFECTIVENESS
                </span>
              </label>
            </div>
          </div>

          {/* Defense Policy Selector */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-bold mb-2">
              3. Blue Team Defense Policy
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  policyId === "baseline-guard-v1.0"
                    ? "border-indigo-500 bg-indigo-950/20"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Baseline Guard v1.0</span>
                  <input
                    type="radio"
                    name="policy"
                    value="baseline-guard-v1.0"
                    checked={policyId === "baseline-guard-v1.0"}
                    onChange={() => setPolicyId("baseline-guard-v1.0")}
                    className="accent-indigo-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Keyword allow-lists, length boundaries, and direct prompt override filters.
                </p>
              </label>

              <label
                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                  policyId === "hardened-strict-v2.1"
                    ? "border-indigo-500 bg-indigo-950/20"
                    : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-200">Hardened Strict v2.1</span>
                  <input
                    type="radio"
                    name="policy"
                    value="hardened-strict-v2.1"
                    checked={policyId === "hardened-strict-v2.1"}
                    onChange={() => setPolicyId("hardened-strict-v2.1")}
                    className="accent-indigo-500"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Advanced multi-stage regex, delimiter sanitization, canary exfiltration blocking & SQL pattern shielding.
                </p>
              </label>
            </div>
          </div>

          {/* Resource & Request Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-mono text-slate-300 font-bold mb-1">
                Max Request Budget (Per Run)
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={requestBudget}
                onChange={(e) => setRequestBudget(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">Gateway enforces budget limits</span>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-300 font-bold mb-1">
                Gateway Timeout (ms)
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                step="500"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-500">Aborts long-running hangs safely</span>
            </div>
          </div>

          {/* Enforced Clean Context Security Callout */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex items-start space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-300 uppercase font-mono tracking-wide">
                Clean Context Requirement: Enforced by Backend
              </span>
              <p className="text-slate-300 mt-1 leading-relaxed">
                Every launch allocates an ephemeral session ID (<code className="font-mono text-emerald-400">sess_run_*</code>) with empty conversation history. No prior prompts, canary tokens, or cross-run scratch data can be inherited.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLaunching}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-sm shadow-xl transition-all glow-cyan flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{isLaunching ? "Provisioning Isolated Environment & Starting Probes..." : "Launch Isolated Evaluation Run"}</span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
