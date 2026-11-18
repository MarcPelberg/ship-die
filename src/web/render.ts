import { CANONICAL_TYPES } from "../domain/taxonomy.js";
import type { CanonicalType } from "../domain/types.js";

export const PAGE_SIZE = 24;

export type PublicCard = {
  title: string;
  summary: string;
  canonicalType: CanonicalType;
  tags: string[];
  sourceUrl?: string;
  sourceNote: string;
  publishedAt: Date;
};

export type RenderHomeInput = {
  query: string;
  type: string;
  cards: PublicCard[];
  counts?: Partial<Record<CanonicalType, number>>;
  page?: number;
  unavailable?: boolean;
};

const labels: Record<CanonicalType, string> = {
  "agent harness": "Agent harnesses",
  "skill/workflow pack": "Skills & workflows",
  "memory/state": "Memory & state",
  model: "Models",
  "review/eval": "Reviews & evals",
  tool: "Tools",
  infra: "Infrastructure"
};
const glyphs: Record<CanonicalType | "all", string> = {
  all: "M3 3h6v6H3z M13 3h6v6h-6z M3 13h6v6H3z M13 13h6v6h-6z",
  "agent harness": "M5 5h12v12H5z M8 2v3m6-3v3m-6 12v3m6-3v3M2 8h3m-3 6h3M17 8h3m-3 6h3 M9 9h4v4H9z",
  "skill/workflow pack": "M4 4h5v5H4z M13 13h5v5h-5z M9 6h6v7 M6 9v7h7",
  "memory/state": "m2 7 9-5 9 5-9 5z M2 11l9 5 9-5 M2 15l9 5 9-5",
  model: "m11 2 8 5v9l-8 5-8-5V7z M3 7l8 5 8-5 M11 12v9",
  "review/eval": "M3 4h16v13H9l-4 4v-4H3z M7 10l3 3 5-6",
  tool: "M7 4 2 10l5 6 M15 4l5 6-5 6 M13 3l-4 15",
  infra: "M3 4h16v6H3z M3 13h16v6H3z M6 7h1 M6 16h1"
};
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const number = new Intl.NumberFormat("en-US");

function icon(type: CanonicalType | "all"): string {
  return `<svg class="topic-icon" aria-hidden="true" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"><path d="${glyphs[type]}"/></svg>`;
}

export function archiveUrl(query: string, type: string, page = 1): string {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (type) params.set("type", type);
  if (page > 1) params.set("page", String(page));
  return params.size ? `/?${params}` : "/";
}

export function renderHome(input: RenderHomeInput): string {
  const { query, type, cards, page = 1 } = input;
  const counts = input.counts ?? cards.reduce<Partial<Record<CanonicalType, number>>>((result, card) => {
    result[card.canonicalType] = (result[card.canonicalType] ?? 0) + 1;
    return result;
  }, {});
  const all = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const total = type ? counts[type as CanonicalType] ?? 0 : all;
  const topic = labels[type as CanonicalType];
  const heading = query ? "Search results" : topic ?? "All resources";
  const title = input.unavailable ? "Archive unavailable" : query ? `Results for “${query}”` : topic ?? "Resource index";
  const topicLink = (value: CanonicalType | "") => {
    const selected = value === type;
    const count = value ? counts[value] ?? 0 : all;
    return `<a href="${escapeHtml(archiveUrl(query, value))}"${selected ? ' aria-current="page"' : ""}>
      ${icon(value || "all")}<span>${value ? escapeHtml(labels[value]) : "All resources"}</span>
      ${input.unavailable ? "" : `<span class="topic-count">${number.format(count)}</span>`}</a>`;
  };
  let list: string;
  if (input.unavailable) {
    list = `<div class="empty"><h3>The archive is unavailable</h3><p>Try loading these results again.</p><a href="${escapeHtml(archiveUrl(query, type, page))}">Try again</a></div>`;
  } else if (!cards.length) {
    list = query || type
      ? '<div class="empty"><h3>No matching resources</h3><p>Try another keyword or browse every topic.</p><a href="/">Browse all resources</a></div>'
      : '<div class="empty"><h3>No resources yet</h3><p>Published entries will appear here.</p></div>';
  } else {
    list = cards.map(renderCard).join("");
  }
  const pages = Math.ceil(total / PAGE_SIZE);
  const pager = (n: number, label: string) => `<a href="${escapeHtml(archiveUrl(query, type, n))}#results">${label}</a>`;
  const status = total > PAGE_SIZE
    ? `${number.format((page - 1) * PAGE_SIZE + 1)}–${number.format(Math.min(page * PAGE_SIZE, total))} of ${number.format(total)} resources`
    : `${number.format(total)} resource${total === 1 ? "" : "s"}`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Ship != Die</title>
<meta name="description" content="Search tools, models, and workflows shared in the /Ship!=Die builder group.">
<link rel="preload" href="/archivo-latin.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/archive.css"><script src="/archive.js" defer></script></head>
<body><a class="skip" href="#results">Skip to resources</a>
<header class="mast"><div class="frame mast-inner">
  <a class="brand" href="/" aria-label="Ship != Die home"><span class="mark" aria-hidden="true">!=</span>Ship != Die</a>
  <a class="repo" href="https://github.com/MarcPelberg/ship-die">GitHub <span aria-hidden="true">↗</span></a>
</div></header>
<main class="frame">
  <div class="intro"><div><h1>Resource index</h1><p>Tools, models, and workflows shared in the <strong>/Ship!=Die</strong> builder group.</p></div>
    <div class="index-mark" aria-hidden="true"><i></i><i></i><i><b>!=</b></i></div>
  </div>
  <form id="search" action="/" method="get" role="search" novalidate>
    <label for="keyword" class="sr-only">Search the resource index</label><span class="magnifier" aria-hidden="true"></span>
    <input id="keyword" type="search" name="q" value="${escapeHtml(query)}" placeholder="Search tools, models, workflows…" autocomplete="off">
    ${type ? `<input type="hidden" name="type" value="${escapeHtml(type)}">` : ""}
    <button class="clear" type="button" aria-label="Clear search" title="Clear search" hidden>×</button>
    <button class="submit" type="submit">Search</button>
  </form>
  <span id="feedback" class="search-feedback" role="status"></span><span id="announcement" class="sr-only" role="status"></span>
  <div id="catalog">
    <nav class="topics" aria-label="Browse topics"><h2>Topics</h2><div class="topic-links">${topicLink("")}${CANONICAL_TYPES.map(topicLink).join("")}</div></nav>
    <section class="resources" id="results" aria-labelledby="result-heading" tabindex="-1">
      <div class="list-header"><div><h2 id="result-heading">${escapeHtml(heading)}</h2>
      ${input.unavailable ? "" : `<p id="result-status">${escapeHtml(status)}${query ? ` for “${escapeHtml(query)}”` : ""}${query && topic ? ` in ${escapeHtml(topic)}` : ""}</p>`}</div>
      ${cards.length ? `<span class="sort">${query ? "Best match" : "Newest first"}</span>` : ""}</div>
      ${list}
      ${pages > 1 ? `<nav class="pages" aria-label="Result pages">${page > 1 ? pager(page - 1, "← Previous") : ""}<span>Page ${number.format(page)} of ${number.format(pages)}</span>${page < pages ? pager(page + 1, "Next →") : ""}</nav>` : ""}
    </section>
  </div>
</main></body></html>`;
}

function renderCard(card: PublicCard): string {
  let source: URL | undefined;
  try {
    const url = new URL(card.sourceUrl ?? "");
    if (["https:", "http:"].includes(url.protocol) && !url.username && !url.password) source = url;
  } catch { /* Entries without a public URL still carry their summary. */ }
  const date = card.publishedAt.toISOString().slice(0, 10);
  const title = escapeHtml(card.title);
  return `<article>
    <div class="meta"><span class="category">${icon(card.canonicalType)}${escapeHtml(labels[card.canonicalType])}</span><span class="dot" aria-hidden="true">·</span><time datetime="${date}">${dateFormat.format(card.publishedAt)}</time></div>
    <h3>${source ? `<a href="${escapeHtml(source.href)}" rel="nofollow noreferrer">${title} <span class="out" aria-hidden="true">↗</span></a>` : title}</h3>
    <p class="summary">${escapeHtml(card.summary)}</p>
    <div class="details">${source || card.sourceNote ? `<span class="domain">${escapeHtml(source ? source.hostname.replace(/^www\./, "") : card.sourceNote)}</span>` : ""}
      ${card.tags.map(tag => `<a class="tag" href="${escapeHtml(archiveUrl(tag, ""))}" aria-label="Search for ${escapeHtml(tag)}">${escapeHtml(tag)}</a>`).join("")}
    </div>
  </article>`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
