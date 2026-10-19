import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import { sidebar } from "./src/navigation";

export default defineConfig({
  site: "https://docs.mlsuite.eshkra.dev",
  trailingSlash: "always",
  devToolbar: { enabled: false },
  integrations: [
    starlight({
      title: "MLsuite",
      description:
        "The MLsuite manual: upload model bundles, build schemas, run predictions, collect reviews and export the results.",
      components: {
        Head: "./src/components/BrandHead.astro",
        SiteTitle: "./src/components/BrandTitle.astro",
        SocialIcons: "./src/components/SocialIcons.astro",
        Footer: "./src/components/Footer.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/UlloaSP/mlsuite",
        },
      ],
      editLink: {
        // Feature work targets develop; main only receives promotions.
        baseUrl: "https://github.com/UlloaSP/mlsuite/edit/develop/docs/",
      },
      expressiveCode: {
        // The landing's code themes, switched with the documentation theme.
        themes: ["github-dark-default", "github-light-default"],
        styleOverrides: {
          borderRadius: "12px",
          borderColor: "var(--msu-border)",
          codeFontFamily: "var(--brand-font-mono)",
          uiFontFamily: "var(--brand-font-sans)",
          codeFontSize: "0.8125rem",
          codeLineHeight: "1.7",
          frames: {
            shadowColor: "transparent",
            editorTabBarBackground: "var(--msu-subtle)",
            editorActiveTabBackground: "var(--msu-code-bg)",
            editorActiveTabIndicatorTopColor: "var(--msu-ember)",
            editorActiveTabIndicatorBottomColor: "transparent",
            editorBackground: "var(--msu-code-bg)",
            terminalTitlebarBackground: "var(--msu-subtle)",
            terminalBackground: "var(--msu-code-bg)",
          },
        },
      },
      customCss: [
        "./src/styles/typography.css",
        "./src/styles/theme.css",
        "./src/styles/content.css",
        "./src/styles/home.css",
        "./src/styles/figures.css",
      ],
      sidebar,
    }),
  ],
});
