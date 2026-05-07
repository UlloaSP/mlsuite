import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { SquareTerminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppBadge, AppPanel, AppSectionTitle } from "../../../app/components";
import { closeTerminalSession } from "../api/infrastructureService";
import { useTerminalSession } from "../hooks/useInfrastructure";
import { openTerminalSocket, sendTerminalFrame } from "../ws/infrastructureSocket";

type Props = {
	serviceName: string | null;
	enabled: boolean;
};

export function ServiceTerminalPanel({ serviceName, enabled }: Props) {
	const mountRef = useRef<HTMLDivElement | null>(null);
	const terminalRef = useRef<Terminal | null>(null);
	const fitAddonRef = useRef<FitAddon | null>(null);
	const socketRef = useRef<WebSocket | null>(null);
	const sessionRef = useRef<string | null>(null);
	const createSession = useTerminalSession();
	const [status, setStatus] = useState("idle");

	useEffect(() => {
		if (!mountRef.current || terminalRef.current) {
			return;
		}
		const terminal = new Terminal({
			cursorBlink: true,
			theme: {
				background: "#090709",
				foreground: "#f6e9ed",
				cursor: "#ff385c",
			},
			fontFamily: "IBM Plex Mono, ui-monospace, monospace",
			fontSize: 13,
		});
		const fitAddon = new FitAddon();
		terminal.loadAddon(fitAddon);
		terminal.open(mountRef.current);
		fitAddon.fit();
		terminal.write("Select service to start shell.\r\n");
		terminalRef.current = terminal;
		fitAddonRef.current = fitAddon;
		const resizeObserver = new ResizeObserver(() => {
			fitAddon.fit();
			if (socketRef.current?.readyState === WebSocket.OPEN) {
				sendTerminalFrame(socketRef.current, {
					type: "resize",
					cols: terminal.cols,
					rows: terminal.rows,
				});
			}
		});
		resizeObserver.observe(mountRef.current);
		return () => {
			resizeObserver.disconnect();
			terminal.dispose();
			terminalRef.current = null;
			fitAddonRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (!terminalRef.current) {
			return;
		}
		const terminal = terminalRef.current;
		terminal.reset();
		if (!serviceName) {
			terminal.write("Select service to start shell.\r\n");
			setStatus("idle");
			return;
		}
		if (!enabled) {
			terminal.write("Shell disabled for selected service.\r\n");
			setStatus("unavailable");
			return;
		}
		let disposed = false;
		let dataDispose: { dispose: () => void } | null = null;
		terminal.write(`Opening ${serviceName} shell...\r\n`);
		setStatus("opening");
		void createSession
			.mutateAsync({
				serviceName,
				cols: terminal.cols || 120,
				rows: terminal.rows || 36,
			})
			.then((session) => {
				if (disposed) {
					void closeTerminalSession(session.sessionId);
					return;
				}
				sessionRef.current = session.sessionId;
				const socket = openTerminalSocket(session.wsPath, {
					onOpen: () => {
						setStatus("live");
						dataDispose = terminal.onData((data) => {
							if (socket.readyState === WebSocket.OPEN) {
								sendTerminalFrame(socket, { type: "input", data });
							}
						});
						sendTerminalFrame(socket, {
							type: "resize",
							cols: terminal.cols,
							rows: terminal.rows,
						});
					},
					onClose: () => setStatus("closed"),
					onError: () => setStatus("error"),
					onMessage: (frame) => {
						if (frame.type === "output") {
							terminal.write(frame.data);
						}
						if (frame.type === "error") {
							terminal.write(`\r\n${frame.message}\r\n`);
							setStatus("error");
						}
						if (frame.type === "exit") {
							terminal.write(`\r\n[process exited ${frame.code}]\r\n`);
							setStatus("closed");
						}
					},
				});
				socketRef.current = socket;
			})
			.catch((error: Error) => {
				terminal.write(`\r\n${error.message}\r\n`);
				setStatus("error");
			});
		return () => {
			disposed = true;
			dataDispose?.dispose();
			socketRef.current?.close();
			socketRef.current = null;
			const sessionId = sessionRef.current;
			sessionRef.current = null;
			if (sessionId) {
				void closeTerminalSession(sessionId);
			}
		};
	}, [createSession, enabled, serviceName]);

	return (
		<AppPanel className="grid h-[520px] max-h-[520px] min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-[20px] border-white/70 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,245,247,0.94))] p-0">
			<div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-soft)] px-6 pb-5 pt-6">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
						shell session
					</p>
					<AppSectionTitle className="mt-2 text-[1.45rem]">Embedded terminal</AppSectionTitle>
					<p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
						{serviceName ? `Interactive shell for ${serviceName}` : "Pick a service to request shell access."}
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					{serviceName ? <AppBadge tone="accent">{serviceName}</AppBadge> : null}
					<AppBadge tone={toneForStatus(status)}>
						<SquareTerminal size={13} />
						{status}
					</AppBadge>
				</div>
			</div>
			<div className="min-h-0 overflow-hidden bg-[linear-gradient(180deg,_#120d10,_#060507)] p-4">
				<div
					ref={mountRef}
					className="size-full min-h-0 overflow-hidden rounded-[14px] border border-white/10 bg-black/25 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
				/>
			</div>
		</AppPanel>
	);
}

function toneForStatus(status: string): "neutral" | "success" | "warning" | "danger" {
	if (status === "live") {
		return "success";
	}
	if (status === "opening" || status === "idle") {
		return "warning";
	}
	if (status === "error" || status === "unavailable") {
		return "danger";
	}
	return "neutral";
}
