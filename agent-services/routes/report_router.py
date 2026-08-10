from fastapi import APIRouter
from schemas import CropReportRequest, CropReportResponse
from agents.report_agent import generate_crop_health_report

router = APIRouter()

@router.post("/generate-report", response_model=CropReportResponse)
def generate_report(req: CropReportRequest):
    return generate_crop_health_report(req)