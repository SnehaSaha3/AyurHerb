import logging
import os
from typing import Any

from fastapi import FastAPI
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent import AyurMateAgent


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ayurmate")


DEFAULT_ORIGINS = [
    "https://ayurherb-i3oe.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]


def load_allowed_origins() -> list[str]:
    configured = [
        origin.strip().rstrip("/")
        for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
        if origin.strip()
    ]
    return list(dict.fromkeys(DEFAULT_ORIGINS + configured))


app = FastAPI(
    title="AyurMate Agent",
    description="Context-aware agricultural decision agent",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=load_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


agent = AyurMateAgent()


@app.get("/")
async def root():
    return {
        "service": "AyurMate",
        "type": "agricultural-agent",
        "model": "openai/gpt-oss-120b",
        "status": "running",
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "agent": "AyurMate",
    }


@app.post("/query")
async def query(payload: dict[str, Any]):
    question = str(payload.get("question", "")).strip()

    if not question:
        return JSONResponse(
            status_code=400,
            content={"error": "Question is required."},
        )

    farmer = payload.get("farmer", {})

    if not isinstance(farmer, dict):
        farmer = {}

    try:
        return await run_in_threadpool(
            agent.run,
            farmer=farmer,
            question=question,
        )
    except Exception:
        logger.exception("AyurMate agent failed")
        return JSONResponse(
            status_code=500,
            content={"error": "AyurMate could not answer right now. Please try again."},
        )