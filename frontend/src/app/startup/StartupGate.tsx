import type { ReactNode } from "react";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { useStartupReadinessQuery } from "./startup-query";

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const { data } = useStartupReadinessQuery();
  const showLoader = useStableLoading(!data?.ready);

  if (showLoader) return <EditorAssemblyLoader scope="viewport" />;

  return <>{children}</>;
}
