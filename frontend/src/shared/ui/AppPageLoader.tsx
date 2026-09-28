import { AppLoadingState } from "./AppLoadingState";
import { AppPage } from "./AppPage";
import { AppSkeleton } from "./AppSkeleton";
import { AppSurface } from "./AppSurface";

/**
 * A whole-page skeleton for routes whose header itself comes from the request.
 * Pages with a static header render it and put `AppLoadingState` in the body instead.
 */
export function AppPageLoader({
  label,
  viewport = false,
}: {
  label: string;
  /** Before the app shell exists: fill the screen on the page background. */
  viewport?: boolean;
}) {
  const page = (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <div aria-hidden="true" className="app-loading-reveal my-5 flex flex-col gap-3">
          <AppSkeleton className="h-3 w-24" />
          <AppSkeleton className="h-8 w-72 max-w-full" />
          <AppSkeleton className="h-4 w-96 max-w-full" />
        </div>
        <AppLoadingState label={label} rows={3} />
      </AppSurface>
    </AppPage>
  );
  return viewport ? <div className="h-svh w-full bg-page">{page}</div> : page;
}
