# server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rag import query_rag, recommend_crop

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/query")
async def query_endpoint(payload: dict):
    question = payload.get("question", "")
    context = payload.get("context", {})  # receive farm context: { location, weather }

    if not question:
        return {"error": "Question is required"}

    answer = query_rag(question, context=context)
    return {"answer": answer}


@app.post("/recommend")
async def recommend_endpoint(payload: dict):
    location = payload.get("location", "")
    satellite_data = payload.get("satellite_data", {})

    if not location:
        return {"error": "Location is required"}

    answer = recommend_crop(location, satellite_data)
    return {"answer": answer}


@app.get("/")
def root():
    return {"message": "AyurMate Chatbot Backend Running!"}
