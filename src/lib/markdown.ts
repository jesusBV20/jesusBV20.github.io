/**
 * Inline Markdown for text that comes from YAML: [label](url), **bold**,
 * *italic*, `code`. Anything else is escaped. Block Markdown (paragraphs,
 * lists) belongs in the .md files, which Astro renders itself.
 */
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function inline(text: string): string {
  return escape(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
      const external = /^https?:/.test(url);
      return `<a href="${url}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
    });
}
