import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode, type PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { StartupGate } from "@/app/startup/StartupGate";

type AppProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <StartupGate>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "rounded-lg border border-line bg-surface-raised text-fg shadow-overlay",
                title: "text-sm font-medium",
                description: "text-sm text-fg-secondary",
                actionButton: "rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent",
                cancelButton: "rounded-md bg-surface-muted px-3 py-2 text-sm font-medium text-fg",
                closeButton: "border-line bg-surface-raised text-fg",
              },
            }}
          />
        </StartupGate>
        {/* Renders nothing outside development, so production bundles leave it out. */}
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </StrictMode>
  );
}
