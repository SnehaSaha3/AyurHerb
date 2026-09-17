from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.market_agent import run_market_agent
from market.mock_data import get_all_market_data
from market.price_history import generate_price_history


router = APIRouter()


class MarketEvaluateRequest(BaseModel):
    cropName: str
    state: str | None = None
    district: str | None = None
    companyOfferPrice: float | None = None


@router.post("/market/evaluate")
def evaluate_market(payload: MarketEvaluateRequest):
    return run_market_agent(
        crop_name=payload.cropName,
        state=payload.state,
        district=payload.district,
        company_offer_price=payload.companyOfferPrice,
    )

@router.get("/market/top-crops")
def top_crops(limit: int = 5):
    all_data = get_all_market_data()
    ranked = sorted(all_data, key=lambda d: d["modal"], reverse=True)
    return ranked[:limit]


@router.get("/market/price-history/{crop_name}")
def price_history(crop_name: str, days: int = 30):
    result = generate_price_history(crop_name, days)
    if not result:
        raise HTTPException(status_code=404, detail="No market data for this crop")
    return result