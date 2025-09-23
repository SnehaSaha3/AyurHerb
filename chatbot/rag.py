import re
import pandas as pd
from geopy.geocoders import Nominatim
import google.generativeai as genai
from config import collection, GEMINI_AVAILABLE
from embeddings import embed_text
from typing import Union, Optional, Dict

# ---------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------

_geolocator = Nominatim(user_agent="krishi_ai", timeout=10)

def reverse_geocode_if_needed(loc: Union[str, dict, None]) -> Optional[str]:
    """
    Return precise farming-relevant location: village/hamlet > town/district > state.
    """
    if not loc:
        return None

    if isinstance(loc, str):
        return loc.strip()

    if isinstance(loc, dict):
        lat = loc.get("lat")
        lng = loc.get("lng")
        if lat is not None and lng is not None:
            try:
                result = _geolocator.reverse(
                    (lat, lng),
                    language="en",
                    exactly_one=True,
                    addressdetails=True
                )
                if result and result.raw.get("address"):
                    comp = result.raw["address"]
                    # Prioritize village-scale precision
                    parts_priority = [
                        comp.get("hamlet"),
                        comp.get("village"),
                        comp.get("locality"),
                        comp.get("suburb"),
                        comp.get("town"),
                        comp.get("county"),
                        comp.get("state_district"),
                        comp.get("state"),
                    ]
                    parts = [p for p in parts_priority if p]
                    if parts:
                        farm_area = parts[0]
                        nearby = parts[1] if len(parts) > 1 else ""
                        return f"{farm_area}{', ' + nearby if nearby else ''}"
                    return result.address
            except Exception as e:
                print(f"[reverse_geocode] error for {lat},{lng}: {e}")
            return f"{lat:.2f}, {lng:.2f} (nearby farm area in Assam)"
    return None

# ---------------------------------------------------------------------
# Prompt builder (concise bullet points)
# ---------------------------------------------------------------------
def build_prompt(question: str, context_text: str = "", intent: str = "general") -> str:
    """
    Builds a prompt that forces concise, 2-3 line, personalised answers.
    """
    task = (
        "Answer in 2-3 lines only. Focus entirely on the specific farm location "
        "and its conditions (weather, rainfall, humidity, soil, irrigation). "
        "Provide practical advice and avoid generic statements."
    )
    if intent == "fertiliser":
        task += " Include type, dosage, and timing if relevant."

    return f"""
You are Krishi-AI, a trusted agricultural advisor.

**IMPORTANT:** Give concise, personalised answers in 2-3 lines. Do not use bullets.

Context (farm details):
{context_text or "—"}

Question:
{question}

{task}
"""





# ---------------------------------------------------------------------
# Retrieval + generation
# ---------------------------------------------------------------------

def query_rag(question: str, top_k: int = 5, context: Optional[Dict] = None) -> str:
    """
    Retrieves relevant documents, adds location/weather/soil context, and generates a concise answer.
    """
    # 1. RAG retrieval
    q_embed = embed_text(question)
    results = collection.query(
        query_embeddings=[q_embed],
        n_results=top_k,
        include=["documents", "distances"]
    )

    docs = results.get("documents", [[]])[0]
    scores = results.get("distances", [[]])[0] if "distances" in results else []
    threshold = 0.35
    context_docs = [d for d, s in zip(docs, scores) if s <= threshold]
    context_text = "\n".join(context_docs) if context_docs else ""

    # 2. Attach farm/location info
    if context:
        loc_name = reverse_geocode_if_needed(context.get("location"))
        weather = context.get("weather")
        soil = context.get("soil")
        irrigation = context.get("irrigation")

        if loc_name:
            context_text += f"\nFarm Location: {loc_name} (specific farming region)"
        if weather:
            context_text += f"\nWeather: {weather}"
        if soil:
            context_text += f"\nSoil: {soil}"
        if irrigation:
            context_text += f"\nIrrigation: {irrigation}"

    # 3. Determine intent
    intent = "fertiliser" if any(
        k in question.lower() for k in ["fertiliser", "fertilizer", "urea", "dap", "npk"]
    ) else "general"

    # 4. Build concise prompt
    prompt = build_prompt(question, context_text, intent)

    # 5. Generate answer
    if not GEMINI_AVAILABLE:
        return context_text or "Gemini not available."

    print("PROMPT SENT TO GEMINI:\n", prompt)
    resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
    return getattr(resp, "text", None) or "Gemini returned no answer."

# ---------------------------------------------------------------------
# Crop recommendation (dynamic, location-specific)
# ---------------------------------------------------------------------

def recommend_crop(location: Union[str, dict], satellite_data: Optional[dict] = None) -> str:
    """
    Returns a concise, 2-3 line, personalised crop recommendation based on location and conditions.
    """
    loc_name = reverse_geocode_if_needed(location) or "your region"
    sat_summary = ", ".join(f"{k}: {v}" for k, v in (satellite_data or {}).items())
    context_text = f"Farm Location: {loc_name}"
    if sat_summary:
        context_text += f"\nWeather/Soil/Irrigation: {sat_summary}"

    prompt = build_prompt(
        f"Which crops should farmers in {loc_name} grow and how? Include local varieties, intercropping, and practical tips.",
        context_text
    )

    if not GEMINI_AVAILABLE:
        return f"Based on {loc_name} and its conditions ({sat_summary}), select crops suitable for local climate and soil."

    resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
    return getattr(resp, "text", None) or f"Based on {loc_name} and its conditions ({sat_summary}), select crops suitable for local climate and soil."
