import { useEffect, useRef, useState } from "react";
import { Download, Pause, Play, Search } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { cx } from "@/shared/ui/cx";
import type { ServiceStatusDto } from "@/features/infrastructure/api/infrastructure.types";
import { FIELD_FOCUS_RING } from "@/shared/ui/focus-ring";

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
          <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">
            Observability
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Service logs</h1>
          <p className="mt-1 text-sm text-fg-secondary">
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
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
          <label
            className={cx(
              "flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-1.5 transition",
              FIELD_FOCUS_RING,
            )}
          >
            <Search size={14} className="text-fg-muted" />
            <input
              aria-label="Search log message"
              type="text"
              placeholder="Search log message…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-52 bg-transparent text-xs text-fg outline-none placeholder:text-fg-muted"
            />
          </label>
          <AppSelect
            aria-label="Select log service"
            className="h-8 min-w-40 px-3 text-xs"
            value={selectedService ?? ""}
            onValueChange={onSelectService}
            options={services.map((service) => ({
              value: service.name,
              label: service.name,
            }))}
          />
          <div className="flex items-center gap-1.5">
            {(["INFO", "WARN", "ERROR", "DEBUG"] as LogLevel[]).map((lv) => (
              <button
                type="button"
                key={lv}
                className={cx(
                  "rounded-md border px-2 py-0.5 text-3xs font-medium transition",
                  levels[lv]
                    ? "border-transparent bg-accent-subtle text-accent-strong"
                    : "border-line text-fg-muted",
                )}
                onClick={() => toggleLevel(lv)}
              >
                {lv}
              </button>
            ))}
          </div>
          <div className="flex-1" />
          <AppBadge tone={follow ? "success" : "neutral"}>
            <span
              className={cx(
                "inline-block size-1.5 rounded-full",
                follow ? "bg-success-fg" : "bg-fg-muted",
              )}
            />
            {follow ? "live tail" : "paused"}
          </AppBadge>
        </div>

        {/* Log output */}
        <pre
          ref={termRef}
          className="h-[540px] overflow-auto bg-code p-4 font-mono text-2xs leading-relaxed text-code-fg"
        >
          {filtered.length > 0 ? (
            filtered.map((l) => (
              <div key={l.id} className="whitespace-pre-wrap break-words">
                <span
                  className={cx(
                    "mr-2 inline-block rounded px-1 py-px text-3xs font-semibold",
                    levelClass(l.level),
                  )}
                >
                  {l.level}
                </span>
                {l.text}
              </div>
            ))
          ) : (
            <span className="text-code-muted">
              {logLines.length === 0
                ? "No log lines yet. Select a service to start tailing."
                : "No lines match your filters."}
            </span>
          )}
          {follow && <span className="inline-block h-3.5 w-1.5 animate-pulse bg-success" />}
        </pre>
      </div>
    </div>
  );
}

function levelClass(level: LogLevel) {
  switch (level) {
    case "ERROR":
      return "bg-danger/30 text-code-fg";
    case "WARN":
      return "bg-warning/30 text-code-fg";
    case "DEBUG":
      return "bg-code-muted/20 text-code-muted";
    default:
      return "bg-accent/25 text-code-fg";
  }
}
