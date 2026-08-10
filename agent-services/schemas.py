from pydantic import BaseModel
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
