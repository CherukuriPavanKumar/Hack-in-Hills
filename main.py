"""
Vercel deployment entrypoint for the Bayora Control Plane FastAPI service.
Re-exports the FastAPI app from apps.api.main.
"""

from apps.api.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
