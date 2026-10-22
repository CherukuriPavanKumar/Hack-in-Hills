"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, AlertCircle } from "lucide-react";
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

      await startRun(run.id);
      router.push(`/live?run_id=${run.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to initialize run");
      setIsLaunching(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b border-edge pb-4">
        <h1 className="text-xl font-bold text-label-primary tracking-tight">
          Initialize Evaluation Run
        </h1>
        <p className="text-xs text-label-secondary mt-1">
          Select target configuration and bounds. Parameters are cryptographically frozen into the audit ledger on creation.
        </p>
      </div>

      <form onSubmit={handleLaunch} className="space-y-5">
        <div className="bg-surface border border-edge rounded-lg p-5 space-y-5">
          
          {/* Suite Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-label-muted uppercase tracking-wider mb-2">
              1. Benchmark Suite
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  suiteId === "bayora-adv-safety-v1"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">Bayora Core Safety v1</span>
                  <input
                    type="radio"
                    name="suite"
                    value="bayora-adv-safety-v1"
                    checked={suiteId === "bayora-adv-safety-v1"}
                    onChange={() => setSuiteId("bayora-adv-safety-v1")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  8 cases: Prompt injection, roleplay jailbreak, canary leak, SQL embedding & benign controls.
                </p>
              </label>

              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  suiteId === "owasp-llm-top10-bench"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">OWASP LLM Top 10 Bench</span>
                  <input
                    type="radio"
                    name="suite"
                    value="owasp-llm-top10-bench"
                    checked={suiteId === "owasp-llm-top10-bench"}
                    onChange={() => setSuiteId("owasp-llm-top10-bench")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  Targeted checks covering OWASP LLM 01-04 (Injections, Insecure Output & Info Disclosure).
                </p>
              </label>
            </div>
          </div>

          {/* Model Profile Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-label-muted uppercase tracking-wider mb-2">
              2. Target Model Profile
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  modelId === "mock-deterministic-v1"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">Deterministic Target v1</span>
                  <input
                    type="radio"
                    name="model"
                    value="mock-deterministic-v1"
                    checked={modelId === "mock-deterministic-v1"}
                    onChange={() => setModelId("mock-deterministic-v1")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  Reproducible test target with simulated ~50ms latency. No external credentials required.
                </p>
              </label>

              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  modelId === "mock-adversarial-weak-v1"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">Vulnerable Mock v1</span>
                  <input
                    type="radio"
                    name="model"
                    value="mock-adversarial-weak-v1"
                    checked={modelId === "mock-adversarial-weak-v1"}
                    onChange={() => setModelId("mock-adversarial-weak-v1")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  Simulates an unprotected model to verify Blue gateway interception effectiveness.
                </p>
              </label>
            </div>
          </div>

          {/* Blue Policy Selector */}
          <div>
            <label className="block text-xs font-mono font-medium text-label-muted uppercase tracking-wider mb-2">
              3. Defense Policy
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  policyId === "baseline-guard-v1.0"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">Baseline Guard v1.0</span>
                  <input
                    type="radio"
                    name="policy"
                    value="baseline-guard-v1.0"
                    checked={policyId === "baseline-guard-v1.0"}
                    onChange={() => setPolicyId("baseline-guard-v1.0")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  Keyword allow-lists, length boundaries, and direct prompt override filters.
                </p>
              </label>

              <label
                className={`border rounded p-3.5 cursor-pointer transition-colors ${
                  policyId === "hardened-strict-v2.1"
                    ? "border-signal-blue bg-canvas"
                    : "border-edge bg-canvas/40 hover:border-edge-hover"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-label-primary">Hardened Strict v2.1</span>
                  <input
                    type="radio"
                    name="policy"
                    value="hardened-strict-v2.1"
                    checked={policyId === "hardened-strict-v2.1"}
                    onChange={() => setPolicyId("hardened-strict-v2.1")}
                    className="accent-signal-blue"
                  />
                </div>
                <p className="text-xs text-label-muted mt-1 leading-relaxed">
                  Regex shields, canary exfiltration blocking, and SQL query interception.
                </p>
              </label>
            </div>
          </div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-edge-subtle">
            <div>
              <label className="block text-xs font-mono text-label-secondary mb-1">
                Request Budget Limit
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={requestBudget}
                onChange={(e) => setRequestBudget(Number(e.target.value))}
                className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-xs font-mono text-label-primary focus:border-signal-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-label-secondary mb-1">
                Gateway Timeout (ms)
              </label>
              <input
                type="number"
                min="500"
                max="10000"
                step="500"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
                className="w-full bg-canvas border border-edge rounded px-3 py-1.5 text-xs font-mono text-label-primary focus:border-signal-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Clean Context Enforcement Notice */}
          <div className="p-3 rounded bg-canvas border border-edge flex items-start space-x-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-signal-emerald flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-medium text-label-primary font-mono">Clean Context Guarantee</span>
              <p className="text-label-muted mt-0.5 leading-relaxed">
                A fresh session ID (<code className="font-mono text-label-secondary">sess_run_*</code>) is provisioned with zero prior conversation history or memory tokens.
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded bg-signal-rose/10 border border-signal-rose/30 text-xs text-signal-rose flex items-center space-x-2 font-mono">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLaunching}
              className="w-full py-2.5 px-4 rounded bg-signal-blue hover:bg-blue-600 text-white font-medium text-xs font-mono transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isLaunching ? "Provisioning Environment..." : "Start Evaluation"}</span>
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
