"""Pydantic models for agent contracts."""

from typing import Literal

from pydantic import BaseModel


class ServiceActionRequest(BaseModel):
    action: Literal["START", "STOP", "RESTART"]


class ServiceLogsSnapshot(BaseModel):
    serviceName: str
    lines: list[str]


class TerminalSessionRequest(BaseModel):
    serviceName: str
    cols: int = 120
    rows: int = 36


class TerminalSessionResponse(BaseModel):
    sessionId: str
    wsPath: str
