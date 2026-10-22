from __future__ import annotations

import socket
import time
from typing import Any, Dict
from fastapi import FastAPI

app = FastAPI(title="Bayora Blue Policy Workspace", version="1.0.0")


def probe_tcp(host: str, port: int, timeout: float = 1.0) -> Dict[str, Any]:
    """Test raw TCP socket connectivity from inside blue-policy container."""
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
    return {"status": "healthy", "service": "blue-policy-workspace", "zone": "BLUE_WORKSPACE"}


@app.get("/probes")
@app.post("/probes")
def execute_blue_probes():
    """
    Execute socket probes directly from the Blue container on 'blue-net'.
    Verifies that Blue cannot reach Red runner or direct target model.
    """
    # 1. Blue -> Red (Expected: DENY)
    p_red = probe_tcp("red-runner", 8004, timeout=0.8)

    # 2. Blue -> Target Model Directly (Expected: DENY)
    p_target = probe_tcp("target-model", 8003, timeout=0.8)

    return {
        "blue_to_red": p_red,
        "blue_to_target": p_target,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
