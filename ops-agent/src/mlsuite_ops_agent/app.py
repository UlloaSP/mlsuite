"""FastAPI app for infra dashboard ops."""

from __future__ import annotations

from contextlib import asynccontextmanager
import asyncio
import json

from fastapi import Depends, FastAPI, HTTPException, Request, WebSocket
from fastapi.responses import JSONResponse

from .compose import ComposeError
from .config import SETTINGS
from .models import ServiceActionRequest, ServiceLogsSnapshot, TerminalSessionRequest, TerminalSessionResponse
from .state import AgentState, parse_topics


def create_app() -> FastAPI:
    state = AgentState(SETTINGS)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        await state.start()
        try:
            yield
        finally:
            await state.stop()

    app = FastAPI(lifespan=lifespan)
    app.state.agent = state

    @app.exception_handler(ComposeError)
    async def handle_compose_error(_request: Request, exc: ComposeError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"detail": str(exc)})

    def verify_request(request: Request) -> None:
        if request.headers.get("X-MLSuite-Ops-Secret") != SETTINGS.shared_secret:
            raise HTTPException(status_code=401, detail="Invalid ops secret.")

    async def verify_socket(websocket: WebSocket) -> bool:
        if websocket.headers.get("x-mlsuite-ops-secret") != SETTINGS.shared_secret:
            await websocket.close(code=4401)
            return False
        return True

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/internal/overview", dependencies=[Depends(verify_request)])
    async def overview() -> dict[str, object]:
        return await state.snapshot()

    @app.post("/internal/services/{service_name}/actions", dependencies=[Depends(verify_request)])
    async def service_action(service_name: str, request: ServiceActionRequest) -> dict[str, str]:
        await state.compose.action(service_name, request.action)
        return {"status": "ok"}

    @app.get("/internal/services/{service_name}/logs", dependencies=[Depends(verify_request)])
    async def service_logs(service_name: str, tail: int = SETTINGS.log_tail_lines) -> ServiceLogsSnapshot:
        lines = await state.compose.logs_snapshot(service_name, tail)
        return ServiceLogsSnapshot(serviceName=service_name, lines=lines)

    @app.post("/internal/terminal/sessions", dependencies=[Depends(verify_request)])
    async def create_terminal_session(request: TerminalSessionRequest) -> TerminalSessionResponse:
        session = await state.terminals.create(request.serviceName, request.cols, request.rows)
        return TerminalSessionResponse(
            sessionId=session.session_id,
            wsPath=f"/internal/terminal/{session.session_id}",
        )

    @app.delete("/internal/terminal/sessions/{session_id}", dependencies=[Depends(verify_request)])
    async def close_terminal_session(session_id: str) -> dict[str, str]:
        await state.terminals.close(session_id)
        return {"status": "closed"}

    @app.websocket("/internal/stream")
    async def stream_socket(websocket: WebSocket) -> None:
        if not await verify_socket(websocket):
            return
        await websocket.accept()
        client = await state.register_client(websocket)
        sender = None
        try:
            async def send_loop() -> None:
                while True:
                    await websocket.send_text(json.dumps(await client.queue.get()))

            sender = asyncio.create_task(send_loop())
            while True:
                text = await websocket.receive_text()
                for topic in parse_topics(text):
                    parts = topic.split(":")
                    if len(parts) == 3 and parts[0] == "service" and parts[2] == "logs":
                        await state.set_log_subscription(client, parts[1])
        finally:
            if sender is not None:
                sender.cancel()
            await state.unregister_client(client)

    @app.websocket("/internal/terminal/{session_id}")
    async def terminal_socket(websocket: WebSocket, session_id: str) -> None:
        if not await verify_socket(websocket):
            return
        session = state.terminals.get(session_id)
        if session is None or session.attached:
            await websocket.close(code=4404)
            return
        session.attached = True
        await websocket.accept()
        sender = None
        try:
            async def send_loop() -> None:
                while True:
                    await websocket.send_text(json.dumps(await session.queue.get()))

            sender = asyncio.create_task(send_loop())
            while True:
                payload = json.loads(await websocket.receive_text())
                if payload.get("type") == "input":
                    await state.terminals.write(session_id, str(payload.get("data", "")))
                if payload.get("type") == "resize":
                    await state.terminals.resize(session_id, int(payload.get("cols", 120)), int(payload.get("rows", 36)))
        finally:
            session.attached = False
            if sender is not None:
                sender.cancel()

    return app
