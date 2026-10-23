/**
 * SHA-256 hash chain for the Bayora audit ledger.
 * Pure functions over standard WebCrypto — usable in any runtime.
 */
import type { AuditEvent } from "./types";

const GENESIS = "0".repeat(64);

export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Deterministic JSON so the same payload always hashes to the same value. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJson(v)).join(",") + "]";
  }
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
  return "{" + entries.map(([k, v]) => JSON.stringify(k) + ":" + canonicalJson(v)).join(",") + "}";
}

export interface EventHashInput {
  seq: number;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown>;
  prev_hash: string;
}

export async function computeEventHash(input: EventHashInput): Promise<string> {
  const material = [
    input.prev_hash,
    String(input.seq),
    input.event_type,
    input.created_at,
    canonicalJson(input.payload),
  ].join("|");
  return sha256Hex(material);
}

export interface ChainIssue {
  seq: number | null;
  reason: string;
}

/**
 * Walk the chain: sequence numbers must be contiguous, each event must point at
 * the previous event's hash, and each event's hash must match a recomputation
 * from its own content.
 */
export async function verifyChain(events: AuditEvent[]): Promise<{
  valid: boolean;
  issue: ChainIssue | null;
  headHash: string | null;
}> {
  const sorted = [...events].sort((a, b) => a.seq - b.seq);
  if (sorted.length === 0) {
    return { valid: true, issue: null, headHash: null };
  }
  let prevHash = GENESIS;
  for (let i = 0; i < sorted.length; i++) {
    const event = sorted[i]!;
    if (event.seq !== i + 1) {
      return {
        valid: false,
        issue: { seq: event.seq, reason: "Event sequence numbers are not contiguous" },
        headHash: null,
      };
    }
    if (event.prev_hash !== prevHash) {
      return {
        valid: false,
        issue: {
          seq: event.seq,
          reason: "Event does not link to the previous event's hash",
        },
        headHash: null,
      };
    }
    const recomputed = await computeEventHash(event);
    if (recomputed !== event.hash) {
      return {
        valid: false,
        issue: {
          seq: event.seq,
          reason: "Event content no longer matches its recorded SHA-256 hash",
        },
        headHash: null,
      };
    }
    prevHash = event.hash;
  }
  return { valid: true, issue: null, headHash: prevHash };
}

/** The exact material a SHA-256 event hash is computed over (for display). */
export function eventHashMaterial(event: AuditEvent): string {
  return [
    event.prev_hash,
    String(event.seq),
    event.event_type,
    event.created_at,
    canonicalJson(event.payload),
  ].join("|");
}

export { GENESIS };
