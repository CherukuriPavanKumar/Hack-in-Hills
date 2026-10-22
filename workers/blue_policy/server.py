"""
Bayora Blue Policy Workspace Service
Runs inside the isolated Blue container on 'blue-net' (port 8001).
Only reachable by the control plane API. Denies direct connections from Red runner.
"""

from fastapi import FastAPI

app = FastAPI(title="Bayora Blue Policy Workspace", version="1.0.0")

@app.get("/health")
def health():
    return {"status": "healthy", "service": "blue-policy-workspace", "zone": "BLUE_WORKSPACE"}

@app.get("/probe")
def probe():
    return {"status": "ok", "message": "Blue policy internal endpoint"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
