import type { ReactNode } from "react";
import { EditorAssemblyLoader } from "@/router/EditorAssemblyLoader";
import { useStartupReadinessQuery } from "./startup-query";

type StartupGateProps = {
  children: ReactNode;
};

export function StartupGate({ children }: StartupGateProps) {
  const { data } = useStartupReadinessQuery();

  if (data?.ready) {
    return <>{children}</>;
  }

  return (
    <div className="relative h-screen min-h-[520px] overflow-hidden bg-[#F7F7F7] dark:bg-[#050505]">
      <EditorAssemblyLoader />
    </div>
  );
}
