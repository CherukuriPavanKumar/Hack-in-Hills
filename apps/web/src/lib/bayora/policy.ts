import { sha256Hex } from "./chain";
import type { PolicyConfig } from "./types";

export interface PolicyMatch {
  decision: "block" | "allow";
  reason: string | null;
}

function escapeRegex(pattern: string): string {
  return pattern;
}

/**
 * Evaluate a prompt against a defensive policy. The gateway runs this before
 * anything reaches the model.
 */
export function evaluatePolicy(prompt: string, policy: PolicyConfig): PolicyMatch {
  const lower = prompt.toLowerCase();
  for (const keyword of policy.blocked_keywords) {
    if (lower.includes(keyword.toLowerCase())) {
      return {
        decision: "block",
        reason: `Blocked keyword: "${keyword}"`,
      };
    }
  }
  for (const pattern of policy.regex_patterns) {
    try {
      const cleanPattern = pattern.replace(/^\(\?i\)/, "");
      if (new RegExp(cleanPattern, "i").test(prompt)) {
        return { decision: "block", reason: `Blocked pattern: /${escapeRegex(pattern)}/i` };
      }
    } catch {
      // invalid pattern recorded by blue team — skip rather than crash the gateway
    }
  }
  if (policy.canary_filtering && /CANARY[-_:]/i.test(prompt)) {
    return {
      decision: "block",
      reason: "Canary marker detected — possible pasted context; filtered by gateway",
    };
  }
  if (prompt.length > policy.max_prompt_length) {
    return {
      decision: "block",
      reason: `Prompt exceeds maximum length (${prompt.length} > ${policy.max_prompt_length} characters)`,
    };
  }
  return { decision: "allow", reason: null };
}

/** Stable fingerprint over the full policy configuration. */
export async function policyFingerprint(
  config: Omit<PolicyConfig, "fingerprint">,
): Promise<string> {
  const material = [
    config.name,
    config.version,
    String(config.blocked_keywords.length),
    String(config.regex_patterns.length),
    String(config.canary_filtering),
    String(config.max_prompt_length),
    config.blocked_keywords.slice().sort().join("\u0001"),
    config.regex_patterns.slice().sort().join("\u0001"),
  ].join("|");
  return sha256Hex(material);
}

export function redactPolicy<T extends { blocked_keywords: unknown; regex_patterns: unknown }>(
  policy: T,
  includeInternals: boolean,
): T & { blocked_keywords: unknown; regex_patterns: unknown } {
  if (includeInternals) return policy;
  return {
    ...policy,
    blocked_keywords: null,
    regex_patterns: null,
  };
}
