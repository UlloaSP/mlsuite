import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, Search } from "lucide-react";
import { AppBadge, AppButton, cx } from "../../../app/components";
import type { ServiceStatusDto } from "../types";

type Props = {
  services: ServiceStatusDto[];
  selectedService: string | null;
  logLines: string[];
  streamConnected: boolean;
  onSelectService: (serviceName: string) => void;
};

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export function LogsView({
  services,
  selectedService,
  logLines,
  streamConnected: _streamConnected,
  onSelectService,
}: Props) {
  const [query, setQuery] = useState("");
  const [levels, setLevels] = useState<Record<LogLevel, boolean>>({
    INFO: true,
    WARN: true,
    ERROR: true,
    DEBUG: false,
  });
  const [follow, setFollow] = useState(true);
  const termRef = useRef<HTMLPreElement>(null);

  const toggleLevel = (lv: LogLevel) => setLevels((prev) => ({ ...prev, [lv]: !prev[lv] }));

  const parsedLines = logLines.map((line, i) => {
    let level: LogLevel = "INFO";
    if (/\bERROR\b|fatal|exception/i.test(line)) level = "ERROR";
    else if (/\bWARN\b|\bwarning\b/i.test(line)) level = "WARN";
    else if (/\bDEBUG\b/i.test(line)) level = "DEBUG";
    return { id: i, text: line, level };
  });

  const filtered = parsedLines.filter((l) => {
    if (!levels[l.level]) return false;
    if (query && !l.text.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (follow && termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [follow, filtered.length]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Observability
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Service logs
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {filtered.length} of {logLines.length} lines &middot; multi-service tail with live
            filtering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppButton
            variant={follow ? "primary" : "secondary"}
            className="gap-2 px-3 py-2 text-xs"
            onClick={() => setFollow((f) => !f)}
          >
            {follow ? <Pause size={13} /> : <Play size={13} />}
            {follow ? "Pause" : "Follow"}
          </AppButton>
          <AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
            <Download size={13} /> Export
          </AppButton>
        </div>
      </div>

      {/* Main card */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search log message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-52 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <select
            className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)] outline-none"
            value={selectedService ?? ""}
            onChange={(e) => onSelectService(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            {(["INFO", "WARN", "ERROR", "DEBUG"] as LogLevel[]).map((lv) => (
              <button
                key={lv}
                className={cx(
                  "rounded-md border px-2 py-0.5 text-[0.65rem] font-medium transition",
                  levels[lv]
                    ? "border-transparent bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
                    : "border-[var(--border-soft)] text-[var(--text-muted)]",
                )}
                onClick={() => toggleLevel(lv)}
              >
                {lv}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <AppBadge tone={follow ? "success" : "neutral"} className="px-2 py-0.5 text-[0.6rem]">
            <span
              className={cx(
                "inline-block size-1.5 rounded-full",
                follow ? "bg-[var(--success-text)]" : "bg-[var(--text-muted)]",
              )}
            />
            {follow ? "live tail" : "paused"}
          </AppBadge>
        </div>

        {/* Log output */}
        <pre
          ref={termRef}
          className="h-[540px] overflow-auto bg-[#111114] p-4 font-mono text-[0.72rem] leading-relaxed text-[#e2dde0]"
        >
          {filtered.length > 0 ? (
            filtered.map((l) => (
              <div key={l.id} className="whitespace-pre-wrap break-words">
                <span
                  className={cx(
                    "mr-2 inline-block rounded px-1 py-px text-[0.6rem] font-semibold",
                    levelClass(l.level),
                  )}
                >
                  {l.level}
                </span>
                {l.text}
              </div>
            ))
          ) : (
            <span className="text-[#555]">
              {logLines.length === 0
                ? "No log lines yet. Select a service to start tailing."
                : "No lines match your filters."}
            </span>
          )}
          {follow && <span className="inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400" />}
        </pre>
      </div>
    </div>
  );
}

function levelClass(level: LogLevel) {
  switch (level) {
    case "ERROR":
      return "bg-rose-900/60 text-rose-300";
    case "WARN":
      return "bg-amber-900/50 text-amber-300";
    case "DEBUG":
      return "bg-slate-800 text-slate-400";
    default:
      return "bg-indigo-900/40 text-indigo-300";
  }
}
