import hashlib
import json
from typing import Any, Dict

DEFAULT_POLICIES: Dict[str, Dict[str, Any]] = {
    "baseline-guard-v1.0": {
        "id": "baseline-guard-v1.0",
        "name": "Baseline Guard Policy",
        "version": "1.0.0",
        "created_by": "blue_team",
        "rules_json": {
            "max_prompt_length": 3000,
            "block_canary_tokens": True,
            "blocked_keywords": [
                "ignore all previous instructions",
                "system_bypass_success",
                "drop table",
                "select * from",
                "exfiltrate private",
                "repeat the verbatim system prompt",
            ],
            "regex_patterns": [
                r"(?i)ignore\s+(all\s+)?previous\s+instructions",
                r"(?i)system_bypass_success",
                r"(?i)drop\s+table",
            ],
        },
    },
    "hardened-strict-v2.1": {
        "id": "hardened-strict-v2.1",
        "name": "Hardened Strict Defense Policy",
        "version": "2.1.0",
        "created_by": "blue_team",
        "rules_json": {
            "max_prompt_length": 2048,
            "block_canary_tokens": True,
            "blocked_keywords": [
                "ignore all previous instructions",
                "system_bypass_success",
                "drop table",
                "select * from",
                "exfiltrate private",
                "repeat the verbatim system prompt",
                "admin_key",
                "fictional world",
                "postgresql://",
                "secret_alpha",
            ],
            "regex_patterns": [
                r"(?i)ignore\s+(all\s+)?(prior|previous)\s+instructions",
                r"(?i)system_bypass_success",
                r"(?i)drop\s+table",
                r"(?i)select\s+\*\s+from",
                r"(?i)fictional\s+world\s+without\s+ethics",
                r"(?i)repeat\s+(the\s+)?verbatim\s+system\s+prompt",
                r"(?i)admin_key",
            ],
        },
    },
}


def compute_policy_hash(rules_json: Dict[str, Any]) -> str:
    serialized = json.dumps(rules_json, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()
