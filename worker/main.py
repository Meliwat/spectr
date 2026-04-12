import os
from fastapi import BackgroundTasks, FastAPI, Request, HTTPException
from local_worker import get_project_logs, process_project
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
SECRET = os.getenv("WORKER_WEBHOOK_SECRET", "")


@app.post("/run")
async def run(request: Request, background_tasks: BackgroundTasks):
    if SECRET and request.headers.get("x-webhook-secret") != SECRET:
        raise HTTPException(403, "Forbidden")
    body = await request.json()
    project_id = body.get("project_id")
    if not project_id:
        raise HTTPException(400, "Missing project_id")
    background_tasks.add_task(process_project, project_id)
    return {"ok": True}


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/logs/{project_id}")
def logs(project_id: str, request: Request):
    if SECRET and request.headers.get("x-webhook-secret") != SECRET:
        raise HTTPException(403, "Forbidden")
    return {"lines": get_project_logs(project_id)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8001)), reload=False)
