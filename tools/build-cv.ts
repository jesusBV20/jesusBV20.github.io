/**
 * Builds the CV PDFs from content/ - run before `astro build` (see package.json).
 *
 *   content/profile.yaml, cv.yaml, publications.yaml, talks.yaml
 *     → .cv/cv.<lang>.yaml          (RenderCV input, one per language)
 *     → public/cv/<file>.pdf         (served at /cv/… and linked from /cv)
 *
 * RenderCV (Python, Typst) is run through `uvx`, pinned below, so neither a
 * Python install nor a TeX distribution is needed - `uv` fetches both the
 * right Python and RenderCV on first use and caches them.
 *
 *   bun run cv             build both PDFs
 *   bun run cv -- --yaml   only write the RenderCV YAML (no PDF)
 */
import { mkdirSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { stringify } from "yaml";
import sharp from "sharp";
import {
  content,
  tr,
  label,
  untranslatedReport,
  LANGS,
  CONTENT_DIR,
  PUB_KINDS,
  type Lang,
  type CvSection,
} from "../src/lib/content.ts";
import { pdfName } from "../src/lib/cv-files.ts";

const RENDERCV = "rendercv[full]==2.8";
const PYTHON = "3.12";
const ROOT = resolve(import.meta.dirname, "..");
const WORK = join(ROOT, ".cv");
const OUT = join(ROOT, "public", "cv");
const SITE = process.env.SITE_URL ?? "https://jesusbv20.github.io";


const yamlOnly = process.argv.includes("--yaml");
const { profile, cv, publications, talks } = content();

/**
 * RenderCV reads a quoted "2023" as January 2023; a bare year must be a number
 * to print as just "2023". YYYY-MM and "present" pass through.
 */
const date = (d: string | undefined) => (d !== undefined && /^\d{4}$/.test(d) ? Number(d) : d);

function bold(authors: string): string[] {
  return authors.split(/,\s*/).map((a) => (profile.authorNames.includes(a.trim()) ? `**${a.trim()}**` : a.trim()));
}

function sectionsFor(lang: Lang): Record<string, unknown[]> {
  const out: Record<string, unknown[]> = {};
  out[label("cv.about", lang)] = [tr(profile.bio, lang).replace(/\s+/g, " ")];

  const build: Record<CvSection, () => void> = {
    education: () => {
      out[label("cv.education", lang)] = cv.education.map((e) => ({
        institution: tr(e.institution, lang),
        area: tr(e.area, lang),
        degree: tr(e.degree, lang),
        ...(e.start ? { start_date: date(e.start), end_date: date(e.end) } : { date: date(e.end) }),
        location: tr(e.location, lang) || undefined,
        summary: tr(e.summary, lang) || undefined,
        highlights: e.highlights.map((h) => tr(h, lang)),
      }));
    },
    experience: () => {
      out[label("cv.experience", lang)] = cv.experience.map((e) => ({
        company: tr(e.organization, lang),
        position: tr(e.position, lang),
        start_date: date(e.start),
        end_date: date(e.end),
        location: tr(e.location, lang) || undefined,
        summary: tr(e.summary, lang) || undefined,
        highlights: e.highlights.map((h) => tr(h, lang)),
      }));
    },
    publications: () => {
      // Same split as the PDF has always had: journals, conferences, under review, notes.
      for (const kind of ["journal", "conference", "preprint", "technote"] as const) {
        const list = publications.filter((p) => p.kind === kind);
        if (!list.length) continue;
        out[label(`cv.${kind}`, lang)] = list.map((p) => {
          const doi = p.doi?.match(/doi\.org\/(10\..+)$/)?.[1];
          return {
            title: p.title,
            authors: bold(p.authors),
            journal: p.venue,
            date: p.year,
            ...(doi ? { doi } : { url: p.doi ?? p.pdf }),
          };
        });
      }
    },
    talks: () => {
      out[label("cv.talks", lang)] = talks.map((t) => ({
        name: `*${t.title}*`,
        date: date(t.date),
        location: tr(t.location, lang) || undefined,
        summary: `${t.event}${t.kind === "talk" ? "" : ` (${label(`talk.${t.kind}`, lang).toLowerCase()})`}`,
      }));
    },
    awards: () => {
      out[label("cv.awards", lang)] = cv.awards.map((a) => ({
        name: tr(a.title, lang),
        date: date(a.date),
        summary: tr(a.detail, lang) || undefined,
      }));
    },
    skills: () => {
      out[label("cv.skills", lang)] = cv.skills.map((s) => ({ label: tr(s.label, lang), details: tr(s.details, lang) }));
    },
    languages: () => {
      out[label("cv.languages", lang)] = cv.languages.map((s) => ({ label: tr(s.label, lang), details: tr(s.details, lang) }));
    },
  };

  for (const section of cv.sections) build[section]();
  // RenderCV rejects an empty section; drop any (e.g. awards: []).
  for (const [k, v] of Object.entries(out)) if (!v.length) delete out[k];
  return out;
}

function rendercvInput(lang: Lang) {
  const out = join(WORK, `out-${lang}`);
  return {
    cv: {
      name: profile.name,
      headline: tr(profile.role, lang),
      location: tr(profile.location, lang),
      email: profile.email,
      photo: join(WORK, "photo.jpg"),
      website: lang === "en" ? SITE : `${SITE}/es`,
      social_networks: profile.links.map((l) => ({ network: l.network, username: l.id })),
      sections: sectionsFor(lang),
    },
    // Spanish degree names ("Doctorado", "Máster") need a wider column than PhD/MSc.
    design: { theme: cv.theme, entries: { degree_width: lang === "es" ? "1.9cm" : "1.1cm" } },
    locale: { language: lang === "en" ? "english" : "spanish" },
    settings: {
      current_date: "today",
      pdf_title: `${profile.name} - CV`,
      render_command: {
        output_folder: out,
        pdf_path: join(out, pdfName(lang)),
        dont_generate_markdown: true,
        dont_generate_html: true,
        dont_generate_png: true,
      },
    },
  };
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });

// The site's photo can be a large PNG; the PDF only needs a small JPEG.
await sharp(join(CONTENT_DIR, profile.photo))
  .resize({ width: 600, height: 600, fit: "cover", position: "attention" })
  .jpeg({ quality: 85, mozjpeg: true })
  .toFile(join(WORK, "photo.jpg"));

for (const lang of LANGS) {
  const file = join(WORK, `cv.${lang}.yaml`);
  writeFileSync(
    file,
    "# Generated by tools/build-cv.ts from content/ - do not edit, edit content/ instead.\n" +
      stringify(rendercvInput(lang), { lineWidth: 0 }),
  );
  if (yamlOnly) {
    console.log(`wrote ${file}`);
    continue;
  }

  const run = spawnSync("uvx", ["--quiet", "--python", PYTHON, "--from", RENDERCV, "rendercv", "render", file], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (run.error) throw new Error(`could not run uvx (is uv installed?): ${run.error.message}`);
  if (run.status !== 0) {
    console.error(run.stdout, run.stderr);
    throw new Error(`RenderCV failed for ${lang} - the message above names the field (in .cv/cv.${lang}.yaml)`);
  }
  copyFileSync(join(WORK, `out-${lang}`, pdfName(lang)), join(OUT, pdfName(lang)));
  console.log(`cv: public/cv/${pdfName(lang)}`);
}

const missing = untranslatedReport();
if (missing.length) {
  console.log(`\ncv: ${missing.length} text(s) have no Spanish yet and use English:`);
  for (const m of missing) console.log(`  - ${m}…`);
}

// Keep PUB_KINDS referenced so a new kind added there is noticed here.
void PUB_KINDS;
