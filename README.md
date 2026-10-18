# jesusbv20.github.io

Personal website and CV of Jesús Bautista Villar - <https://jesusbv20.github.io>.

Everything comes from `content/`; every push to `main` rebuilds the CV PDF
(English and Spanish, with [RenderCV](https://docs.rendercv.com)) and the site
([Astro](https://astro.build)) and publishes them with GitHub Pages.

```sh
bun install
bun run dev                    # local preview
bun run build                  # CV PDFs + site → dist/
bun run publications:enrich    # fill missing DOI/PDF from OpenAlex + arXiv
```

Needs [Bun](https://bun.sh) and [uv](https://docs.astral.sh/uv/) (uv fetches
Python and RenderCV for the CV). See `CLAUDE.md` for where each kind of content
goes.
