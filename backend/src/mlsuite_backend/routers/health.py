from fastapi import APIRouter

router = APIRouter()


# Answered on the event loop itself, never waiting for model work, which runs in worker processes.
@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
