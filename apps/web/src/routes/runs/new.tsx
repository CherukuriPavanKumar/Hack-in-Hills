import React, { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Play,
  Shield,
  Cpu,
  Layers,
  Settings,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Clock,
  Zap,
} from "lucide-react";
import { api, type PolicyResponse } from "../../lib/api";
import { useRole } from "../../lib/role-context";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Slider } from "../../components/ui/slider";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/runs/new")({
  component: NewRunWizard,
});

const SUITES = [
  {
    id: "bayora-adv-safety-v1",
    name: "Bayora Adversarial Safety v1",
    version: "1.0.0",
    description:
      "A mixed adversarial safety suite covering prompt injection, persona jailbreaks (DAN/developer mode), credential probes, and canary token extraction, interleaved with benign baselines.",
    casesCount: 8,
    badge: "Recommended",
  },
  {
    id: "owasp-llm-top10-bench",
    name: "OWASP Top 10 for LLMs Benchmark",
    version: "1.0.0",
    description:
      "Targeted vulnerability checks mapped to the OWASP LLM Top 10: prompt injection (LLM01), sensitive information disclosure (LLM06), and insecure output handling.",
    casesCount: 10,
    badge: "Industry Standard",
  },
];

const MODELS = [
  {
    id: "mock-deterministic-v1",
    name: "Deterministic Baseline Model",
    version: "v1",
    description:
      "A standard baseline target model that complies with benign requests but lacks inherent prompt-injection guardrails. Perfect for validating policy gateway mediation efficacy.",
    behavior: "Refuses obvious attacks, complies with mixed instructions",
  },
  {
    id: "mock-adversarial-weak-v1",
    name: "Adversarial Weak Model Profile",
    version: "v1",
    description:
      "Simulates an unguarded model highly susceptible to jailbreaks, instruction overrides, and roleplay bypasses. Validates that the policy gateway acts as a hard defense line.",
    behavior: "Readily adopts DAN / developer personas if not blocked by gateway",
  },
];

function NewRunWizard() {
  const navigate = useNavigate();
  const { role, canCreateRun } = useRole();

  const [policies, setPolicies] = useState<PolicyResponse[]>([]);
  const [loadingPolicies, setLoadingPolicies] = useState(true);

  // Form state
  const [suiteId, setSuiteId] = useState("bayora-adv-safety-v1");
  const [modelId, setModelId] = useState("mock-deterministic-v1");
  const [policyId, setPolicyId] = useState("baseline-guard-v1.0");
  const [requestBudget, setRequestBudget] = useState(20);
  const [timeoutMs, setTimeoutMs] = useState(5000);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  useEffect(() => {
    async function load() {
      try {
        setLoadingPolicies(true);
        const data = await api.getPolicies();
        setPolicies(data || []);
        if (data && data.length > 0 && !data.some((p) => p.id === policyId)) {
          setPolicyId(data[0]?.id || "");
        }
      } catch (err) {
        console.error("Failed to load policies:", err);
      } finally {
        setLoadingPolicies(false);
      }
    }
    load();
  }, []);

  const selectedSuite = SUITES.find((s) => s.id === suiteId) ?? SUITES[0]!;
  const selectedModel = MODELS.find((m) => m.id === modelId) ?? MODELS[0]!;
  const selectedPolicy = policies.find((p) => p.id === policyId) || {
    id: policyId,
    name: policyId,
    version: "1.0.0",
    policy_hash: "hash",
  };

  const handleLaunch = async () => {
    if (!canCreateRun) {
      toast.error(`Your active role (${role}) does not have permission to launch evaluation runs.`);
      return;
    }

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      toast.info("Creating evaluation with frozen configuration...");

      // 1. Create run
      const created = await api.createRun({
        suite_id: suiteId,
        suite_version: selectedSuite.version,
        model_id: modelId,
        model_version: selectedModel.version,
        policy_id: policyId,
        policy_version: selectedPolicy.version,
        request_budget: requestBudget,
        timeout_ms: timeoutMs,
      });

      toast.success(`Run created: ${created.id}`);

      // 2. Start lifecycle
      toast.info("Starting evaluation lifecycle (Isolation Check -> Running)...");
      await api.startRun(created.id);

      // 3. Navigate to details
      navigate({
        to: "/runs/$runId",
        params: { runId: created.id },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create run";
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Play className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Create Security Evaluation
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure an isolated test session against target AI models with defensive policy gateway
          mediation.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
        {[
          { num: 1, label: "Benchmark Suite" },
          { num: 2, label: "Target Model" },
          { num: 3, label: "Defensive Policy" },
          { num: 4, label: "Budget & Review" },
        ].map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setStep(s.num as 1 | 2 | 3 | 4)}
            className="flex items-center gap-2 text-xs font-medium cursor-pointer"
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                step === s.num
                  ? "bg-indigo-600 text-white"
                  : step > s.num
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </span>
            <span
              className={`hidden sm:inline ${
                step === s.num ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500"
              }`}
            >
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Step 1: Benchmark Suite */}
      {step === 1 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              Step 1: Choose Adversarial Benchmark Suite
            </CardTitle>
            <CardDescription className="text-xs">
              Select the attack patterns and benchmark tests to execute against the target AI.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SUITES.map((s) => (
                <div
                  key={s.id}
                  onClick={() => setSuiteId(s.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    suiteId === s.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {s.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-indigo-50 text-indigo-600">
                      {s.badge}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{s.description}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{s.casesCount} test templates</span>
                    <span>Version {s.version}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep(2)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next: Choose Target Model <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Target Model */}
      {step === 2 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-500" />
              Step 2: Choose Target Model Profile
            </CardTitle>
            <CardDescription className="text-xs">
              Select the model endpoint to evaluate. Direct access to this model is blocked by
              network isolation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODELS.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setModelId(m.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    modelId === m.id
                      ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {m.name}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {m.id}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed mb-3">{m.description}</p>
                  <div className="text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
                    <strong>Simulated Behavior:</strong> {m.behavior}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next: Defensive Policy <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Defensive Policy */}
      {step === 3 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Step 3: Select Defensive Policy Gateway Rules
            </CardTitle>
            <CardDescription className="text-xs">
              The Policy Gateway enforces these rules before any prompt is forwarded to the model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingPolicies ? (
              <div className="p-8 text-center text-slate-500">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                Loading published policies...
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policies.map((p) => {
                  const isRedacted = p.rules_json?.redacted === true;
                  const kwCount = p.rules_json?.blocked_keywords?.length || 0;
                  const regCount = p.rules_json?.regex_patterns?.length || 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setPolicyId(p.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        policyId === p.id
                          ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-xs ring-2 ring-indigo-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {p.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          v{p.version}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500 font-mono mb-2 truncate">
                        ID: {p.id}
                      </div>

                      {isRedacted ? (
                        <div className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2 rounded-md">
                          🔒 <em>Internals redacted for Red Team role</em>
                        </div>
                      ) : (
                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                          <div>• {kwCount} blocked keywords configured</div>
                          <div>• {regCount} compiled regex patterns</div>
                          <div>
                            • Max prompt length: {p.rules_json?.max_prompt_length || 4000} chars
                          </div>
                        </div>
                      )}

                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-400 truncate">
                        SHA-256: {p.policy_hash}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={() => setStep(4)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Next: Budget & Review <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Budget & Review */}
      {step === 4 && (
        <Card className="border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              Step 4: Request Budget & Pre-Flight Review
            </CardTitle>
            <CardDescription className="text-xs">
              Configure execution constraints and review the immutable configuration parameters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Request Budget (1–50)
                  </Label>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {requestBudget} requests
                  </span>
                </div>
                <Slider
                  min={1}
                  max={50}
                  step={1}
                  value={[requestBudget]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (typeof v === "number") setRequestBudget(v);
                  }}
                />
                <p className="text-[11px] text-slate-500">
                  Maximum test calls permitted before the gateway forcibly closes the evaluation
                  session.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Gateway Timeout (500–10,000 ms)
                  </Label>
                  <span className="font-mono text-xs font-bold text-indigo-600">
                    {timeoutMs} ms
                  </span>
                </div>
                <Slider
                  min={500}
                  max={10000}
                  step={500}
                  value={[timeoutMs]}
                  onValueChange={(val) => {
                    const v = val[0];
                    if (typeof v === "number") setTimeoutMs(v);
                  }}
                />
                <p className="text-[11px] text-slate-500">
                  Max time the policy gateway will wait for a model response before issuing TIMEOUT.
                </p>
              </div>
            </div>

            {/* Pre-flight Review Summary */}
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Pre-Flight Configuration Fingerprint
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Benchmark Suite</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedSuite.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Target Model</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedModel.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Defensive Policy</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                    {selectedPolicy.id}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Clean Context Session</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Enforced
                  </span>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 border-t border-slate-100 dark:border-slate-800">
                🔒 <strong>Cryptographic Ledger:</strong> On submission, this run will record an
                immutable genesis hash, execute live socket isolation probes (T1–T5), and write all
                test decisions to an append-only SHA-256 chain.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(3)} disabled={isSubmitting}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 shadow-md shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    Launching Evaluation...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1 fill-white" />
                    Launch Evaluation Run
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
