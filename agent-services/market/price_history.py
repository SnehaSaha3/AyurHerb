import hashlib
from datetime import datetime, timedelta, timezone

from market.mock_data import get_market_data


def _seeded_fraction(key: str) -> float:
    """
    Deterministic pseudo-random value in [0, 1] derived from a string key.
    Same crop + same date always produces the same fraction, so the
    trend line is stable across reloads instead of jittering on every
    fetch. Swap this whole module for a real mandi price feed once
    that pipeline exists — the endpoint shape stays the same.
    """
    digest = hashlib.sha256(key.encode()).hexdigest()
    return int(digest[:8], 16) / 0xFFFFFFFF


def generate_price_history(crop_name: str, days: int = 30):
    base = get_market_data(crop_name)
    if not base:
        return None

    modal = base["modal"]
    min_price = base["min"]
    max_price = base["max"]
    spread = max_price - min_price

    today = datetime.now(timezone.utc).date()
    history = []

    for i in range(days - 1, -1, -1):
        day = today - timedelta(days=i)
        seed_key = f"{crop_name.lower()}:{day.isoformat()}"
        fraction = _seeded_fraction(seed_key)
        price = round(min_price + fraction * spread, 2)
        history.append({"date": day.isoformat(), "price": price})

    # Anchor "today" to the live modal price so this stays consistent
    # with the market-reference endpoint.
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
    }