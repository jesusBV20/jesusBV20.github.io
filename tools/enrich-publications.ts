/**
 * Fills in missing `doi:` and `pdf:` in content/publications.yaml.
 *
 * Adapted from the Swarm Systems Lab site's tool. Add a paper by hand with just
 * title, authors, venue and year, then run this. Google Scholar has no API and
 * forbids scraping, so it asks the open infrastructure instead:
 *
 *   OpenAlex  - by title, first among the works linked to your ORCID (the
 *               profile.yaml ORCID link), then among all works. Gives the DOI
 *               and the best open-access copy. Free, no key.
 *   arXiv     - only when OpenAlex knows no open copy (usual for preprints).
 *   Crossref  - for --verify, the registry of record for DOIs.
 *
 * Run it by hand, never in the build: a build that called three APIs would be
 * slow, break when the network does, and produce a different site each run.
 *
 *   bun run publications:enrich -- --dry-run   show what it would change
 *   bun run publications:enrich                write the changes
 *   bun run publications:enrich -- --verify    check the DOIs already there
 *
 * Nothing already in the file is ever overwritten, and comments are kept. A
 * title that does not match closely enough is reported and left alone: a
 * wrong DOI is far worse than a missing one.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDocument, type YAMLMap } from "yaml";
import { content, CONTENT_DIR, PUB_KINDS } from "../src/lib/content.ts";

const FILE = join(CONTENT_DIR, "publications.yaml");
const { profile } = content();
const MAILTO = profile.email; // OpenAlex and Crossref ask callers to identify themselves
const ORCID = profile.links.find((l) => l.network === "ORCID")?.id;
const PAUSE_MS = 400;

const dryRun = process.argv.includes("--dry-run");
const verify = process.argv.includes("--verify");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Politeness: back off and retry when an API asks us to slow down. */
async function get(url: URL | string, attempt = 1): Promise<Response> {
  const response = await fetch(url, { headers: { "User-Agent": `personal-website (${MAILTO})` } });
  if (response.status === 429 && attempt <= 4) {
    const wait = 2000 * attempt;
    console.log(`  … rate limited, waiting ${wait / 1000}s`);
    await sleep(wait);
    return get(url, attempt + 1);
  }
  return response;
}

/** Compare titles loosely enough for punctuation, strictly enough to be safe. */
const normalise = (t: string) =>
  t.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function similar(a: string, b: string): number {
  const left = new Set(normalise(a).split(" "));
  const right = new Set(normalise(b).split(" "));
  const shared = [...left].filter((w) => right.has(w)).length;
  return shared / Math.max(left.size, right.size);
}

type Found = { doi: string | null; pdf: string | null; via: string };

async function openAlex(title: string, orcid?: string): Promise<Found | null> {
  const url = new URL("https://api.openalex.org/works");
  // Commas separate filters in OpenAlex's syntax and colons confuse it, so a
  // title containing either would be rejected.
  const filters = [`title.search:${title.replace(/[,:]/g, " ")}`];
  if (orcid) filters.push(`author.orcid:${orcid}`);
  url.searchParams.set("filter", filters.join(","));
  url.searchParams.set("per-page", "3");
  url.searchParams.set("mailto", MAILTO);

  const response = await get(url);
  if (!response.ok) throw new Error(`OpenAlex ${response.status}`);
  const { results = [] } = (await response.json()) as { results?: any[] };
  const match = results.find((w) => w.title && similar(w.title, title) >= 0.8);
  if (!match) return null;
  return {
    doi: match.doi ?? null,
    pdf: match.best_oa_location?.pdf_url ?? null,
    via: orcid ? "OpenAlex (your ORCID)" : "OpenAlex",
  };
}

async function arxiv(title: string): Promise<string | null> {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", `ti:"${title}"`);
  url.searchParams.set("max_results", "1");
  const response = await get(url);
  if (!response.ok) return null;
  const feed = await response.text();
  // The first <entry> is the paper; the feed's own <title> comes before it.
  const entry = feed.slice(feed.indexOf("<entry>"));
  const found = /<title>([\s\S]*?)<\/title>/.exec(entry)?.[1]?.trim();
  const id = /<id>(https?:\/\/arxiv\.org\/abs\/[^<]+)<\/id>/.exec(entry)?.[1];
  if (!found || !id || similar(found, title) < 0.8) return null;
  return id.replace("/abs/", "/pdf/").replace(/v\d+$/, "");
}

async function crossref(title: string) {
  const url = new URL("https://api.crossref.org/works");
  url.searchParams.set("query.bibliographic", title);
  url.searchParams.set("rows", "1");
  url.searchParams.set("mailto", MAILTO);
  const response = await get(url);
  if (!response.ok) return null;
  const item = ((await response.json()) as any).message?.items?.[0];
  if (!item?.DOI || !item.title?.[0]) return null;
  return { doi: item.DOI as string, title: item.title[0] as string, venue: (item["container-title"]?.[0] ?? "") as string };
}

const doc = parseDocument(readFileSync(FILE, "utf8"));
const allEntries = PUB_KINDS.flatMap((k) => ((doc.get(k) as any)?.items ?? []) as YAMLMap[]);
const titleOf = (e: YAMLMap) => String(e.get("title"));

if (verify) {
  const problems: string[] = [];
  const missing: string[] = [];
  const upgradable: string[] = [];
  const seen = new Map<string, string>();

  for (const entry of allEntries) {
    const title = titleOf(entry);
    const doi = entry.get("doi") ? String(entry.get("doi")) : null;
    if (doi) {
      const twin = seen.get(doi);
      if (twin) problems.push(`"${title}" shares its DOI with "${twin}": ${doi}`);
      seen.set(doi, title);
    }
    const found = await crossref(title);
    if (found && similar(found.title, title) >= 0.8) {
      const held = (doi ?? "").toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
      if (!doi) missing.push(`"${title}"\n      https://doi.org/${found.doi}`);
      else if (held.startsWith("10.")) {
        if (held !== found.doi.toLowerCase())
          problems.push(`"${title}"\n      holds ${doi}\n      Crossref says ${found.doi} (${found.venue})`);
      } else upgradable.push(`"${title}"\n      doi: https://doi.org/${found.doi}`);
    }
    await sleep(PAUSE_MS);
  }

  if (problems.length) {
    console.log("DISAGREEMENTS - one of the two describes a different paper:");
    for (const l of problems) console.log(`  ${l}`);
  }
  if (missing.length) {
    console.log("\nNO DOI held, but Crossref knows one:");
    for (const l of missing) console.log(`  ${l}`);
  }
  if (upgradable.length) {
    console.log(`\n${upgradable.length} hold a publisher address rather than a DOI. They work; a DOI outlives the URL:`);
    for (const l of upgradable) console.log(`  ${l}`);
  }
  if (!problems.length && !missing.length) console.log("\nNothing looks wrong.");
  process.exit(0);
}

const pending = allEntries.filter((e) => !e.has("doi") || !e.has("pdf"));
console.log(`${pending.length} publications are missing a DOI or a PDF${ORCID ? ` (ORCID ${ORCID})` : ""}\n`);

let filled = 0;
const unresolved: string[] = [];
const closed: string[] = [];

for (const entry of pending) {
  const title = titleOf(entry);
  const found: string[] = [];
  try {
    const result = (ORCID && (await openAlex(title, ORCID))) || (await openAlex(title));
    if (result?.doi && !entry.has("doi")) {
      entry.set("doi", result.doi);
      found.push(`doi ${result.doi}  [${result.via}]`);
    }
    if (result?.pdf && !entry.has("pdf")) {
      entry.set("pdf", result.pdf);
      found.push(`pdf ${result.pdf}  [${result.via}]`);
    }
    if (!entry.has("pdf")) {
      const preprint = await arxiv(title);
      if (preprint) {
        entry.set("pdf", preprint);
        found.push(`pdf ${preprint}  [arXiv]`);
      }
    }
  } catch (error) {
    console.warn(`  "${title}": lookup failed: ${(error as Error).message}`);
  }

  if (found.length) {
    filled++;
    console.log(`  "${title}"\n      ${found.join("\n      ")}`);
  } else if (!entry.has("doi")) unresolved.push(title);
  else closed.push(title);
  await sleep(PAUSE_MS);
}

console.log(`\nfilled ${filled} of ${pending.length}`);
if (unresolved.length) {
  console.log("\nnot recognised at all - check the title, or add the DOI by hand:");
  for (const t of unresolved) console.log(`  - ${t}`);
}
if (closed.length) {
  console.log(`\n${closed.length} have a DOI but no open copy anywhere (normal for a paywalled paper):`);
  for (const t of closed) console.log(`  - ${t}`);
}
if (dryRun) console.log("\n--dry-run: nothing written");
else if (filled) {
  writeFileSync(FILE, doc.toString({ lineWidth: 0 }));
  console.log(`\nwrote content/publications.yaml - run \`bun run build\` to check it`);
}
