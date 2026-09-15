def calculate_opportunity(
    market: dict,
    company_offer: float | None = None,
) -> dict:

    modal = float(market["modal"])
    minimum = float(market["min"])
    maximum = float(market["max"])

    if company_offer is None:
        return {
            "status": "REFERENCE",
            "score": None,
            "label": "Market reference available",
            "differenceFromModalPercent": None,
        }

    difference_percent = ((company_offer - modal) / modal) * 100

    if company_offer >= maximum:
        status = "STRONG"
        score = 95
        label = "Strong market opportunity"

    elif company_offer >= modal:
        status = "GOOD"
        score = 82
        label = "Good market opportunity"

    elif company_offer >= minimum:
        status = "FAIR"
        score = 60
        label = "Fair market opportunity"

    else:
        status = "LOW"
        score = 25
        label = "Below current market range"

    return {
        "status": status,
        "score": score,
        "label": label,
        "differenceFromModalPercent": round(
            difference_percent,
            2,
        ),
    }