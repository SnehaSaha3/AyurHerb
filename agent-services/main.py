from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.report_router import router as report_router

from schemas import (
    VerifyCompanyRequest, VerifyCompanyResponse,
    CheckStockRequest, CheckStockResponse,
)
from agents.verification_agent import verify_company_identity
from agents.stock_agent import check_stock_availability

app = FastAPI(title="AyurHerb Agents Service")

# Only the Node backend calls this service — not the public internet
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

@app.post("/verify-company", response_model=VerifyCompanyResponse)
def verify_company(req: VerifyCompanyRequest):
    return verify_company_identity(req.gstNumber)

@app.post("/check-stock", response_model=CheckStockResponse)
def check_stock(req: CheckStockRequest):
    return check_stock_availability(req.availableQuantity, req.requestedQuantity)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(report_router, prefix="/reports")