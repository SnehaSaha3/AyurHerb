from typing import Any


def build_farmer_context(farmer: dict[str, Any]) -> str:
    crops = farmer.get("crops", [])
    location = farmer.get("location", {})
    weather = farmer.get("weather", {})
    soil = farmer.get("soil", {})

    crop_text = format_crops(crops)
    location_text = format_location(location)
    weather_text = format_section(weather)
    soil_text = format_section(soil)

    moisture = farmer.get("moisture")
    irrigation = farmer.get("irrigation")

    return f"""
FARMER INFORMATION
==================

Crops:
{crop_text}

Farm Location:
{location_text}

CURRENT FARM CONDITIONS
=======================

Overall Soil Moisture:
{format_value(moisture)}

Irrigation:
{format_value(irrigation)}

Weather:
{weather_text}

Soil:
{soil_text}
""".strip()


def format_crops(crops: Any) -> str:
    if not crops:
        return "No crop information available."

    if not isinstance(crops, list):
        return str(crops)

    lines = []

    for crop in crops:
        if isinstance(crop, dict):
            name = crop.get("cropName") or crop.get("name")

            if not name:
                continue

            details = []

            if crop.get("moisture") is not None:
                details.append(
                    f"soil moisture={crop['moisture']}%"
                )

            if crop.get("stage"):
                details.append(
                    f"stage={crop['stage']}"
                )

            if crop.get("season"):
                details.append(
                    f"season={crop['season']}"
                )

            if crop.get("quantity") is not None:
                details.append(
                    f"quantity={crop['quantity']}"
                )

            if crop.get("area") is not None:
                details.append(
                    f"area={crop['area']}"
                )

            if details:
                lines.append(
                    f"- {name}: {', '.join(details)}"
                )
            else:
                lines.append(f"- {name}")

        else:
            lines.append(f"- {crop}")

    return "\n".join(lines) or "No crop information available."


def format_location(location: Any) -> str:
    if not location:
        return "Location unavailable."

    if not isinstance(location, dict):
        return str(location)

    parts = []

    for key in [
        "area",
        "village",
        "district",
        "state",
        "country",
    ]:
        if location.get(key):
            parts.append(str(location[key]))

    if location.get("latitude") is not None:
        parts.append(
            f"latitude={location['latitude']}"
        )

    if location.get("longitude") is not None:
        parts.append(
            f"longitude={location['longitude']}"
        )

    return (
        ", ".join(parts)
        if parts
        else "Location unavailable."
    )


def format_section(data: Any) -> str:
    if not data:
        return "Information unavailable."

    if not isinstance(data, dict):
        return str(data)

    lines = []

    for key, value in data.items():
        if value is None or value == "":
            continue

        readable = key.replace("_", " ").title()
        lines.append(
            f"- {readable}: {value}"
        )

    return (
        "\n".join(lines)
        if lines
        else "Information unavailable."
    )


def format_value(value: Any) -> str:
    if value is None:
        return "Unavailable"

    return str(value)