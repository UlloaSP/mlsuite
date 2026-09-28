import { useEffect, useRef, useState } from "react";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { Download, Pause, Play, Search } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { cx } from "@/shared/ui/cx";
import type { ServiceStatusDto } from "@/features/infrastructure/api/infrastructure.types";
import { FIELD_FOCUS_RING } from "@/shared/ui/focus-ring";
import { downloadTextFile } from "@/shared/lib/download-text-file";

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
  streamConnected,
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

  const exportVisibleLines = () =>
    downloadTextFile(
      filtered.map((line) => line.text).join("\n"),
      `${selectedService ?? "service"}-logs.txt`,
    );
  const tail = !streamConnected
    ? { tone: "warning" as const, dot: "bg-warning-fg", label: "Stream disconnected" }
    : follow
      ? { tone: "success" as const, dot: "bg-success-fg", label: "Live tail" }
      : { tone: "neutral" as const, dot: "bg-fg-muted", label: "Paused" };

  useEffect(() => {
    if (follow && termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [follow, filtered.length]);

  return (
    <>
      <AppPageHeader
        breadcrumbScope="platform"
        breadcrumbs={[{ label: "Infrastructure", to: "/admin/infrastructure" }, { label: "Logs" }]}
        eyebrow="Observability"
        title="Service logs"
        description={`${filtered.length} of ${logLines.length} lines · multi-service tail with live filtering.`}
        actions={
          <>
            <AppButton
              variant="secondary"
              disabled={filtered.length === 0}
              onClick={exportVisibleLines}
            >
              <Download size={15} /> Export
            </AppButton>
            <AppButton
              variant={follow ? "primary" : "secondary"}
              onClick={() => setFollow((f) => !f)}
            >
              {follow ? <Pause size={15} /> : <Play size={15} />}
              {follow ? "Pause" : "Follow"}
            </AppButton>
          </>
        }
      />

      {/* Main card */}
      <div className="flex min-h-96 flex-1 flex-col overflow-hidden rounded-card border border-line bg-surface">
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
            className="min-w-40"
            size="sm"
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
          <AppBadge tone={tail.tone}>
            <span className={cx("inline-block size-1.5 rounded-full", tail.dot)} />
            {tail.label}
          </AppBadge>
        </div>

        {/* Log output */}
        <pre
          ref={termRef}
          className="min-h-0 flex-1 overflow-auto bg-code p-4 font-mono text-2xs leading-relaxed text-code-fg"
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
    </>
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
