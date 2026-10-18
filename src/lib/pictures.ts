import type { ImageMetadata } from "astro";

/**
 * Pictures are found, not listed: whatever image sits in an entry's folder is
 * shown, ordered by file name (use 01-, 02- to choose). The first one is the
 * cover. Paths in YAML (profile photo, paper thumbnails) resolve here too.
 */
const all = import.meta.glob<ImageMetadata>("/content/**/*.{png,jpg,jpeg,webp,gif,avif}", {
  eager: true,
  import: "default",
});

/** Images in content/<collection>/<folder>/, sorted by name. */
export function folderPictures(collection: string, folder: string): ImageMetadata[] {
  const prefix = `/content/${collection}/${folder}/`;
  return Object.keys(all)
    .filter((p) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
    .sort()
    .map((p) => all[p]);
}

/** An image named in YAML, relative to content/. Missing is an error. */
export function contentImage(path: string): ImageMetadata {
  const img = all[`/content/${path.replace(/^\//, "")}`];
  if (!img) throw new Error(`image content/${path} not found`);
  return img;
}
