import { CANONICAL_TYPES } from "../domain/taxonomy.js";
import type { CanonicalType } from "../domain/types.js";

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
};

export function renderHome(input: RenderHomeInput): string {
  const query = escapeHtml(input.query);
  const selectedType = escapeHtml(input.type);
  const cardsHtml = input.cards.length > 0
    ? input.cards.map(renderCard).join("")
    : `<section class="empty"><h2>No cards found</h2><p>Try a broader search.</p></section>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Ship != Die</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #161616;
      --muted: #606060;
      --line: #d8d8d8;
      --paper: #f7f7f3;
      --panel: #ffffff;
      --accent: #0f766e;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--paper);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      font-size: 16px;
      line-height: 1.5;
    }
    main {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 56px;
    }
    header {
      border-bottom: 2px solid var(--ink);
      padding-bottom: 18px;
    }
    h1 {
      margin: 0;
      font-size: 30px;
      line-height: 1.1;
      letter-spacing: 0;
    }
    .dek {
      margin: 8px 0 0;
      color: var(--muted);
      max-width: 680px;
    }
    form {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 220px auto;
      gap: 10px;
      margin: 22px 0 14px;
    }
    input, select, button {
      min-height: 42px;
      border: 1px solid var(--ink);
      border-radius: 4px;
      background: var(--panel);
      color: var(--ink);
      font: inherit;
      padding: 8px 10px;
    }
    button {
      background: var(--ink);
      color: white;
      cursor: pointer;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0 0 18px;
    }
    .filter {
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--ink);
      display: inline-flex;
      padding: 5px 10px;
      text-decoration: none;
    }
    .filter.active {
      border-color: var(--accent);
      color: var(--accent);
      font-weight: 700;
    }
    .status {
      border-block: 1px solid var(--line);
      color: var(--muted);
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 0;
      margin-bottom: 12px;
    }
    .list {
      display: grid;
      gap: 10px;
    }
    article {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      display: grid;
      grid-template-columns: 116px minmax(0, 1fr) 168px;
      gap: 16px;
      padding: 16px;
    }
    time, .type, .source, .tags {
      color: var(--muted);
      font-size: 14px;
    }
    h2 {
      margin: 0 0 4px;
      font-size: 20px;
      line-height: 1.25;
      letter-spacing: 0;
    }
    p {
      margin: 0;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 10px;
    }
    .tag {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 2px 7px;
    }
    .source {
      overflow-wrap: anywhere;
      text-align: right;
    }
    a {
      color: var(--accent);
    }
    .empty {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 28px;
    }
    @media (max-width: 760px) {
      main { width: min(100% - 24px, 1120px); padding-top: 22px; }
      form { grid-template-columns: 1fr; }
      .status { display: block; }
      article { grid-template-columns: 1fr; gap: 8px; }
      .source { text-align: left; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Ship != Die</h1>
      <p class="dek">Raw cards for tools, workflows, models, infra, memory, and evals worth finding again.</p>
    </header>
    <form method="get" action="/">
      <input type="search" name="q" value="${query}" placeholder="Search cards" aria-label="Search cards">
      <select name="type" aria-label="Canonical type">
        <option value=""${input.type === "" ? " selected" : ""}>All types</option>
        ${CANONICAL_TYPES.map((type) => `<option value="${escapeHtml(type)}"${type === input.type ? " selected" : ""}>${escapeHtml(type)}</option>`).join("")}
      </select>
      <button type="submit">Search</button>
    </form>
    <nav class="filters" aria-label="Canonical type filters">
      ${renderFilter("All", "", input.query, input.type === "")}
      ${CANONICAL_TYPES.map((type) => renderFilter(type, type, input.query, type === input.type)).join("")}
    </nav>
    <section class="status" aria-label="Result status">
      <span>${input.cards.length} card${input.cards.length === 1 ? "" : "s"}</span>
      <span>query: ${query || "all"} / type: ${selectedType || "all"}</span>
    </section>
    <section class="list" aria-label="Cards">
      ${cardsHtml}
    </section>
  </main>
</body>
</html>`;
}

function renderCard(card: PublicCard): string {
  const publishedDate = card.publishedAt.toISOString().slice(0, 10);
  const source = card.sourceUrl
    ? `<a href="${escapeHtml(card.sourceUrl)}" rel="nofollow noreferrer">${escapeHtml(card.sourceNote)}</a>`
    : escapeHtml(card.sourceNote);
  const tags = card.tags.length > 0
    ? `<div class="tags">${card.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";

  return `<article>
  <time datetime="${publishedDate}">${publishedDate}</time>
  <div>
    <div class="type">${escapeHtml(card.canonicalType)}</div>
    <h2>${escapeHtml(card.title)}</h2>
    <p>${escapeHtml(card.summary)}</p>
    ${tags}
  </div>
  <div class="source">${source}</div>
</article>`;
}

function renderFilter(label: string, value: string, query: string, active: boolean): string {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
  }
  if (value) {
    params.set("type", value);
  }
  const href = params.size > 0 ? `/?${params.toString()}` : "/";
  return `<a class="filter${active ? " active" : ""}" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
