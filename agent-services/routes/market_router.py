from fastapi import APIRouter
from pydantic import BaseModel

from agents.market_agent import run_market_agent

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