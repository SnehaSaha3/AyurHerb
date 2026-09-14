import os

from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is missing. Add it to chatbot/.env"
    )

client = Groq(api_key=GROQ_API_KEY)

GROQ_MODEL = "openai/gpt-oss-120b"