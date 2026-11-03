import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode, type PropsWithChildren } from "react";
import { AppToaster } from "@/shared/ui/AppToaster";
import { useChosenFontFaces } from "@/shared/ui/use-chosen-font-faces";
import { StartupGate } from "@/app/startup/StartupGate";

type AppProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  useChosenFontFaces();
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <StartupGate>
          {children}
          <AppToaster />
        </StartupGate>
        {/* Renders nothing outside development, so production bundles leave it out. */}
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </StrictMode>
  );
}
