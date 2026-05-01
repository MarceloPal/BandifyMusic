"""
Esquemas Pydantic para request/response del IA Service.
"""

from pydantic import BaseModel
from typing import List, Optional


class AnalyzeRequest(BaseModel):
    s3_key: str
    usuario_id: str


class AnalyzeResponse(BaseModel):
    jobId: str
    status: str  # always "processing"


class JobStatusResponse(BaseModel):
    status: str              # "processing" | "done" | "error"
    vector: Optional[List[float]] = None
    metadata: Optional[dict] = None
    mp3_s3_key: Optional[str] = None   # final S3 key (MP3) after optional transcoding
    message: Optional[str] = None      # only on error


class HealthResponse(BaseModel):
    status: str
    service: str
