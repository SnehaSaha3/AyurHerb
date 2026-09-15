from market.provider import get_market_reference
from market.opportunity import calculate_opportunity


def run_market_agent(
    crop_name: str,
    state: str | None = None,
    district: str | None = None,
    company_offer_price: float | None = None,
):
    market = get_market_reference(
        crop_name=crop_name,
        state=state,
        district=district,
    )

    if not market:
        return {
            "cropName": crop_name,
            "unit": "kg",
            "market": {},
            "companyOffer": (
                {"price": company_offer_price}
                if company_offer_price is not None
                else None
            ),
            "opportunity": {
                "status": "UNAVAILABLE",
                "score": None,
                "label": "Market data unavailable",
                "differenceFromModalPercent": None,
            },
            "recommendation": {
                "farmer": "No recent market reference is available for this crop.",
                "company": "Do not rely on an unavailable market reference.",
            },
            "source": "AyurHerb Market Reference",
            "updatedAt": "",
        }

    opportunity = calculate_opportunity(
        market=market,
        company_offer=company_offer_price,
    )

    farmer_recommendation = (
        f"Current reference price is ₹{market['modal']:.0f} per {market['unit']}."
    )

    company_recommendation = (
        "Enter a company offer to compare it with the current market reference."
    )

    if company_offer_price is not None:
        company_recommendation = (
            f"The ₹{company_offer_price:.0f}/{market['unit']} offer is "
            f"{opportunity['status'].lower()} relative to the current market reference."
        )

    return {
        "cropName": market["cropName"],
        "unit": market["unit"],
        "market": {
            "min": market["min"],
            "max": market["max"],
            "modal": market["modal"],
            "average": market["average"],
            "state": market.get("state"),
            "district": market.get("district"),
        },
        "companyOffer": (
            {"price": company_offer_price, "unit": market["unit"]}
            if company_offer_price is not None
            else None
        ),
        "opportunity": opportunity,
        "recommendation": {
            "farmer": farmer_recommendation,
            "company": company_recommendation,
        },
        "source": market["source"],
        "updatedAt": market["updatedAt"],
    }