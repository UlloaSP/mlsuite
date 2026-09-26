import { useEffect, useState, type ReactNode } from "react";
import { LOADING_REVEAL_DELAY_MS } from "@/shared/ui/useStableLoading";
import { useStartupReadinessQuery, useStartupServicesQuery } from "./startup-query";
import { StartupScreen } from "./StartupScreen";

export const STARTUP_OPENING_MS = 600;

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const { data } = useStartupReadinessQuery();
  const ready = data?.ready === true;
  const services = useStartupServicesQuery(!ready);
  const [revealed, setRevealed] = useState(false);
  const [opened, setOpened] = useState(false);

  // Fast startups never reveal the screen, so there is no flash.
  useEffect(() => {
    if (ready) return;
    const timeout = window.setTimeout(() => setRevealed(true), LOADING_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [ready]);

  // Once revealed, hold "Opening MLsuite." briefly before handing over to the app.
  useEffect(() => {
    if (!ready || !revealed) return;
    const timeout = window.setTimeout(() => setOpened(true), STARTUP_OPENING_MS);
    return () => window.clearTimeout(timeout);
  }, [ready, revealed]);

  if (!ready || (revealed && !opened)) {
    return <StartupScreen ready={ready} states={services.data ?? []} />;
  }

  return <>{children}</>;
}
