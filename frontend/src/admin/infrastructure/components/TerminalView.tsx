import "@xterm/xterm/css/xterm.css";

import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { SquareTerminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AppBadge, AppButton } from "../../../app/components";
import { closeTerminalSession } from "../api/infrastructureService";
import { useTerminalSession } from "../hooks/useInfrastructure";
import { openTerminalSocket, sendTerminalFrame } from "../ws/infrastructureSocket";
import type { ServiceStatusDto } from "../types";

type Props = {
  services: ServiceStatusDto[];
  selectedService: string | null;
  terminalEnabled: boolean;
  onSelectService: (serviceName: string) => void;
};

export function TerminalView({
  services,
  selectedService,
  terminalEnabled,
  onSelectService,
}: Props) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<string | null>(null);
  const { mutateAsync: createTerminalSession, isPending } = useTerminalSession();
  const [status, setStatus] = useState("idle");
  // react-doctor-disable-next-line react-doctor/rerender-state-only-in-handlers -- Requested service gates terminal session lifecycle and effect resubscription.
  const [requestedService, setRequestedService] = useState<string | null>(null);

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state -- Terminal lifecycle must coordinate xterm, socket, status text, and cleanup in one effect.
  useEffect(() => {
    if (!mountRef.current || terminalRef.current) return;
    const terminal = new Terminal({
      cursorBlink: true,
      theme: {
        background: "#0c0c0f",
        foreground: "#e8e4e6",
        cursor: "#6366f1",
      },
      fontFamily: "'IBM Plex Mono', 'DM Mono', ui-monospace, monospace",
      fontSize: 13,
    });
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(mountRef.current);
    fitAddon.fit();
    terminal.write("Select a service and open shell to start.\r\n");
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

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state, react-doctor/no-adjust-state-on-prop-change, react-doctor/exhaustive-deps -- Terminal session effect coordinates selected service, xterm status, socket setup, and cleanup.
  useEffect(() => {
    if (!terminalRef.current) return;
    const terminal = terminalRef.current;
    terminal.reset();
    if (requestedService !== selectedService) {
      terminal.write(
        selectedService
          ? "Open shell to start session.\r\n"
          : "Select a service to start shell.\r\n",
      );
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- Terminal status mirrors external session availability.
      setStatus("idle");
      return;
    }
    if (!selectedService) {
      terminal.write("Select a service to start shell.\r\n");
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- Terminal status mirrors external session availability.
      setStatus("idle");
      return;
    }
    if (!terminalEnabled) {
      terminal.write("Shell disabled for selected service.\r\n");
      // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- Terminal status mirrors external session availability.
      setStatus("unavailable");
      return;
    }
    let disposed = false;
    let dataDispose: { dispose: () => void } | null = null;
    terminal.write(`Opening ${selectedService} shell…\r\n`);
    // react-doctor-disable-next-line react-doctor/no-adjust-state-on-prop-change -- Terminal status mirrors external session availability.
    setStatus("opening");
    void createTerminalSession({
      serviceName: selectedService,
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
            if (frame.type === "output") terminal.write(frame.data);
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
        setRequestedService(null);
        setStatus("error");
      });
    return () => {
      disposed = true;
      dataDispose?.dispose();
      const socket = socketRef.current;
      socket?.close();
      socketRef.current = null;
      const sessionId = sessionRef.current;
      sessionRef.current = null;
      if (sessionId) void closeTerminalSession(sessionId);
    };
  }, [createTerminalSession, terminalEnabled, requestedService, selectedService]);

  const sendQuickCommand = (cmd: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      sendTerminalFrame(socketRef.current, { type: "input", data: cmd + "\n" });
    }
  };

  const runningServices = services.filter((s) => s.status === "running");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Shell session
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Embedded terminal
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Interactive shell into any running service. Read-only superadmin session.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            value={selectedService ?? ""}
            onChange={(e) => onSelectService(e.target.value)}
          >
            {runningServices.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <AppButton
            variant="secondary"
            className="gap-2 px-3 py-2 text-xs"
            disabled={
              !selectedService ||
              !terminalEnabled ||
              isPending ||
              status === "live" ||
              status === "opening"
            }
            onClick={() => setRequestedService(selectedService)}
          >
            <SquareTerminal size={13} />
            Open shell
          </AppButton>
        </div>
      </div>

      {/* Terminal + sidebar */}
      <div className="grid gap-4 xl:grid-cols-[1fr_260px]">
        {/* Terminal card */}
        <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedService ?? "terminal"} &middot; /
            </p>
            <div className="flex items-center gap-2">
              <AppBadge tone={toneForStatus(status)} className="px-2 py-0.5 text-[0.6rem]">
                {status}
              </AppBadge>
            </div>
          </div>
          <div className="h-[480px] bg-[#0c0c0f] p-2">
            <div
              ref={mountRef}
              className="size-full overflow-hidden rounded-lg border border-white/5 bg-black/20 p-1"
            />
          </div>
        </div>

        {/* Quick commands sidebar */}
        <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
          <div className="border-b border-[var(--border-soft)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">Quick commands</p>
          </div>
          <div className="flex flex-col gap-1 p-3">
            {["help", "ls", "ps", "env", "uname", "df -h", "top", "whoami"].map((cmd) => (
              <button
                type="button"
                key={cmd}
                className="flex items-center gap-2 rounded-md px-3 py-1.5 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                disabled={status !== "live"}
                onClick={() => sendQuickCommand(cmd)}
              >
                <span className="font-mono text-[var(--text-muted)]">$</span>
                <span className="font-mono">{cmd}</span>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-2.5 text-[0.65rem] text-[var(--text-muted)]">
            <span>session policy</span>
            <span>read-only &middot; 30m idle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function toneForStatus(status: string): "neutral" | "success" | "warning" | "danger" {
  if (status === "live") return "success";
  if (status === "opening" || status === "idle") return "warning";
  if (status === "error" || status === "unavailable") return "danger";
  return "neutral";
}
