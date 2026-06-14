import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { EditorAssemblyLoader } from "../../router/EditorAssemblyLoader";
import { getStartupReadiness } from "./startupReadiness";

const STARTUP_QUERY_KEY = ["startup", "readiness"] as const;
const RETRY_MS = 1_500;

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const readinessQuery = useQuery({
    queryKey: STARTUP_QUERY_KEY,
    queryFn: getStartupReadiness,
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.ready ? false : RETRY_MS),
  });

  if (readinessQuery.data?.ready) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-screen min-h-[520px] overflow-hidden bg-[#F7F7F7] dark:bg-[#050505]">
      <EditorAssemblyLoader />
    </div>
  );
}
