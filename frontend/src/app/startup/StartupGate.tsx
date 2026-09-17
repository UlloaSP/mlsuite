import type { ReactNode } from "react";
import { EditorAssemblyLoader } from "@/shared/ui/EditorAssemblyLoader";
import { useStartupReadinessQuery } from "./startup-query";

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const { data } = useStartupReadinessQuery();

  if (data?.ready) {
    return <>{children}</>;
  }

  return <EditorAssemblyLoader scope="viewport" />;
}
