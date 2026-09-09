from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.report_router import router as report_router
from routes.escrow_router import router as escrow_router

from agents.logistic_agent import run_logistics_agent
from schemas import LogisticsRequest, LogisticsResponse

from schemas import (
    VerifyCompanyRequest,
    VerifyCompanyResponse,
    CheckStockRequest,
    CheckStockResponse,
)

from agents.verification_agent import verify_company_identity
from agents.stock_agent import check_stock_availability

app = FastAPI(title="AyurHerb Agents Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


@app.post("/verify-company", response_model=VerifyCompanyResponse)
def verify_company(req: VerifyCompanyRequest):
    return verify_company_identity(req.gstNumber)


@app.post("/check-stock", response_model=CheckStockResponse)
def check_stock(req: CheckStockRequest):
    return check_stock_availability(
        req.availableQuantity,
        req.requestedQuantity,
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post(
    "/logistics/assign",
    response_model=LogisticsResponse
)
async def assign_logistics(
    request: LogisticsRequest
):

    result = run_logistics_agent(
        farmer_lat=request.farmerLat,
        farmer_lng=request.farmerLng,
        requested_quantity=request.quantity,
        crop_name=request.cropName
    )

    return result

app.include_router(report_router, prefix="/reports")
app.include_router(escrow_router, prefix="/escrow")

