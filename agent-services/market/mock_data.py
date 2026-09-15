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
}


def get_market_data(crop_name: str):
    key = crop_name.strip().lower()

    data = MARKET_DATA.get(key)

    if not data:
        return None

    result = dict(data)

    result["average"] = round(
        (result["min"] + result["max"]) / 2,
        2,
    )

    result["source"] = "AyurHerb Market Reference"
    result["updatedAt"] = datetime.now(timezone.utc).isoformat()

    return result