import os
import random
from dotenv import load_dotenv
from groq import Groq

from schemas import CropReportRequest, CropReportResponse

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not set in the environment")

client = Groq(api_key=GROQ_API_KEY)


def generate_mock_health_metrics() -> dict:
    """
    MOCKED — no real IoT/sensor feed exists yet. These stand in for
    actual field sensor data (soil moisture probes, disease-detection
    imaging) that would normally ground this report.

    Swap this function for a real sensor-data query once that pipeline
    exists; everything downstream (retrieval shape, prompt, generation)
    stays the same.
    """
    return {
        "moisturePercent": round(random.uniform(35, 75), 1),
        "diseaseRisk": random.choice(["Low", "Moderate", "Low", "Low"]),
        "growthStage": random.choice(
            ["Seedling", "Vegetative", "Flowering", "Maturing"]
        ),
        "estimatedYieldStatus": random.choice(
            ["On track", "Slightly behind", "On track", "Ahead"]
        ),
    }


def generate_crop_health_report(
    req: CropReportRequest,
) -> CropReportResponse:

    # Retrieval: real crop record fields passed in by Node
    # + mocked health metrics standing in for sensor data
    metrics = generate_mock_health_metrics()

    context = f"""
Farmer: {req.farmerName}
Crop: {req.cropName}
Soil type: {req.soilType}
Season: {req.season}
Quantity available: {req.quantity}
Location: {req.location}

Current health metrics:
- Soil moisture: {metrics['moisturePercent']}%
- Disease risk: {metrics['diseaseRisk']}
- Growth stage: {metrics['growthStage']}
- Yield status: {metrics['estimatedYieldStatus']}
""".strip()

    # Generation: LLM writes the readable report grounded in the data
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You write short, factual crop health reports for a B2B "
                    "agricultural marketplace. Use only the data provided — "
                    "never invent numbers not given to you. Keep it under "
                    "120 words, professional tone, no markdown headers."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Write a crop health report from this data:\n\n{context}"
                ),
            },
        ],
        temperature=0.4,
        max_tokens=250,
    )

    report_text = (
        completion.choices[0].message.content
        or "Report unavailable."
    )

    return CropReportResponse(
        report=report_text,
        mockedMetrics=metrics,
    )