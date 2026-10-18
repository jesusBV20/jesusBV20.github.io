import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

/**
 * The YAML files under content/, parsed and validated.
 *
 * This module has no Astro imports on purpose: the site (src/) and the CV
 * generator (tools/build-cv.ts, run by Bun before Astro) both read content
 * through it, so the web page and the PDF can never disagree about what a
 * valid entry is. A typo stops both with the file and the field named.
 */

export const LANGS = ["en", "es"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "en";

export const CONTENT_DIR = join(import.meta.dirname, "../../content");

// -- shared field types --------------------------------------------------------

/** Text that is the same in every language, or { en, es? }. */
const localized = z.union([
  z.string(),
  z.object({ en: z.string(), es: z.string().optional() }).strict(),
]);
export type Localized = z.infer<typeof localized>;

/** YYYY or YYYY-MM. YAML reads a bare 2023 as a number, so both are accepted. */
const yearMonth = z
  .union([z.number().int(), z.string()])
  .transform(String)
  .refine((s) => /^\d{4}(-\d{2})?$/.test(s), "must be YYYY or YYYY-MM");
const endDate = z.union([yearMonth, z.literal("present")]);

const link = z.object({ label: z.string(), href: z.string().url() }).strict();

// -- profile.yaml --------------------------------------------------------------

const NETWORKS = [
  "GitHub",
  "Google Scholar",
  "ORCID",
  "LinkedIn",
  "ResearchGate",
  "X",
  "Mastodon",
  "Bluesky",
  "YouTube",
] as const;
export type Network = (typeof NETWORKS)[number];

const profileSchema = z
  .object({
    name: z.string(),
    authorNames: z.array(z.string()).min(1),
    role: localized,
    affiliation: localized,
    location: localized,
    email: z.string().email(),
    photo: z.string(),
    bio: localized,
    interests: z.array(localized),
    links: z.array(
      z.object({ network: z.enum(NETWORKS), id: z.string(), href: z.string().url() }).strict(),
    ),
  })
  .strict();

// -- cv.yaml -------------------------------------------------------------------

const SECTIONS = [
  "education",
  "experience",
  "publications",
  "talks",
  "awards",
  "skills",
  "languages",
] as const;
export type CvSection = (typeof SECTIONS)[number];

const THEMES = [
  "classic",
  "ember",
  "engineeringclassic",
  "engineeringresumes",
  "harvard",
  "ink",
  "moderncv",
  "opal",
  "sb2nov",
] as const;

const cvSchema = z
  .object({
    sections: z.array(z.enum(SECTIONS)).min(1),
    theme: z.enum(THEMES),
    education: z.array(
      z
        .object({
          degree: localized,
          area: localized,
          institution: localized,
          location: localized.optional(),
          start: yearMonth.optional(),
          end: endDate,
          summary: localized.optional(),
          highlights: z.array(localized).default([]),
        })
        .strict(),
    ),
    experience: z.array(
      z
        .object({
          position: localized,
          organization: localized,
          location: localized.optional(),
          start: yearMonth,
          end: endDate,
          summary: localized.optional(),
          highlights: z.array(localized).default([]),
        })
        .strict(),
    ),
    awards: z
      .array(
        z
          .object({ title: localized, date: yearMonth, detail: localized.optional() })
          .strict(),
      )
      .default([]),
    skills: z.array(z.object({ label: localized, details: localized }).strict()).default([]),
    languages: z.array(z.object({ label: localized, details: localized }).strict()).default([]),
  })
  .strict();

// -- publications.yaml ---------------------------------------------------------

export const PUB_KINDS = ["preprint", "journal", "conference", "technote"] as const;
export type PubKind = (typeof PUB_KINDS)[number];

const publication = z
  .object({
    title: z.string(),
    authors: z.string(),
    venue: z.string(),
    year: z.number().int(),
    doi: z.string().url().optional(),
    pdf: z.string().url().optional(),
    topics: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    abstract: z.string().optional(),
    note: z.string().optional(),
    links: z.array(link).default([]),
    bibtex: z.string().optional(),
  })
  .strict();

const publicationsSchema = z
  .object(Object.fromEntries(PUB_KINDS.map((k) => [k, z.array(publication).default([])])))
  .strict();

export type Publication = z.infer<typeof publication> & { kind: PubKind; slug: string };

// -- talks.yaml ----------------------------------------------------------------

const talksSchema = z.array(
  z
    .object({
      title: z.string(),
      event: z.string(),
      location: localized.optional(),
      date: yearMonth,
      kind: z.enum(["talk", "poster", "invited", "outreach"]).default("talk"),
      links: z.array(link).default([]),
    })
    .strict(),
);

// -- ui.yaml -------------------------------------------------------------------

const uiSchema = z
  .object({ en: z.record(z.string(), z.string()), es: z.record(z.string(), z.string()) })
  .strict();

// -- loading -------------------------------------------------------------------

function load<T extends z.ZodTypeAny>(file: string, schema: T): z.output<T> {
  const raw = parse(readFileSync(join(CONTENT_DIR, file), "utf8"));
  const result = schema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`content/${file} is not valid:\n${problems}\n`);
  }
  return result.data;
}

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

/** Folder names under content/research/ that are published (not _template). */
export function researchTopics(): string[] {
  const dir = join(CONTENT_DIR, "research");
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
}

let cache: ReturnType<typeof loadAll> | undefined;

function loadAll() {
  const profile = load("profile.yaml", profileSchema);
  const cv = load("cv.yaml", cvSchema);
  const talks = load("talks.yaml", talksSchema);
  const ui = load("ui.yaml", uiSchema);
  const pubs = load("publications.yaml", publicationsSchema) as Record<
    PubKind,
    z.infer<typeof publication>[]
  >;

  const topics = new Set(researchTopics());
  const problems: string[] = [];

  const publications: Publication[] = PUB_KINDS.flatMap((kind) =>
    pubs[kind].map((p) => ({ ...p, kind, slug: slugify(p.title) })),
  );
  for (const p of publications) {
    for (const t of p.topics) {
      if (!topics.has(t))
        problems.push(
          `  - "${p.title}": topic "${t}" is not a folder in content/research/ (have: ${[...topics].join(", ")})`,
        );
    }
    if (p.image && !existsSync(join(CONTENT_DIR, p.image)))
      problems.push(`  - "${p.title}": image ${p.image} does not exist under content/`);
    if (!profile.authorNames.some((n) => p.authors.includes(n)))
      problems.push(
        `  - "${p.title}": none of profile.yaml authorNames (${profile.authorNames.join(", ")}) appears in its authors`,
      );
  }
  if (problems.length) throw new Error(`content/publications.yaml is not valid:\n${problems.join("\n")}\n`);

  if (!existsSync(join(CONTENT_DIR, profile.photo)))
    throw new Error(`content/profile.yaml: photo ${profile.photo} does not exist under content/`);

  return { profile, cv, talks, ui, publications };
}

export function content() {
  return (cache ??= loadAll());
}

// -- language helpers ----------------------------------------------------------

const untranslated = new Set<string>();

/** The text for a language, falling back to English (and remembering that it did). */
export function tr(value: Localized | undefined, lang: Lang): string {
  if (value === undefined) return "";
  if (typeof value === "string") return value;
  if (lang === "en") return value.en;
  if (value.es === undefined) {
    untranslated.add(value.en.slice(0, 60));
    return value.en;
  }
  return value.es;
}

export function untranslatedReport(): string[] {
  return [...untranslated];
}

/** A label from ui.yaml. Missing in English is an error; Spanish falls back. */
export function label(key: string, lang: Lang): string {
  const { ui } = content();
  const value = ui[lang][key] ?? ui.en[key];
  if (value === undefined) throw new Error(`content/ui.yaml: no label "${key}" under en:`);
  return value;
}

/** "2023-05" → "May 2023" / "mayo 2023"; "2023" stays "2023". */
export function formatDate(value: string, lang: Lang): string {
  if (value === "present") return label("cv.present", lang);
  const [y, m] = value.split("-");
  if (!m) return y;
  const month = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString(
    lang === "es" ? "es-ES" : "en-GB",
    { month: "short", timeZone: "UTC" },
  );
  return `${month.replace(".", "")} ${y}`;
}

export function formatRange(start: string | undefined, end: string, lang: Lang): string {
  return start ? `${formatDate(start, lang)} – ${formatDate(end, lang)}` : formatDate(end, lang);
}

/** Sort key: newest first. */
export function byDateDesc<T>(get: (x: T) => string) {
  return (a: T, b: T) => get(b).localeCompare(get(a));
}
