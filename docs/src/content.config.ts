import { readFile } from "node:fs/promises";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import type { Loader } from "astro/loaders";
import { docsLoader } from "@astrojs/starlight/loaders";
import { docsSchema } from "@astrojs/starlight/schema";
import { sourceMarkdown, sourcePages, sourceTitle } from "./sources";

const root = new URL("../../", import.meta.url);

// The release contract and security policy, read in place from the repository on every build.
const sourceLoader: Loader = {
  name: "mlsuite-sources",
  load: async ({ store, renderMarkdown, watcher }) => {
    store.clear();
    for (const { file, label } of sourcePages) {
      const url = new URL(file, root);
      const body = await readFile(url, "utf8");
      store.set({
        id: file,
        data: { title: sourceTitle(body, label) },
        body,
        rendered: await renderMarkdown(sourceMarkdown(file, body), { fileURL: url }),
      });
    }
    watcher?.add(sourcePages.map(({ file }) => new URL(file, root).pathname));
  },
};

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
  sources: defineCollection({ loader: sourceLoader, schema: z.object({ title: z.string() }) }),
};
