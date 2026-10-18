import { getCollection, type CollectionEntry } from "astro:content";
import type { Lang } from "./content";
import { folderPictures } from "./pictures";

type Name = "news" | "research";

/**
 * One entry per folder, in the requested language: index.es.md when it exists,
 * otherwise index.md with `translated: false` so the page can say so.
 * Frontmatter that is not language-specific (date, order, videos) is always
 * taken from the English file, so it is written once.
 */
export async function entries<N extends Name>(name: N, lang: Lang) {
  const all = (await getCollection(name)) as CollectionEntry<N>[];
  const folders = new Map<string, { en?: CollectionEntry<N>; es?: CollectionEntry<N> }>();
  for (const e of all) {
    const [folder, file] = e.id.split("/");
    const slot = folders.get(folder) ?? {};
    if (file === "index") slot.en = e;
    else if (file === "index.es") slot.es = e;
    folders.set(folder, slot);
  }

  const out = [];
  for (const [folder, { en, es }] of folders) {
    if (!en) throw new Error(`content/${name}/${folder}: has index.es.md but no index.md (English is required)`);
    const chosen = lang === "es" && es ? es : en;
    out.push({
      slug: folder,
      entry: chosen,
      data: { ...en.data, ...chosen.data, ...pickShared(en.data) } as CollectionEntry<N>["data"],
      translated: lang === "en" || Boolean(es),
      pictures: folderPictures(name, folder),
    });
  }
  return out;
}

function pickShared(data: Record<string, unknown>) {
  const shared: Record<string, unknown> = {};
  for (const k of ["date", "order", "videos", "draft"]) if (k in data) shared[k] = data[k];
  return shared;
}
