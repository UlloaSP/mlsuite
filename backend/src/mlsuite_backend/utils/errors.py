from fastapi import HTTPException


def bad_request(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


def internal_runtime_error(detail: str) -> HTTPException:
    return HTTPException(status_code=500, detail=detail)
