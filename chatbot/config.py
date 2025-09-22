import os
from dotenv import load_dotenv
import chromadb
import google.generativeai as genai

# Load env vars
load_dotenv()

# Gemini setup
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    GEMINI_AVAILABLE = True
else:
    print("⚠️ GEMINI_API_KEY not found. Only context retrieval will work.")
    GEMINI_AVAILABLE = False

# ChromaDB setup
chroma_client = chromadb.PersistentClient(path="vector_db")
collection = chroma_client.get_or_create_collection("farming_docs")
