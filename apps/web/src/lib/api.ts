import type { BayoraRole } from "./bayora/types";

/**
 * Resolves the base API URL for Bayora Control Plane requests:
 * 1. Runtime Server-Side (Vercel Functions / SSR in Node.js):
 *    Uses the injected service binding environment variable `process.env.API_URL` (or `BACKEND_URL`).
 * 2. Runtime Client-Side (Browser):
 *    Uses same-origin `/api` to route via Vercel's top-level rewrites (`/api/(.*)` -> `app`),
 *    or the Vite dev reverse proxy.
 */
export function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
    const boundUrl =
      (typeof process !== "undefined" &&
        (process.env?.API_URL || process.env?.BACKEND_URL || process.env?.APP_URL)) ||
      "";
    if (boundUrl) {
      const cleanBound = boundUrl.replace(/\/+$/, "");
      return `${cleanBound}/api`;
    }
  }

  if (typeof window !== "undefined") {
    if (window.location.port === "8000") {
      return "http://localhost:8000/api";
    }
    const envUrl = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"];
    if (envUrl && (window.location.hostname === "localhost" || !envUrl.includes("localhost"))) {
      return envUrl.replace(/\/+$/, "");
    }
    return "/api";
  }

  const fallback = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"];
  if (fallback && !fallback.includes("localhost")) {
    return fallback.replace(/\/+$/, "");
  }
  return "/api";
}

export function resolveApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (base.startsWith("http://") || base.startsWith("https://")) {
    if (base.endsWith("/api") && cleanPath.startsWith("/api/")) {
      return `${base}${cleanPath.slice(4)}`;
    }
    return `${base}${cleanPath}`;
  }
  if (base === "/api" && cleanPath.startsWith("/api/")) {
    return cleanPath;
  }
  return `${base}${cleanPath}`;
}

export const API_BASE = "/api";


function getStoredRole(): BayoraRole {
  if (typeof window === "undefined") return "operator";
  const saved = localStorage.getItem("bayora_active_role");
  if (saved && ["operator", "red_team", "blue_team", "auditor"].includes(saved)) {
    return saved as BayoraRole;
  }
  return "operator";
}

// Token cache per role to avoid repeated /auth/token handshakes
const tokenCache: Partial<Record<BayoraRole, { token: string; exp: number }>> = {};

export async function getAuthToken(role: BayoraRole): Promise<string | null> {
  const cached = tokenCache[role];
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) {
    return cached.token;
  }

  try {
    const res = await fetch(resolveApiUrl("/auth/token"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      const data = await res.json();
      const token = data.access_token as string;
      const exp = (data.expires_at as number) || now + 86400;
      tokenCache[role] = { token, exp };
      return token;
    }
  } catch (err) {
    console.warn("Could not fetch auth token from backend /auth/token:", err);
  }
  return null;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  customRole?: BayoraRole,
): Promise<T> {
  const role = customRole || getStoredRole();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("X-Bayora-Role", role);

  // Attach signed authorization token unless calling /auth/token
  if (!path.includes("/auth/token")) {
    const token = await getAuthToken(role);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = resolveApiUrl(path);
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail =
          typeof errJson.detail === "string" ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // not json
    }
    throw new Error(errorDetail);
  }

  return response.json() as Promise<T>;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  in_docker?: boolean;
}

export interface TopologyZone {
  id: string;
  name: string;
  network: string;
  description: string;
  color: string;
}

export interface TopologyRoute {
  source: string;
  target: string;
  permission: "DENIED" | "ALLOWED";
  port: number;
}

export interface TopologyResponse {
  zones: TopologyZone[];
  routes: TopologyRoute[];
}

export interface TestCaseResponse {
  id: string;
  case_id: string;
  category: string;
  prompt: string;
  prompt_hash: string;
  gateway_decision: "ALLOW" | "DENY" | "TIMEOUT";
  gateway_reason: string | null;
  model_response: string | null;
  response_hash: string | null;
  verdict: "PASS" | "FAIL" | "INCONCLUSIVE";
  rationale_code: string | null;
  latency_ms: number;
  executed_at: string;
}

export interface BoundaryProbeResponse {
  id: string;
  probe_name: string;
  source_zone: string;
  destination: string;
  expected: "DENY" | "ALLOW";
  observed: "DENY" | "ALLOW";
  verdict: "PASS" | "FAIL";
  evidence_ref: string;
  executed_at: string;
}

export interface RunScoreSummary {
  total_cases?: number;
  passed_cases?: number;
  failed_cases?: number;
  blocked_by_gateway?: number;
  pass_rate_pct?: number;
  avg_latency_ms?: number;
  [key: string]: unknown;
}

export interface RunResponse {
  id: string;
  status:
    | "VALIDATING"
    | "PROVISIONING"
    | "ISOLATION_CHECK"
    | "RUNNING"
    | "EVALUATING"
    | "VERIFYING"
    | "COMPLETED"
    | "FAILED"
    | "ISOLATION_FAILED";
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
  started_at: string | null;
  ended_at: string | null;
  error_reason: string | null;
  score_summary: RunScoreSummary;
  test_cases: TestCaseResponse[];
  probes: BoundaryProbeResponse[];
}

export interface RunCreateRequest {
  suite_id?: string;
  suite_version?: string;
  model_id?: string;
  model_version?: string;
  policy_id?: string;
  policy_version?: string;
  request_budget?: number;
  timeout_ms?: number;
}

export interface AuditEventResponse {
  id: string;
  run_id: string;
  seq: number;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
}

export interface RunEventsResponse {
  run_id: string;
  events: AuditEventResponse[];
}

export interface VerifyResponse {
  run_id: string;
  is_valid: boolean;
  total_events: number;
  mismatch_seq: number | null;
  reason: string | null;
  verified_at: string;
}

export interface TamperDrillResponse {
  run_id: string;
  tampered: boolean;
  original_valid: boolean;
  tampered_valid: boolean;
  tampered_seq: number;
  mismatch_seq: number;
  original_event_hash: string;
  tampered_event_hash: string;
  expected_next_prev_hash: string;
  explanation: string;
}

export interface PolicyRules {
  max_prompt_length?: number;
  block_canary_tokens?: boolean;
  blocked_keywords?: string[];
  regex_patterns?: string[];
  redacted?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export interface PolicyResponse {
  id: string;
  name: string;
  version: string;
  rules_json: PolicyRules;
  created_by: string;
  created_at: string;
  policy_hash: string;
}

export interface PolicyCreateRequest {
  name: string;
  version: string;
  rules_json: Record<string, unknown>;
  created_by?: string;
}

export interface RunDiffResponse {
  run_a_id: string;
  run_b_id: string;
  run_a_policy: string;
  run_b_policy: string;
  run_a_model: string;
  run_b_model: string;
  run_a_summary: Record<string, unknown>;
  run_b_summary: Record<string, unknown>;
  verdict_changes: Array<{
    case_id?: string;
    category?: string;
    run_a_verdict?: string;
    run_b_verdict?: string;
    direction?: string;
    [key: string]: unknown;
  }>;
  latency_comparison: Record<string, unknown>;
}

export interface ProbesExecuteResponse {
  run_at?: string;
  probes: BoundaryProbeResponse[];
  invariants_satisfied?: boolean;
  [key: string]: unknown;
}

function normalizeEvent(e: Record<string, unknown>): AuditEventResponse {
  return {
    id: String(e["id"] || `ev_${e["seq"] || ""}`),
    run_id: String(e["run_id"] || ""),
    seq: Number(e["seq"] || 0),
    event_type: String(e["event_type"] || ""),
    created_at: String(e["created_at"] || e["timestamp"] || new Date().toISOString()),
    payload: (e["payload"] || e["metadata_json"] || {}) as Record<string, unknown>,
    prev_hash: String(e["prev_hash"] || ""),
    hash: String(e["hash"] || e["event_hash"] || ""),
  };
}

// API client methods
export const api = {
  getHealth: (role?: BayoraRole) => request<HealthResponse>("/health", {}, role),

  getTopology: (role?: BayoraRole) => request<TopologyResponse>("/topology", {}, role),

  getRuns: (role?: BayoraRole) => request<RunResponse[]>("/runs", {}, role),

  getRun: (runId: string, role?: BayoraRole) => request<RunResponse>(`/runs/${runId}`, {}, role),

  createRun: (data: RunCreateRequest, role?: BayoraRole) =>
    request<RunResponse>(
      "/runs",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      role,
    ),

  startRun: (runId: string, role?: BayoraRole) =>
    request<RunResponse>(
      `/runs/${runId}/start`,
      {
        method: "POST",
      },
      role,
    ),

  getRunEvents: async (runId: string, role?: BayoraRole): Promise<RunEventsResponse> => {
    const raw = await request<unknown>(`/runs/${runId}/events`, {}, role);
    let eventList: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) {
      eventList = raw as Record<string, unknown>[];
    } else if (
      raw &&
      typeof raw === "object" &&
      "events" in raw &&
      Array.isArray((raw as Record<string, unknown>)["events"])
    ) {
      eventList = (raw as Record<string, unknown>)["events"] as Record<string, unknown>[];
    }
    return {
      run_id: runId,
      events: eventList.map(normalizeEvent),
    };
  },

  verifyRunChain: (runId: string, role?: BayoraRole) =>
    request<VerifyResponse>(
      `/runs/${runId}/verify`,
      {
        method: "POST",
      },
      role,
    ),

  tamperDrill: (runId: string, tamperSeq: number = 2, role?: BayoraRole) =>
    request<TamperDrillResponse>(
      `/runs/${runId}/tamper-drill?tamper_seq=${tamperSeq}`,
      {
        method: "POST",
      },
      role,
    ),

  getRunReport: async (
    runId: string,
    format: "json" | "markdown" = "markdown",
    role?: BayoraRole,
  ): Promise<string> => {
    const activeRole = role || getStoredRole();
    const headers: Record<string, string> = {
      Accept: format === "json" ? "application/json" : "text/markdown",
      "X-Bayora-Role": activeRole,
    };
    const token = await getAuthToken(activeRole);
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const url = resolveApiUrl(`/runs/${runId}/report?format=${format}`);
    const res = await fetch(url, { headers });
    if (!res.ok) {
      throw new Error(`Failed to fetch report (${res.status})`);
    }
    return res.text();
  },

  getPolicies: (role?: BayoraRole) => request<PolicyResponse[]>("/policies", {}, role),

  createPolicy: (data: PolicyCreateRequest, role?: BayoraRole) =>
    request<PolicyResponse>(
      "/policies",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      role,
    ),

  executeProbes: async (role?: BayoraRole): Promise<ProbesExecuteResponse> => {
    const raw = await request<unknown>("/probes/execute", { method: "POST" }, role);
    let probeList: BoundaryProbeResponse[] = [];
    if (Array.isArray(raw)) {
      probeList = raw as BoundaryProbeResponse[];
    } else if (
      raw &&
      typeof raw === "object" &&
      "probes" in raw &&
      Array.isArray((raw as Record<string, unknown>)["probes"])
    ) {
      probeList = (raw as Record<string, unknown>)["probes"] as BoundaryProbeResponse[];
    }
    const allPassed = probeList.every((p) => p.verdict === "PASS");
    return {
      run_at: new Date().toISOString(),
      probes: probeList,
      invariants_satisfied: allPassed,
    };
  },

  compareRuns: (runAId: string, runBId: string, role?: BayoraRole) =>
    request<RunDiffResponse>(
      `/diff?run_a_id=${encodeURIComponent(runAId)}&run_b_id=${encodeURIComponent(runBId)}`,
      {},
      role,
    ),
};
