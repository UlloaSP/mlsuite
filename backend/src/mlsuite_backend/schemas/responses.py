from typing import TypedDict


class HealthResponse(TypedDict):
    status: str


class MetadataResponse(TypedDict):
    fileName: str
    type: str
    specificType: str
