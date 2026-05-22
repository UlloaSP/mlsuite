import { describe, expect, it, vi } from "vite-plus/test";
import type { createBrowserRouter } from "react-router";
import { enableViewTransitions } from "../src/router/view-transitions";

type AppRouter = ReturnType<typeof createBrowserRouter>;

const createRouter = () => {
  const navigate = vi.fn();
  const router = { navigate } as unknown as Pick<AppRouter, "navigate">;
  enableViewTransitions(router);
  return { navigate, router };
};

describe("route view transitions", () => {
  it("enables view transitions by default for route navigations", () => {
    const { navigate, router } = createRouter();

    router.navigate("/models");

    expect(navigate).toHaveBeenCalledWith("/models", { viewTransition: true });
  });

  it("keeps explicit view transition opt-out", () => {
    const { navigate, router } = createRouter();

    router.navigate("/models", { viewTransition: false, replace: true });

    expect(navigate).toHaveBeenCalledWith("/models", {
      replace: true,
      viewTransition: false,
    });
  });

  it("leaves history delta navigation untouched", () => {
    const { navigate, router } = createRouter();

    router.navigate(-1);

    expect(navigate).toHaveBeenCalledWith(-1);
  });
});
