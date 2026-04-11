import os
import asyncio
from fastapi import FastAPI, Request, HTTPException
from local_worker import process_project
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
SECRET = os.getenv("WORKER_WEBHOOK_SECRET", "")


@app.post("/run")
async def run(request: Request):
    if SECRET and request.headers.get("x-webhook-secret") != SECRET:
        raise HTTPException(403, "Forbidden")
    body = await request.json()
    project_id = body.get("project_id")
    if not project_id:
        raise HTTPException(400, "Missing project_id")
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, process_project, project_id)
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}
