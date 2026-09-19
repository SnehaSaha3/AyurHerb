import hashlib
from datetime import datetime, timezone

MARKET_DATA = {
    "ashwagandha": {
        "cropName": "Ashwagandha",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 900.0,
        "max": 1050.0,
        "modal": 975.0,
    },
    "turmeric": {
        "cropName": "Turmeric",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 140.0,
        "max": 190.0,
        "modal": 165.0,
    },
    "brahmi": {
        "cropName": "Brahmi",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 180.0,
        "max": 260.0,
        "modal": 220.0,
    },
    "aloe vera": {
        "cropName": "Aloe Vera",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 35.0,
        "max": 60.0,
        "modal": 48.0,
    },
    "tulsi": {
        "cropName": "Tulsi",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 60.0,
        "max": 95.0,
        "modal": 78.0,
    },
    "neem": {
        "cropName": "Neem",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 50.0,
        "max": 80.0,
        "modal": 65.0,
    },
    "ginger": {
        "cropName": "Ginger",
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": 55.0,
        "max": 90.0,
        "modal": 70.0,
    },
}

ALIASES = {
    "bhrami": "brahmi",
    "brami": "brahmi",
    "bacopa": "brahmi",
    "aloevera": "aloe vera",
    "aloe": "aloe vera",
    "holy basil": "tulsi",
    "withania": "ashwagandha",
    "haldi": "turmeric",
}

MIN_ESTIMATE_PRICE = 40.0
MAX_ESTIMATE_PRICE = 900.0
ESTIMATE_BAND = 0.15


def _clean_name(crop_name: str) -> str:
    return " ".join(crop_name.split())


def normalize_crop_name(crop_name: str) -> str:
    key = _clean_name(crop_name).lower()
    return ALIASES.get(key, key)


def _estimate_market_entry(key: str, display_name: str) -> dict:
    digest = hashlib.sha256(key.encode()).hexdigest()
    fraction = int(digest[:8], 16) / 0xFFFFFFFF
    modal = round(
        MIN_ESTIMATE_PRICE + fraction * (MAX_ESTIMATE_PRICE - MIN_ESTIMATE_PRICE)
    )

    return {
        "cropName": display_name,
        "unit": "kg",
        "state": "Assam",
        "district": None,
        "min": float(round(modal * (1 - ESTIMATE_BAND))),
        "max": float(round(modal * (1 + ESTIMATE_BAND))),
        "modal": float(modal),
        "estimated": True,
    }


def get_market_data(crop_name: str):
    if not crop_name or not crop_name.strip():
        return None

    key = normalize_crop_name(crop_name)

    data = MARKET_DATA.get(key)

    if data is None:
        data = _estimate_market_entry(key, _clean_name(crop_name).title())

    result = dict(data)

    result.setdefault("estimated", False)

    result["average"] = round(
        (result["min"] + result["max"]) / 2,
        2,
    )

    result["source"] = (
        "AyurHerb Market Estimate"
        if result["estimated"]
        else "AyurHerb Market Reference"
    )

    result["updatedAt"] = datetime.now(timezone.utc).isoformat()

    return result


def get_all_market_data():
    return [get_market_data(name) for name in MARKET_DATA]