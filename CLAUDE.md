# Jesús Bautista Villar - personal website

Astro (static), Tailwind v4, Bun - served by GitHub Pages at
<https://jesusbv20.github.io> (repo `jesusBV20/jesusBV20.github.io`). English at
`/`, Spanish at `/es/`. The CV PDF (both languages) is generated from the same
data with [RenderCV](https://docs.rendercv.com) on every build, so the website
and the CV can never disagree. Everything on the site comes from `content/`.

Modelled on the Swarm Systems Lab site (`~/Workspace/ssl_web`) - same tools,
same "drop a folder, run the build" workflow, same OpenAlex tool - but a
personal architecture: the profile and the CV are the centre, not a lab's
collections.

---

## For adding content

Say what you want in plain words; Claude does the rest:

> "Add a news post: we flew the new formation at the airfield, video is https://youtu.be/…"
> "Add my new paper <title>, submitted to IEEE T-RO, with Héctor" · "Add the CDC 2026 talk"
> "I started a research stay at …" · "Translate the latest news to Spanish"

Claude should put the files in the right place, fill in the fields, run
`bun run build`, and say what changed. **Always run the build before reporting
done** - the schemas catch mistakes there and nowhere else.

| Adding                          | Goes in                                                              |
| ------------------------------- | -------------------------------------------------------------------- |
| a news post                     | copy `content/news/_template/` → `content/news/YYYY-MM-DD-slug/`     |
| a research topic                | copy `content/research/_template/`                                   |
| a paper                         | top of its list in `content/publications.yaml`, then enrich (below)  |
| a talk or poster                | top of `content/talks.yaml`                                          |
| a job, degree, award, skill     | `content/cv.yaml` (the CV page and both PDFs update)                 |
| bio, role, links, photo         | `content/profile.yaml`                                               |
| interface words (both langs)    | `content/ui.yaml`                                                    |

**Papers**: only `title`, `authors`, `venue`, `year` are needed by hand. Then
`bun run publications:enrich` fills `doi`/`pdf` from OpenAlex (title search,
first among works linked to the ORCID in profile.yaml) and arXiv; never
overwrites. `-- --verify` checks DOIs against Crossref. Google Scholar is never
scraped (no API, terms forbid it). Link a paper to research topics with
`topics: [folder-name]`; `featured: true` puts it on the front page.

**Bilingual text**: any YAML text is `"same in both"` or `{ en: "…", es: "…" }`.
Markdown folders take `index.md` (required) + optional `index.es.md`; date,
videos and pictures are read from the English file only. Missing Spanish falls
back to English (news posts then show a "only in English" note);
`bun run cv` lists the YAML texts still untranslated.

**Pictures are found, not listed**: drop images in an entry's folder; the first
by name is the cover. YouTube videos go in frontmatter `videos: [id]` and load
nothing from Google until clicked.

**The CV**: `cv.yaml` `sections:` chooses which sections appear and their
order; `theme:` picks the RenderCV look. Name spellings that should be bold in
author lists live in `profile.yaml` `authorNames` (the build stops if a paper
lists none of them).

---

## For working on the site

```sh
bun install
bun run dev          # localhost:4321 (uses the last-built CV PDFs)
bun run cv           # CV PDFs only → public/cv/ (uvx fetches Python 3.12 + RenderCV 2.8)
bun run build        # CV + site → dist/   (this is the real test)
bunx astro check
```

Requires `bun` and `uv` (no system Python or TeX needed).

```
content/                 everything an editor touches (see table above)
src/lib/content.ts       YAML loading + zod schemas, shared by the site AND tools/build-cv.ts
src/lib/entries.ts       news/research folders → per-language entries with fallback
src/lib/pictures.ts      folder pictures and content/ image paths
src/views/*.astro        one view per page type, rendered for both languages
src/pages/ and pages/es/ two-line wrappers choosing the language
tools/build-cv.ts        content → .cv/cv.<lang>.yaml → RenderCV → public/cv/*.pdf
tools/enrich-publications.ts   OpenAlex/arXiv/Crossref lookups (run by hand)
.github/workflows/deploy.yml   push to main → build → GitHub Pages
```

Principles carried over from ssl_web: content is files, code is code (no page
holds words - they are in ui.yaml); failures are loud and name the file and
field; network lookups never run during the build.

---

## State and open items (2026-10-18)

- Built and verified locally (53 pages, both CVs). **Not yet on GitHub**: the
  repo `jesusBV20.github.io` must be created and Pages set to "GitHub Actions".
- Content migrated from the Google Site (16 news posts with their YouTube
  videos; text verbatim, English only) and from `~/Workspace/latex/CV_Short`.
  Google Sites did not expose the news photos - add them to the post folders.
- Papers seeded from `ssl_web/content/publications.yaml`; abstracts from the
  LaTeX sources in `~/Workspace/latex`. 9 of 10 have Crossref-verified DOIs.
- The research topic texts were drafted from the abstracts - review them.
- Co-author naming differs between papers: "J. Castellanos" (TAC) vs
  "J. Jiménez" (CDC); the group site also has "J Bautista" (fixed here).
- After going live: point the group site's member page link
  (`ssl_web/content/team/members/jesus-bautista-villar/index.md`) and the old
  Google Site to the new address.
