import json
import math
import os
from typing import Any, Dict, List

from groq import Groq


client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


VEHICLES = [
    {
        "vehicleId": "VH001",
        "vehicleNumber": "AS01AB1234",
        "type": "Mini Truck",
        "capacityKg": 750,
        "driverName": "Rakesh Das",
        "driverContact": "9876543210",
        "available": True,
        "offsetLat": 0.004,
        "offsetLng": 0.003,
    },
    {
        "vehicleId": "VH002",
        "vehicleNumber": "AS01CD5678",
        "type": "Pickup Truck",
        "capacityKg": 1000,
        "driverName": "Rahul Roy",
        "driverContact": "9876543211",
        "available": True,
        "offsetLat": -0.006,
        "offsetLng": 0.005,
    },
    {
        "vehicleId": "VH003",
        "vehicleNumber": "AS01EF9012",
        "type": "Medium Truck",
        "capacityKg": 2500,
        "driverName": "Bikash Kalita",
        "driverContact": "9876543212",
        "available": True,
        "offsetLat": 0.008,
        "offsetLng": -0.004,
    },
    {
        "vehicleId": "VH004",
        "vehicleNumber": "AS01GH3456",
        "type": "Large Truck",
        "capacityKg": 5000,
        "driverName": "Amit Sharma",
        "driverContact": "9876543213",
        "available": True,
        "offsetLat": -0.003,
        "offsetLng": -0.006,
    },
]


def calculate_distance(
    lat1: float,
    lng1: float,
    lat2: float,
    lng2: float
) -> float:

    earth_radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lng = math.radians(lng2 - lng1)

    a = (
        math.sin(delta_lat / 2) ** 2
        +
        math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lng / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius_km * c


# ---------------------------------------------------------
# GET AVAILABLE VEHICLES
# ---------------------------------------------------------

def get_available_vehicles(
    farmer_lat: float,
    farmer_lng: float
) -> List[Dict[str, Any]]:

    vehicles = []

    for vehicle in VEHICLES:

        if not vehicle["available"]:
            continue

        vehicle_lat = farmer_lat + vehicle["offsetLat"]
        vehicle_lng = farmer_lng + vehicle["offsetLng"]

        distance = calculate_distance(
            farmer_lat,
            farmer_lng,
            vehicle_lat,
            vehicle_lng
        )

        vehicles.append({
            "vehicleId": vehicle["vehicleId"],
            "vehicleNumber": vehicle["vehicleNumber"],
            "type": vehicle["type"],
            "capacityKg": vehicle["capacityKg"],
            "driverName": vehicle["driverName"],
            "driverContact": vehicle["driverContact"],
            "available": vehicle["available"],
            "lat": vehicle_lat,
            "lng": vehicle_lng,
            "distanceKm": round(distance, 2),
        })

    return vehicles


# ---------------------------------------------------------
# LOGISTICS AI AGENT
# ---------------------------------------------------------

def run_logistics_agent(
    farmer_lat: float,
    farmer_lng: float,
    requested_quantity: float,
    crop_name: str
) -> Dict[str, Any]:

    vehicles = get_available_vehicles(
        farmer_lat,
        farmer_lng
    )

    if not vehicles:
        return {
            "success": False,
            "reason": "No vehicles are currently available.",
            "vehicle": None,
            "confidence": 0
        }

    # Add capacity information for the AI
    candidates = []

    for vehicle in vehicles:

        candidates.append({
            **vehicle,
            "capacitySufficient": (
                vehicle["capacityKg"] >= requested_quantity
            )
        })

    prompt = f"""
You are AyurHerb's Logistics Agent.

Your job is to select the most appropriate available
vehicle for transporting a farmer's crop.

ORDER INFORMATION:

Crop:
{crop_name}

Requested quantity:
{requested_quantity} kg

Available vehicles:
{json.dumps(candidates, indent=2)}

DECISION RULES:

1. Vehicle MUST be available.
2. Vehicle MUST have enough capacity.
3. Prefer the closest suitable vehicle.
4. Avoid unnecessarily large vehicles when a smaller
   suitable vehicle is available.
5. Do not select a vehicle whose capacity is smaller
   than the requested quantity.
6. If no vehicle can carry the order, return null.
7. Return ONLY valid JSON.

Expected JSON format:

{{
    "selectedVehicleId": "VH002",
    "reason": "VH002 has sufficient capacity and is the closest suitable vehicle.",
    "confidence": 0.95
}}
"""

    try:

        response = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            temperature=0,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a logistics decision-making AI agent. "
                        "Return only valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )

        raw_response = response.choices[0].message.content.strip()

        # Remove markdown fences if Groq returns them
        if raw_response.startswith("```"):
            raw_response = (
                raw_response
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )

        decision = json.loads(raw_response)

    except Exception as error:

        return {
            "success": False,
            "reason": f"Logistics AI failed: {str(error)}",
            "vehicle": None,
            "confidence": 0
        }

    selected_vehicle_id = decision.get(
        "selectedVehicleId"
    )

    if not selected_vehicle_id:

        return {
            "success": False,
            "reason": (
                decision.get(
                    "reason",
                    "No suitable vehicle was found."
                )
            ),
            "vehicle": None,
            "confidence": decision.get(
                "confidence",
                0
            )
        }

    selected_vehicle = next(
        (
            vehicle
            for vehicle in candidates
            if vehicle["vehicleId"] == selected_vehicle_id
        ),
        None
    )

    # -----------------------------------------------------
    # BACKEND-SAFE VALIDATION
    # -----------------------------------------------------
    # Never blindly trust the LLM.
    # The AI recommends.
    # The backend validates.
    # -----------------------------------------------------

    if selected_vehicle is None:

        return {
            "success": False,
            "reason": "AI selected an invalid vehicle.",
            "vehicle": None,
            "confidence": 0
        }

    if not selected_vehicle["available"]:

        return {
            "success": False,
            "reason": "AI selected an unavailable vehicle.",
            "vehicle": None,
            "confidence": 0
        }

    if selected_vehicle["capacityKg"] < requested_quantity:

        return {
            "success": False,
            "reason": (
                "AI selected a vehicle with insufficient capacity."
            ),
            "vehicle": None,
            "confidence": 0
        }

    if not selected_vehicle.get("driverContact"):

        return {
            "success": False,
            "reason": "Selected vehicle has no driver contact on file.",
            "vehicle": None,
            "confidence": 0
        }

    return {
        "success": True,
        "vehicle": selected_vehicle,
        "reason": decision.get(
            "reason",
            "Vehicle selected by Logistics Agent."
        ),
        "confidence": float(
            decision.get("confidence", 0)
        ),
        "agent": "logistics"
    }