from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from agent import AyurMateAgent


app = FastAPI(
    title="AyurMate Agent",
    description="Context-aware agricultural decision agent",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
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
async def query(
    payload: dict[str, Any]
):

    question = str(
        payload.get("question", "")
    ).strip()

    if not question:
        return {
            "error": "Question is required."
        }

    farmer = payload.get(
        "farmer",
        {}
    )

    if not isinstance(farmer, dict):
        farmer = {}

    result = agent.run(
        farmer=farmer,
        question=question,
    )

    return result