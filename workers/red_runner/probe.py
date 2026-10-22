"""
Bayora Red Runner Boundary Probe Script
Runs inside the isolated Red container on 'red-net'.
Proves that the Red container cannot directly connect to:
- Blue policy workspace (blue-policy:8001) -> DENIED
- Target model runtime (target-model:8003) -> DENIED
And can connect only through the authorized Policy Gateway (gateway:8002) -> ALLOWED.
"""

import json
import os
import socket
import sys
import time

def probe_tcp(host: str, port: int, timeout: float = 1.0):
    start = time.perf_counter()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        sock.close()
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "ALLOW", "message": f"Connected to {host}:{port} in {elapsed}ms"}
    except Exception as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "DENY", "message": f"Blocked/Unreachable ({type(e).__name__}: {str(e)}) in {elapsed}ms"}
    finally:
        sock.close()

def main():
    print("=== BAYORA RED RUNNER ISOLATION PROBE MATRIX ===")
    
    # 1. Probe Blue Policy Workspace
    p1 = probe_tcp("blue-policy", 8001)
    print(f"[T1] Red -> Blue (blue-policy:8001): {p1['status']} — {p1['message']}")
    
    # 2. Probe Target Model Directly
    p2 = probe_tcp("target-model", 8003)
    print(f"[T3] Red -> Target Direct (target-model:8003): {p2['status']} — {p2['message']}")
    
    # 3. Probe Policy Gateway (Permitted Mediation Route)
    p3 = probe_tcp("gateway", 8002)
    print(f"[T4] Red -> Gateway (gateway:8002): {p3['status']} — {p3['message']}")
    
    # 4. Probe Cross-Workspace Volume Isolation
    blue_sentinel = "/workspace/blue/policy.yaml"
    if os.path.exists(blue_sentinel):
        p4 = {"status": "ALLOW", "message": f"CRITICAL LEAK: Accessed {blue_sentinel}"}
    else:
        p4 = {"status": "DENY", "message": f"Path {blue_sentinel} does not exist in Red runner"}
    print(f"[T5] Red -> Blue Volume: {p4['status']} — {p4['message']}")

    results = {
        "t1_red_to_blue": p1,
        "t3_red_to_target": p2,
        "t4_red_to_gateway": p3,
        "t5_volume_isolation": p4,
    }
    
    with open("/tmp/probe_output.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    main()
