import { useEffect, useState, type ReactNode } from "react";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";
import { useStartupReadinessQuery, useStartupServicesQuery } from "./startup-query";
import { StartupScreen } from "./StartupScreen";

export const STARTUP_OPENING_MS = 600;

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const { data } = useStartupReadinessQuery();
  // Unknown is not "not ready": a slow first check on a reload must not look like a cold start.
  const checking = data === undefined;
  const ready = data?.ready === true;
  const starting = !checking && !ready;
  const services = useStartupServicesQuery(starting);
  const [revealed, setRevealed] = useState(false);
  const [opened, setOpened] = useState(false);

  // Fast startups never reveal the screen, so there is no flash.
  useEffect(() => {
    if (!starting) return;
    const timeout = window.setTimeout(() => setRevealed(true), LOADING_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [starting]);

  // Once revealed, hold "Opening MLsuite." briefly before handing over to the app.
  useEffect(() => {
    if (!ready || !revealed) return;
    const timeout = window.setTimeout(() => setOpened(true), STARTUP_OPENING_MS);
    return () => window.clearTimeout(timeout);
  }, [ready, revealed]);

  if (checking) return <AppPageLoader viewport label="Loading MLsuite…" />;
  if (!ready || (revealed && !opened)) {
    return <StartupScreen ready={ready} states={services.data ?? []} />;
  }

  return <>{children}</>;
}
