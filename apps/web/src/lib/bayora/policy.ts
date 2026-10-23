import type { PolicyConfig } from "./types";

export interface PolicyEvaluationResult {
  decision: "allow" | "block";
  reason: string | null;
}

export function evaluatePolicy(prompt: string, policy: PolicyConfig): PolicyEvaluationResult {
  if (policy.max_prompt_length && prompt.length > policy.max_prompt_length) {
    return {
      decision: "block",
      reason: `Prompt exceeds maximum allowed length of ${policy.max_prompt_length}`,
    };
  }

  if (policy.canary_filtering && /CANARY-[A-Za-z0-9_-]+/i.test(prompt)) {
    return {
      decision: "block",
      reason: "Canary marker detected in prompt payload",
    };
  }

  if (policy.blocked_keywords) {
    const lowerPrompt = prompt.toLowerCase();
    for (const kw of policy.blocked_keywords) {
      if (lowerPrompt.includes(kw.toLowerCase())) {
        return {
          decision: "block",
          reason: `Blocked keyword matched: '${kw}'`,
        };
      }
    }
  }

  if (policy.regex_patterns) {
    for (const pattern of policy.regex_patterns) {
      try {
        let cleanPat = pattern;
        let flags = "";
        if (cleanPat.startsWith("(?i)")) {
          cleanPat = cleanPat.substring(4);
          flags = "i";
        }
        const regex = new RegExp(cleanPat, flags);
        if (regex.test(prompt)) {
          return {
            decision: "block",
            reason: `Blocked pattern matched: '${pattern}'`,
          };
        }
      } catch {
        // Fallback for non-standard regex
        if (prompt.includes(pattern)) {
          return {
            decision: "block",
            reason: `Blocked pattern matched: '${pattern}'`,
          };
        }
      }
    }
  }

  return {
    decision: "allow",
    reason: null,
  };
}

export function redactPolicy(policy: PolicyConfig, canSeeInternals: boolean): PolicyConfig {
  if (!canSeeInternals) {
    return {
      ...policy,
      blocked_keywords: null,
      regex_patterns: null,
    };
  }
  return { ...policy };
}

export function policyFingerprint(policy: PolicyConfig): string {
  if (policy.fingerprint) return policy.fingerprint;
  const raw = `${policy.name}:${policy.version}:${(policy.blocked_keywords || []).join(",")}`;
  return raw;
}
