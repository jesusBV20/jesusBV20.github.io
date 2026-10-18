import type { Lang } from "./content";

/** Site-relative URL for a page in a language: ("es", "/news") → "/es/news/". */
export function href(lang: Lang, path = "/"): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  const clean = ("/" + path).replace(/\/+/g, "/").replace(/\/$/, "");
  const prefixed = lang === "en" ? clean : `/es${clean}`;
  return `${base}${prefixed}/`.replace(/\/+$/, "/").replace(/\/\/+/g, "/");
}

/** A file under public/ (the CV PDFs). */
export function asset(path: string): string {
  return `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

/** The same page in the other language, from the current URL path. */
export function otherLang(pathname: string, lang: Lang): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  let rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  if (lang === "es") rest = rest.replace(/^\/es(\/|$)/, "/");
  return href(lang === "en" ? "es" : "en", rest);
}
