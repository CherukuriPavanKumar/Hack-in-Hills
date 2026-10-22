import pytest
from apps.api.core.hash_chain import (
    GENESIS_HASH,
    canonicalize_payload,
    compute_event_hash,
    verify_chain,
)


def test_canonicalize_payload_sorting_and_exclusion():
    data = {
        "b": 2,
        "a": 1,
        "event_hash": "ignore_me",
        "nested": {"z": 10, "y": 20},
    }
    canonical = canonicalize_payload(data)
    # Must sort keys and exclude event_hash
    assert canonical == '{"a":1,"b":2,"nested":{"y":20,"z":10}}'
    assert "event_hash" not in canonical


def test_hash_chain_genesis_and_verification():
    events = []
    prev_hash = GENESIS_HASH

    for seq in range(1, 4):
        event_body = {
            "seq": seq,
            "run_id": "test-run-1",
            "event_type": f"EVENT_{seq}",
            "prev_hash": prev_hash,
            "metadata": {"test": seq},
        }
        canonical = canonicalize_payload(event_body)
        h = compute_event_hash(prev_hash, canonical)
        event_body["event_hash"] = h
        events.append(event_body)
        prev_hash = h

    # Chain should verify
    is_valid, failing_seq, reason = verify_chain(events)
    assert is_valid is True
    assert failing_seq is None


def test_tamper_detection_in_disposable_copy():
    events = []
    prev_hash = GENESIS_HASH

    for seq in range(1, 5):
        event_body = {
            "seq": seq,
            "run_id": "test-run-1",
            "event_type": f"EVENT_{seq}",
            "prev_hash": prev_hash,
            "metadata": {"status": "ok"},
        }
        canonical = canonicalize_payload(event_body)
        h = compute_event_hash(prev_hash, canonical)
        event_body["event_hash"] = h
        events.append(event_body)
        prev_hash = h

    # Make a disposable copy
    import copy
    tampered_copy = copy.deepcopy(events)
    # Modify an event's metadata at seq 2
    tampered_copy[1]["metadata"]["status"] = "tampered"

    is_valid, failing_seq, reason = verify_chain(tampered_copy)
    assert is_valid is False
    assert failing_seq == 2
    assert "Hash mismatch at seq #2" in reason
