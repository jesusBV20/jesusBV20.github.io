import type { Lang } from "./content";

/** The CV PDF for a language, under public/cv/ (written by tools/build-cv.ts). */
export const pdfName = (lang: Lang) =>
  lang === "en" ? "Jesus_Bautista_Villar_CV.pdf" : "Jesus_Bautista_Villar_CV_ES.pdf";
