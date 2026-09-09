from pydantic import BaseModel , Field
from typing import Optional, List

class VerifyCompanyRequest(BaseModel):
    gstNumber: str

class VerifyCompanyResponse(BaseModel):
    passed: bool
    reason: str

class CheckStockRequest(BaseModel):
    availableQuantity: float
    requestedQuantity: float

class CheckStockResponse(BaseModel):
    passed: bool
    reason: str

class CropReportRequest(BaseModel):
    farmerName: str
    cropName: str
    soilType: Optional[str] = "N/A"
    season: Optional[str] = "N/A"
    quantity: Optional[float] = 0
    location: Optional[str] = "N/A"

class CropReportResponse(BaseModel):
    report: str
    mockedMetrics: dict

class FraudCheckRequest(BaseModel):
    orderId: str
    companyId: str
    farmerId: str
    orderAmount: float
    companyVerificationPassed: bool
    stockCheckPassed: bool
    companyPastOrderCount: Optional[int] = 0
    companyDisputeCount: Optional[int] = 0
    farmerPastOrderCount: Optional[int] = 0
    farmerDisputeCount: Optional[int] = 0
 
 
class FraudSignal(BaseModel):
    name: str
    value: float          # 0.0 (safe) – 1.0 (high risk), each signal normalized
    weight: float
    note: str
 
 
class FraudCheckResponse(BaseModel):
    riskScore: float                 # weighted composite, 0.0–1.0
    requiresAdminReview: bool        # riskScore >= review threshold
    autoHold: bool                   # riskScore >= hard-block threshold
    signals: List[FraudSignal]
    reason: str
 
 
# ── Invoice agent ───────────────────────────────────────────────────
class InvoiceRequest(BaseModel):
    orderId: str
    invoiceNumber: str
    companyName: str
    companyGstNumber: str
    farmerName: str
    farmerLocation: Optional[str] = "N/A"
    cropName: str
    quantity: float
    unit: Optional[str] = "kg"
 
    # Full fee breakdown — computed server-side in Node (feeService.ts),
    # never trust these as agent-generated. This agent only lays them out.
    cropSubtotal: float             # 100% owed to farmer — GST-exempt (raw agri produce)
    platformFeePercent: float
    platformFeeAmount: float        # AyurHerb revenue — taxable service
    transportationFeeAmount: float  # logistics — taxable service
    gstOnFeesPercent: float         # GST applies to fees only, not crop value
    gstOnFeesAmount: float
    grandTotal: float               # what the company actually pays via Razorpay
 
    shipmentTranchePercent: int     # of cropSubtotal, released to farmer
    deliveryTranchePercent: int
    verifyUrl: str   # full public QR-verify URL, built by Node (has the qrToken)
 
 
class InvoiceResponse(BaseModel):
    invoiceNumber: str
    invoiceText: str          # short LLM-written note, shown in-app
    pdfBase64: str             # branded PDF, ba



class LogisticsRequest(BaseModel):
    farmerLat: float
    farmerLng: float
    quantity: float = Field(gt=0)
    cropName: str


class LogisticsResponse(BaseModel):
    success: bool
    vehicle: Optional[dict] = None
    reason: str
    confidence: float = 0
    agent: str = "logistics"