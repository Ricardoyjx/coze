from typing import Optional
from pydantic import BaseModel


class JDGenerateRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None


class ScreeningRequest(BaseModel):
    jdContent: str
    resumeIds: list[str]


class OfferEmailRequest(BaseModel):
    candidate_name: str
    position: str
    salary: str
    start_date: str
    location: str
    notes: Optional[str] = ""
    company_name: Optional[str] = ""


class SalaryAnalysisRequest(BaseModel):
    position: str
    city: str = ""
    experience: str = ""
    education: str = ""


class BatchScreenRequest(BaseModel):
    jdContent: str
    resumeCount: int = 10
    threshold: int = 60


class InterviewQuestionsRequest(BaseModel):
    position: str
    jdContent: str = ""
    count: int = 5
    difficulty: str = "medium"
    types: list[str] = ["technical", "behavioral"]
