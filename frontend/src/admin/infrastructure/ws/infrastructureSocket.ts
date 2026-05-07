import { getBackendBaseUrl } from "../../../app/config/runtimeConfig";
import type { InfrastructureEvent, TerminalFrame } from "../types";

type SocketCallbacks<TMessage> = {
	onMessage: (event: TMessage) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: () => void;
};

export function buildWebSocketUrl(path: string) {
	const url = new URL(getBackendBaseUrl());
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	url.pathname = path;
	url.search = "";
	url.hash = "";
	return url.toString();
}

export function openInfrastructureSocket(callbacks: SocketCallbacks<InfrastructureEvent>) {
	const socket = new WebSocket(buildWebSocketUrl("/api/admin/infrastructure/stream"));
	wireSocket(socket, callbacks);
	return socket;
}

export function openTerminalSocket(
	path: string,
	callbacks: SocketCallbacks<TerminalFrame>,
) {
	const socket = new WebSocket(buildWebSocketUrl(path));
	wireSocket(socket, callbacks);
	return socket;
}

export function subscribeToServiceLogs(socket: WebSocket, serviceName: string | null) {
	const topics = serviceName ? ["overview", `service:${serviceName}:logs`] : ["overview"];
	socket.send(JSON.stringify({ type: "subscribe", topics }));
}

export function sendTerminalFrame(socket: WebSocket, frame: TerminalFrame) {
	socket.send(JSON.stringify(frame));
}

function wireSocket<TMessage>(
	socket: WebSocket,
	callbacks: SocketCallbacks<TMessage>,
) {
	socket.addEventListener("open", () => callbacks.onOpen?.());
	socket.addEventListener("close", () => callbacks.onClose?.());
	socket.addEventListener("error", () => callbacks.onError?.());
	socket.addEventListener("message", (event) => {
		callbacks.onMessage(JSON.parse(event.data) as TMessage);
	});
}
