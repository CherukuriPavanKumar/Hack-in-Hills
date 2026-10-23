import type { AuditEvent } from "./types";

export const GENESIS = "0000000000000000000000000000000000000000000000000000000000000000";

function canonicalize(val: unknown): string {
  if (val === null || typeof val !== "object") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    return "[" + val.map(canonicalize).join(",") + "]";
  }
  const keys = Object.keys(val as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + canonicalize((val as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

async function sha256(content: string): Promise<string> {
  const enc = new TextEncoder().encode(content);
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const hashBuf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback for node environment if crypto.subtle is unavailable
  const { createHash } = await import("crypto");
  return createHash("sha256").update(content).digest("hex");
}

export async function computeEventHash(event: {
  seq?: number;
  event_type?: string;
  created_at?: string;
  payload: Record<string, unknown>;
  prev_hash: string;
}): Promise<string> {
  const payloadJson = canonicalize(event.payload);
  const content = `${event.prev_hash}:${payloadJson}`;
  return sha256(content);
}

export interface VerificationResult {
  valid: boolean;
  headHash: string | null;
  issue: { seq: number; reason: string } | null;
}

export async function verifyChain(events: AuditEvent[]): Promise<VerificationResult> {
  if (events.length === 0) {
    return { valid: true, headHash: null, issue: null };
  }

  let expectedPrev = GENESIS;

  for (let i = 0; i < events.length; i++) {
    const ev = events[i]!;
    const seq = ev.seq ?? i + 1;

    if (ev.prev_hash !== expectedPrev) {
      return {
        valid: false,
        headHash: null,
        issue: {
          seq,
          reason: `Previous hash broken at seq #${seq}: expected '${expectedPrev}', found '${ev.prev_hash}'`,
        },
      };
    }

    const recomputed = await computeEventHash({
      seq: ev.seq,
      event_type: ev.event_type,
      created_at: ev.created_at,
      payload: ev.payload,
      prev_hash: ev.prev_hash,
    });

    if (ev.hash && ev.hash !== recomputed) {
      return {
        valid: false,
        headHash: null,
        issue: {
          seq,
          reason: `Event at seq #${seq} no longer matches its recorded SHA-256 hash (expected '${recomputed}', found '${ev.hash}')`,
        },
      };
    }

    expectedPrev = ev.hash || recomputed;
  }

  const lastEvent = events[events.length - 1]!;
  return {
    valid: true,
    headHash: lastEvent.hash || expectedPrev,
    issue: null,
  };
}
