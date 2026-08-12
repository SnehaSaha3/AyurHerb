from fastapi import APIRouter
from schemas import (
    FraudCheckRequest, FraudCheckResponse,
    InvoiceRequest, InvoiceResponse,
)
from agents.fraud_agent import check_fraud_risk
from agents.invoice_agent import generate_invoice

router = APIRouter()


@router.post("/check-fraud", response_model=FraudCheckResponse)
def check_fraud(req: FraudCheckRequest):
    return check_fraud_risk(req)


@router.post("/generate-invoice", response_model=InvoiceResponse)
def create_invoice(req: InvoiceRequest):
    return generate_invoice(req)