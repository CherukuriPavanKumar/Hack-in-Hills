export type Role = "operator" | "blue_team" | "red_team" | "auditor";

const envObj =
  typeof import.meta !== "undefined" && import.meta.env
    ? (import.meta.env as Record<string, string | undefined>)
    : {};
const API_BASE = envObj["VITE_API_BASE_URL"] || envObj["VITE_API_URL"] || "/api";

let currentRole: Role = "operator";
const tokenCache: Record<string, { token: string; exp: number }> = {};

export async function getSessionToken(role: Role = currentRole): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const cached = tokenCache[role];
  if (cached && cached.exp > now + 60) {
    return cached.token;
  }
  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    throw new Error(`Failed to acquire token for role ${role}`);
  }
  const data = (await res.json()) as { access_token: string; expires_at: number };
  tokenCache[role] = { token: data.access_token, exp: data.expires_at };
  return data.access_token;
}

async function authHeaders(role?: Role): Promise<HeadersInit> {
  const activeRole = role || currentRole;
  try {
    const token = await getSessionToken(activeRole);
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Bayora-Role": activeRole,
    };
  } catch {
    return {
      "Content-Type": "application/json",
      "X-Bayora-Role": activeRole,
    };
  }
}

export interface HealthResponse {
  status: string;
  service?: string;
  version?: string;
  timestamp?: string;
}

export interface ZoneItem {
  id: string;
  name: string;
  description: string;
  network?: string;
  egress_policy?: string;
}

export interface RouteItem {
  id: string;
  source: string;
  target: string;
  allowed: boolean;
  port?: number;
  reason?: string;
}

export interface TopologyResponse {
  zones: ZoneItem[];
  routes: RouteItem[];
}

export interface ScoreSummary {
  total_cases?: number;
  passed?: number;
  failed?: number;
  inconclusive?: number;
  blocked_by_gateway?: number;
  pass_rate_pct?: number;
  avg_latency_ms?: number;
  p50_latency_ms?: number;
  p95_latency_ms?: number;
  isolation_verified?: boolean;
  clean_context_verified?: boolean;
  chain_integrity?: string;
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  description: string;
  is_mock: boolean;
  available: boolean;
}

export interface TestCaseResult {
  id: string;
  case_id: string;
  category: string;
  prompt: string;
  prompt_hash: string;
  gateway_decision: "ALLOW" | "DENY";
  gateway_reason?: string;
  model_response?: string;
  response_hash?: string;
  verdict: "PASS" | "FAIL" | "BLOCKED_BY_GATEWAY" | "INCONCLUSIVE";
  rationale_code?: string;
  latency_ms: number;
  executed_at: string;
  provider?: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  finish_reason?: string | null;
  is_mock?: boolean;
  error_category?: string | null;
}

export type TestCaseResponse = TestCaseResult;

export interface BoundaryProbeResponse {
  id: string;
  probe_name: string;
  source_zone: string;
  destination: string;
  expected: string;
  observed: string;
  verdict: string;
  evidence_ref?: string;
  executed_at: string;
}

export interface ProbesExecuteResponse {
  run_at?: string;
  probes: BoundaryProbeResponse[];
  invariants_satisfied?: boolean;
}

export interface RunResponse {
  id: string;
  status: string;
  provider?: string;
  suite_id: string;
  suite_version: string;
  suite_hash: string;
  model_id: string;
  model_version: string;
  policy_id: string;
  policy_version: string;
  policy_hash: string;
  evaluator_version: string;
  config_hash: string;
  request_budget: number;
  timeout_ms: number;
  clean_context_enforced: boolean;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  error_reason?: string;
  score_summary: ScoreSummary;
  test_cases: TestCaseResult[];
  probes: BoundaryProbeResponse[];
}

export interface AuditEventResponse {
  id: string;
  seq: number;
  event_type: string;
  created_at: string;
  timestamp?: string;
  actor: string;
  payload: Record<string, unknown>;
  metadata_json?: Record<string, unknown>;
  prev_hash: string;
  hash: string;
  event_hash?: string;
}

export interface VerifyResponse {
  run_id: string;
  is_valid: boolean;
  total_events: number;
  head_hash?: string;
  failing_seq?: number | null;
  reason?: string | null;
  verified_at?: string;
}

export interface TamperDrillResponse {
  run_id: string;
  original_valid: boolean;
  tampered_seq: number;
  tampered_valid: boolean;
  original_event_hash: string;
  tampered_event_hash: string;
  detected_at_seq: number;
  detection_reason: string;
  explanation?: string;
}

export interface PolicyResponse {
  id: string;
  name: string;
  version: string;
  policy_hash: string;
  rules_json: Record<string, unknown>;
  created_by?: string;
  created_at: string;
}

export interface VerdictChangeItem {
  case_id: string;
  category: string;
  run_a_verdict: string;
  run_b_verdict: string;
  changed: boolean;
  run_a_gateway_decision?: string;
  run_b_gateway_decision?: string;
}

export interface RunDiffResponse {
  run_a_id: string;
  run_b_id: string;
  run_a_policy: string;
  run_b_policy: string;
  run_a_model: string;
  run_b_model: string;
  run_a_summary: ScoreSummary;
  run_b_summary: ScoreSummary;
  verdict_changes: VerdictChangeItem[];
  latency_comparison: {
    run_a_p50_ms: number;
    run_b_p50_ms: number;
    run_a_p95_ms: number;
    run_b_p95_ms: number;
  };
}

export const api = {
  setRole(role: Role) {
    currentRole = role;
  },

  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    if (!res.ok) throw new Error("Health check failed");
    return (await res.json()) as HealthResponse;
  },

  async getTopology(): Promise<TopologyResponse> {
    const res = await fetch(`${API_BASE}/topology`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch topology");
    return (await res.json()) as TopologyResponse;
  },

  async getRuns(): Promise<RunResponse[]> {
    const res = await fetch(`${API_BASE}/runs`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch runs");
    return (await res.json()) as RunResponse[];
  },

  async getRun(runId: string): Promise<RunResponse> {
    const res = await fetch(`${API_BASE}/runs/${runId}`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Failed to fetch run ${runId}`);
    return (await res.json()) as RunResponse;
  },

  async getModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${API_BASE}/models`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch models");
    return (await res.json()) as ModelInfo[];
  },

  async createRun(payload: {
    suite_id: string;
    suite_version: string;
    model_id: string;
    model_version: string;
    policy_id: string;
    policy_version: string;
    provider?: string;
    temperature?: number;
    max_tokens?: number;
    request_budget?: number;
    timeout_ms?: number;
  }): Promise<RunResponse> {
    const res = await fetch(`${API_BASE}/runs`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err =
        ((await res.json().catch(() => ({}))) as Record<string, string | undefined>) || {};
      throw new Error(err["detail"] || "Failed to create run");
    }
    return (await res.json()) as RunResponse;
  },

  async startRun(runId: string): Promise<RunResponse> {
    const res = await fetch(`${API_BASE}/runs/${runId}/start`, {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) {
      const err =
        ((await res.json().catch(() => ({}))) as Record<string, string | undefined>) || {};
      throw new Error(err["detail"] || "Failed to start run");
    }
    return (await res.json()) as RunResponse;
  },

  async getRunEvents(runId: string): Promise<{ events: AuditEventResponse[] }> {
    const res = await fetch(`${API_BASE}/runs/${runId}/events`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch events");
    const raw = (await res.json()) as Record<string, unknown> | Array<Record<string, unknown>>;
    const rawList: Array<Record<string, unknown>> = Array.isArray(raw)
      ? raw
      : (raw["events"] as Array<Record<string, unknown>>) || [];
    const normalized: AuditEventResponse[] = rawList.map((e, idx) => ({
      id: (e["id"] as string) || `ev-${(e["seq"] as number) || idx + 1}`,
      seq: (e["seq"] as number) ?? idx + 1,
      event_type: (e["event_type"] as string) || "UNKNOWN",
      created_at:
        (e["created_at"] as string) || (e["timestamp"] as string) || new Date().toISOString(),
      timestamp: (e["timestamp"] as string) || (e["created_at"] as string),
      actor: (e["actor"] as string) || "system",
      payload:
        (e["payload"] as Record<string, unknown>) ||
        (e["metadata_json"] as Record<string, unknown>) ||
        {},
      metadata_json:
        (e["metadata_json"] as Record<string, unknown>) ||
        (e["payload"] as Record<string, unknown>) ||
        {},
      prev_hash: (e["prev_hash"] as string) || "",
      hash: (e["hash"] as string) || (e["event_hash"] as string) || "",
      event_hash: (e["event_hash"] as string) || (e["hash"] as string) || "",
    }));
    return { events: normalized };
  },

  async verifyRunChain(runId: string): Promise<VerifyResponse> {
    const res = await fetch(`${API_BASE}/runs/${runId}/verify`, {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to verify chain");
    return (await res.json()) as VerifyResponse;
  },

  async tamperDrill(runId: string, tamperSeq: number = 2): Promise<TamperDrillResponse> {
    const res = await fetch(`${API_BASE}/runs/${runId}/tamper-drill?tamper_seq=${tamperSeq}`, {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to run tamper drill");
    const json = (await res.json()) as TamperDrillResponse;
    if (!json.explanation) {
      json.explanation = `Tamper detected: Mutated event seq #${json.tampered_seq} hash mismatch.`;
    }
    return json;
  },

  async getRunReport(runId: string, format: "markdown" | "json"): Promise<string> {
    const res = await fetch(`${API_BASE}/runs/${runId}/report?format=${format}`, {
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch report");
    return res.text();
  },

  async getPolicies(): Promise<PolicyResponse[]> {
    const res = await fetch(`${API_BASE}/policies`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch policies");
    return (await res.json()) as PolicyResponse[];
  },

  async createPolicy(payload: {
    name: string;
    version: string;
    rules_json: Record<string, unknown>;
    created_by?: string;
  }): Promise<PolicyResponse> {
    const res = await fetch(`${API_BASE}/policies`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err =
        ((await res.json().catch(() => ({}))) as Record<string, string | undefined>) || {};
      throw new Error(err["detail"] || "Failed to create policy");
    }
    return (await res.json()) as PolicyResponse;
  },

  async executeProbes(): Promise<ProbesExecuteResponse> {
    const res = await fetch(`${API_BASE}/probes/execute`, {
      method: "POST",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error("Failed to execute probes");
    const data = (await res.json()) as unknown;
    if (Array.isArray(data)) {
      return {
        run_at: new Date().toISOString(),
        probes: data as BoundaryProbeResponse[],
        invariants_satisfied: (data as Array<Record<string, unknown>>).every(
          (p) => p["verdict"] === "PASS",
        ),
      };
    }
    return data as ProbesExecuteResponse;
  },

  async compareRuns(runAId: string, runBId: string): Promise<RunDiffResponse> {
    const res = await fetch(`${API_BASE}/diff?run_a_id=${runAId}&run_b_id=${runBId}`, {
      headers: await authHeaders(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch diff");
    return (await res.json()) as RunDiffResponse;
  },
};
