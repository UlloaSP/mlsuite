from fastapi import APIRouter

router = APIRouter()


# Answered on the event loop itself, never waiting for a thread that model work may hold.
@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
