"""
Bayora Cryptographic Audit Hash Chain Engine
Provides deterministic canonical JSON serialization and SHA-256 hash chaining.
Independent verification logic guarantees tamper detection.
"""

import hashlib
import json
from typing import Any, Dict, List, Optional, Tuple

GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
HASH_ALGORITHM = "SHA-256"
CHAIN_SCHEMA_VERSION = "bayora-chain-v1"


def canonicalize_payload(payload: Dict[str, Any]) -> str:
    """
    Produce a deterministic, compact JSON string with sorted keys
    and no extraneous whitespace. Excludes the event's own 'event_hash'
    field if present to prevent circularity.
    """
    clean_dict = {k: v for k, v in payload.items() if k != "event_hash"}
    return json.dumps(clean_dict, sort_keys=True, separators=(",", ":"), ensure_ascii=True)


def compute_event_hash(prev_hash: str, canonical_payload: str) -> str:
    """
    Compute SHA-256 hash over prev_hash concatenated with canonical JSON.
    Format: SHA256(prev_hash || ":" || canonical_payload)
    """
    hasher = hashlib.sha256()
    content = f"{prev_hash}:{canonical_payload}".encode("utf-8")
    hasher.update(content)
    return hasher.hexdigest()


def verify_chain(events: List[Dict[str, Any]]) -> Tuple[bool, Optional[int], Optional[str]]:
    """
    Independently verify an audit event sequence.
    Returns:
        (is_valid, failing_seq, reason)
        If valid: (True, None, None)
        If invalid: (False, mismatch_seq, reason_str)
    """
    if not events:
        return True, None, None

    expected_prev = GENESIS_HASH

    for idx, event in enumerate(events):
        seq = event.get("seq", idx + 1)
        actual_prev = event.get("prev_hash")
        recorded_hash = event.get("event_hash")

        if actual_prev != expected_prev:
            return (
                False,
                seq,
                f"Previous hash broken at seq #{seq}: expected '{expected_prev}', found '{actual_prev}'",
            )

        canonical = canonicalize_payload(event)
        recalculated_hash = compute_event_hash(actual_prev, canonical)

        if recalculated_hash != recorded_hash:
            return (
                False,
                seq,
                f"Hash mismatch at seq #{seq}: recorded '{recorded_hash}', recalculated '{recalculated_hash}'",
            )

        expected_prev = recorded_hash

    return True, None, None
