import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { Provider } from "jotai";
import { LazyMotion, MotionConfig, domAnimation } from "motion/react";
import { StrictMode, type PropsWithChildren } from "react";
import { Toaster } from "sonner";
import { StartupGate } from "@/app/startup/StartupGate";

type AppProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function AppProviders({ children, queryClient }: AppProvidersProps) {
  return (
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <Provider>
          <LazyMotion features={domAnimation}>
            <MotionConfig reducedMotion="user">
              <StartupGate>
                {children}
                <Toaster
                  position="top-center"
                  toastOptions={{
                    classNames: {
                      toast:
                        "rounded-lg border border-neutral-200 bg-white text-neutral-950 shadow-lg",
                      title: "text-sm font-medium",
                      description: "text-sm text-neutral-600",
                      actionButton:
                        "rounded-md bg-neutral-950 px-3 py-2 text-sm font-medium text-white",
                      cancelButton:
                        "rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-950",
                      closeButton: "border-neutral-200 bg-white text-neutral-950",
                    },
                  }}
                />
              </StartupGate>
            </MotionConfig>
          </LazyMotion>
        </Provider>
      </QueryClientProvider>
    </StrictMode>
  );
}
