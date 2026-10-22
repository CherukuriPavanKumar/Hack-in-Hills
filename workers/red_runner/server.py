from __future__ import annotations

import os
import socket
import time
from typing import Any, Dict
from fastapi import FastAPI

app = FastAPI(title="Bayora Red Runner Worker", version="1.0.0")


def probe_tcp(host: str, port: int, timeout: float = 1.0) -> Dict[str, Any]:
    """Test raw TCP socket connectivity from inside red-runner container."""
    start = time.perf_counter()
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(timeout)
    try:
        sock.connect((host, port))
        sock.close()
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "ALLOW",
            "message": f"TCP connection established to {host}:{port} in {elapsed}ms",
            "latency_ms": elapsed,
        }
    except socket.timeout:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "DENY",
            "message": f"Connection timed out ({timeout}s) attempting {host}:{port}",
            "latency_ms": elapsed,
        }
    except ConnectionRefusedError:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "DENY",
            "message": f"Connection refused by destination {host}:{port} (RST returned)",
            "latency_ms": elapsed,
        }
    except socket.gaierror as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "DENY",
            "message": f"DNS/Network isolation: Name lookup failed for '{host}' ({str(e)}) in {elapsed}ms",
            "latency_ms": elapsed,
        }
    except Exception as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "status": "DENY",
            "message": f"Network unreachable/blocked for {host}:{port}: {type(e).__name__} ({str(e)})",
            "latency_ms": elapsed,
        }
    finally:
        sock.close()


@app.get("/health")
def health():
    return {"status": "healthy", "service": "red-runner", "zone": "RED_WORKSPACE"}


@app.get("/probes")
@app.post("/probes")
def execute_in_container_probes():
    """
    Execute empirical socket probes directly from the untrusted Red container on 'red-net'.
    """
    # 1. Red -> Blue (Expected: DENY)
    p_blue = probe_tcp("blue-policy", 8001, timeout=0.8)

    # 2. Red -> Target Model Directly (Expected: DENY)
    p_target = probe_tcp("target-model", 8003, timeout=0.8)

    # 3. Red -> Policy Gateway (Expected: ALLOW)
    p_gateway = probe_tcp("gateway", 8002, timeout=1.2)

    # 4. Cross-workspace volume probe
    blue_sentinel = "/workspace/blue/confidential_policy.yaml"
    if os.path.exists(blue_sentinel):
        p_volume = {
            "status": "ALLOW",
            "message": f"CRITICAL LEAK: Accessed blue volume path {blue_sentinel} from Red container!",
        }
    else:
        p_volume = {
            "status": "DENY",
            "message": f"Filesystem check verified: Path {blue_sentinel} does not exist in Red container. Workspace volumes strictly partitioned.",
        }

    return {
        "red_to_blue": p_blue,
        "red_to_target": p_target,
        "red_to_gateway": p_gateway,
        "volume_isolation": p_volume,
    }
