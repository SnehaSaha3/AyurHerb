import hashlib
from datetime import datetime, timedelta, timezone

from market.mock_data import get_market_data

MIN_DAYS = 1
MAX_DAYS = 365


def _seeded_fraction(key: str) -> float:
    digest = hashlib.sha256(key.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def generate_price_history(crop_name: str, days: int = 30):
    base = get_market_data(crop_name)
    if not base:
        return None

    days = max(MIN_DAYS, min(int(days), MAX_DAYS))

    modal = base["modal"]
    min_price = base["min"]
    max_price = base["max"]
    spread = max_price - min_price

    canonical_name = base["cropName"].lower()

    today = datetime.now(timezone.utc).date()
    history = []

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        fraction = _seeded_fraction(f"{canonical_name}:{day.isoformat()}")
        price = round(min_price + fraction * spread, 2)
        history.append({"date": day.isoformat(), "price": price})

    history[-1]["price"] = modal

    change_from_yesterday = (
        round(history[-1]["price"] - history[-2]["price"], 2)
        if len(history) > 1
        else 0
    )

    return {
        "cropName": base["cropName"],
        "unit": base["unit"],
        "history": history,
        "todayPrice": modal,
        "changeFromYesterday": change_from_yesterday,
        "estimated": base["estimated"],
        "source": base["source"],
    }