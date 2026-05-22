import type { createBrowserRouter } from "react-router";

type AppRouter = ReturnType<typeof createBrowserRouter>;

export function enableViewTransitions(appRouter: Pick<AppRouter, "navigate">) {
  const navigate = appRouter.navigate.bind(appRouter);
  appRouter.navigate = ((to, opts) => {
    if (typeof to === "number") {
      return navigate(to);
    }
    return navigate(to, {
      ...opts,
      viewTransition: opts?.viewTransition ?? true,
    });
  }) as AppRouter["navigate"];
}
