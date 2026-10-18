import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * News posts and research topics: one folder each, holding index.md (English,
 * required) and optionally index.es.md (Spanish). Pictures dropped in the
 * folder are found by src/lib/pictures.ts - they are never listed here.
 * Folders starting with "_" (the templates) are not published.
 *
 * The entry id is the path ("2024-02-23-my-first-icra/index.es"); src/lib/
 * entries.ts splits it into the folder (the URL) and the language.
 */
const id = ({ entry }: { entry: string }) => entry.replace(/\.md$/, "");
const pattern = ["*/index.md", "*/index.es.md", "!_*/**"];

/** YouTube video ids, e.g. [s8ojnEEbRmA] from https://youtu.be/s8ojnEEbRmA */
const videos = z.array(z.string().regex(/^[A-Za-z0-9_-]{11}$/, "must be a YouTube id (11 characters)")).default([]);

const news = defineCollection({
  loader: glob({ pattern, base: "./content/news", generateId: id }),
  schema: z
    .object({
      title: z.string(),
      date: z.coerce.date(),
      summary: z.string().optional(),
      videos,
      draft: z.boolean().default(false),
    })
    .strict(),
});

const research = defineCollection({
  loader: glob({ pattern, base: "./content/research", generateId: id }),
  schema: z
    .object({
      title: z.string(),
      summary: z.string(),
      order: z.number().optional(),
      videos,
    })
    .strict(),
});

export const collections = { news, research };
