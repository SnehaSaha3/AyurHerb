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
    if not loc:
        return None

    if isinstance(loc, str):
        return loc.strip()

    if isinstance(loc, dict):
        lat = loc.get("lat")
        lng = loc.get("lng")
        if lat is not None and lng is not None:
            try:
                result = _geolocator.reverse((lat, lng), language="en", exactly_one=True)
                if result and result.raw.get("address"):
                    comp = result.raw["address"]
                    parts = [
                        comp.get("hamlet"),
                        comp.get("village"),
                        comp.get("suburb"),
                        comp.get("town"),
                        comp.get("city"),
                        comp.get("county"),
                        comp.get("state_district"),
                        comp.get("state")
                    ]
                    parts = [p for p in parts if p]
                    if parts:
                        return ", ".join(parts)
                    return result.address
            except Exception as e:
                print(f"[reverse_geocode] error for {lat},{lng}: {e}")
            # fallback
            return f"{lat:.2f}, {lng:.2f} (Assam)"

    return None

# ---------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------

def build_prompt(question: str, context_text: str = "", intent: str = "general") -> str:
    task = "Answer the farmer's question clearly in 2-3 lines."
    if intent == "fertiliser":
        task += " Suggest an appropriate fertiliser with dosage/timing if relevant."

    return f"""
You are Krishi-AI, a trusted agricultural advisor.

If reliable context is provided below, use it.
If no context is given, rely on your agronomic knowledge plus the location/weather/soil info.
Always give a clear practical tip — never just say 'consult an officer'.

Context:
{context_text or "—"}

Question:
{question}

{task}
"""

# ---------------------------------------------------------------------
# Retrieval + generation
# ---------------------------------------------------------------------

def query_rag(question: str, top_k: int = 5, context: Optional[Dict] = None) -> str:
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

    # Attach farm info
    if context:
        loc_name = reverse_geocode_if_needed(context.get("location"))
        weather = context.get("weather")
        soil = context.get("soil")
        irrigation = context.get("irrigation")
        if loc_name:
            context_text += f"\nFarm Location: {loc_name}"
        if weather:
            context_text += f"\nWeather: {weather}"
        if soil:
            context_text += f"\nSoil: {soil}"
        if irrigation:
            context_text += f"\nIrrigation: {irrigation}"

    intent = "fertiliser" if any(k in question.lower() for k in ["fertiliser", "fertilizer", "urea", "dap", "npk"]) else "general"

    prompt = build_prompt(question, context_text, intent)

    if not GEMINI_AVAILABLE:
        return context_text or "Gemini not available."

    print("PROMPT SENT TO GEMINI:\n", prompt)
    resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
    return getattr(resp, "text", None) or "Gemini returned no answer."

# ---------------------------------------------------------------------
# Crop ranking
# ---------------------------------------------------------------------

def rank_crops(location, top_k: int = 5):
    loc_name = reverse_geocode_if_needed(location) or "your region"
    q_embed = embed_text(f"Crops grown in {loc_name}")
    results = collection.query(query_embeddings=[q_embed], n_results=50)
    docs = results.get("documents", [[]])[0]
    if not docs:
        return None, "No historical data found."

    pairs = []
    for doc in docs:
        match = re.search(r"Yield[: ]\s*([0-9.]+)", doc)
        val = float(match.group(1)) if match else None
        if val is None:
            nums = re.findall(r"([0-9.]+)", doc)
            if nums:
                val = float(nums[-1])
        if val is None:
            continue
        crop_match = re.search(r"crop\s+([A-Za-z ]+)", doc, re.I)
        crop = crop_match.group(1).strip() if crop_match else "Unknown"
        pairs.append((crop, val))

    if not pairs:
        return None, "Could not extract yield data."

    df = pd.DataFrame(pairs, columns=["Crop", "Yield"])
    avg = df.groupby("Crop")["Yield"].mean().sort_values(ascending=False)
    return avg.head(top_k), None

# ---------------------------------------------------------------------
# Crop recommendation
# ---------------------------------------------------------------------

def recommend_crop(location, satellite_data: Optional[dict] = None, top_k: int = 5) -> str:
    loc_name = reverse_geocode_if_needed(location) or "your region"
    crops, err = rank_crops(location, top_k)

    sat_summary = ", ".join(f"{k}: {v}" for k, v in (satellite_data or {}).items())

    if err:
        # If no retrieval data, still provide a fallback actionable answer
        if GEMINI_AVAILABLE:
            prompt = build_prompt(
                f"Which variety of rice should farmers in {loc_name} sow?",
                f"Weather/Satellite/Soil info: {sat_summary}"
            )
            resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
            return getattr(resp, "text", None) or (
                f"Based on {sat_summary or 'the climate'} in {loc_name}, "
                "short-duration flood-tolerant rice such as Swarna Sub1 or Ranjit Sub1 is recommended. "
                "Plant in raised beds or bunds to prevent waterlogging. "
                "Use 120 kg N/ha split in 3 doses and maintain 20–25 cm spacing."
            )

        return (
            f"Based on {sat_summary or 'the climate'} in {loc_name}, "
            "short-duration flood-tolerant rice such as Swarna Sub1 or Ranjit Sub1 is recommended. "
            "Plant in raised beds or bunds to prevent waterlogging. "
            "Use 120 kg N/ha split in 3 doses and maintain 20–25 cm spacing."
        )

    # Retrieval succeeded
    ctx = f"Historical yields:\n{crops.to_string()}"
    if sat_summary:
        ctx += f"\nSatellite: {sat_summary}"

    if not GEMINI_AVAILABLE:
        return f"Top crops in {loc_name} (avg yield):\n{crops.to_string()}"

    prompt = build_prompt(
        f"Which 2-3 crops should farmers in {loc_name} grow and why?",
        ctx
    )
    resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
    return getattr(resp, "text", None) or (
        f"Based on your location ({loc_name}) and conditions ({sat_summary}), "
        "short-duration flood-tolerant rice such as Swarna Sub1 or Ranjit Sub1 is recommended. "
        "Maintain proper spacing and fertiliser as per soil type."
    )
