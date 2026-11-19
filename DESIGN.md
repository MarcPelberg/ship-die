---
version: alpha
name: Ship != Die
description: A resource index for builders finding tools shared in their WhatsApp group.
colors:
  ink: "#182743"
  muted: "#52647B"
  primary: "#244EAD"
  deep: "#152D50"
  signal: "#B7DCFF"
  wash: "#E8EFFB"
  surface: "#F8FAFF"
  paper: "#FFFFFF"
  edge: "#C9D4E4"
  rail: "#7F92AA"
  scroll-hover: "#536E93"
  scroll-active: "#314C72"
  error: "#933423"
typography:
  display:
    fontFamily: "Archivo, Arial, sans-serif"
  body:
    fontFamily: "Inter, Segoe UI, sans-serif"
  code:
    fontFamily: "IBM Plex Mono, Consolas, Liberation Mono, monospace"
rounded:
  control: "0.42rem"
spacing:
  page: "72rem"
components:
  search:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
  search-button:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
  topics-selected:
    backgroundColor: "{colors.wash}"
    textColor: "{colors.primary}"
  masthead:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.paper}"
  mark:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.deep}"
  metadata:
    textColor: "{colors.muted}"
  divider:
    backgroundColor: "{colors.edge}"
  scroll-track:
    backgroundColor: "{colors.surface}"
  scroll-thumb:
    backgroundColor: "{colors.rail}"
  scroll-thumb-hover:
    backgroundColor: "{colors.scroll-hover}"
  scroll-thumb-active:
    backgroundColor: "{colors.scroll-active}"
  field-error:
    textColor: "{colors.error}"
---

# Ship != Die design system

## Overview

The public archive is a working reference for builders returning to something they saw in the group. A small stack of blue index cards carries the group’s inequality sign. The rest of the page gives space to searching, scanning summaries and opening sources. The interface uses English and shows the original post date in UTC.

## Colors

Deep blue anchors the masthead. Ink and muted text separate resource titles from dates and domains. Blue identifies links and focus. The pale wash and an inset rule identify the selected topic. The runtime owner is the global stylesheet in `src/web/styles.ts`. Each color above maps to the CSS property with the same name prefixed by `--`.

## Typography

Self-hosted Archivo sets the wordmark, headings and titles. System sans faces keep summaries readable on phones. Monospace marks topic labels, dates and counts. Each family maps directly to the matching `--display`, `--body` or `--code` variable.

## Layout

Search spans the page. The archive shares its 72rem frame with topic navigation and the reading column. At 48rem the topics become a horizontal list above results. Document scrolling keeps complete titles, long tags and pagination reachable. The search status owns a reserved line.

## Elevation & Depth

Offset sheets belong to the wordmark. A two-pixel line starts the list, and lighter dividers separate entries. Resource summaries sit on a single continuous surface.

## Shapes

Search and topic links use the control radius. Topic icons use open, single-color strokes. The search button keeps its width during requests. Focus rings sit outside controls except for the search field, which highlights the enclosing search surface.

## Components

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
|---|---|---|---|---|
| Form | Search and join form renderers | `src/web/render.ts`, `src/web/search.ts` | Search, clear, join request and retry | Keyboard search, join field associations, validation focus and recovery |
| Scrollbar | Global stylesheet | `src/web/styles.ts` | Document and mobile topic list | Narrow viewport and forced-colors inspection |
| Archive navigation | Topic links, source links and page links | `src/web/render.ts`, `src/web/server.ts` | All, filtered, empty and unavailable | Render tests and browser history |

Topic counts follow the search across all categories. Active topic, query and page belong in the URL. Search waits 300 ms while typing, waits through composition, and cancels superseded requests. Errors keep the current results available. Enter and the clear control act immediately. With scripts off, the form and every navigation link use ordinary GET requests.

Every resource has a permanent entry URL using its stored slug. The index keeps source links on titles and includes a separate permalink. The entry view repeats the same date, topic, summary and tags, with a link back to the index.

The homepage introduces the WhatsApp group, places its join request directly beneath the introduction, and explains what visitors can find in the public index. The masthead links to the request on the other pages. The form describes organizer review and collects a name, international WhatsApp number and background. The confirmation shows a receipt. Invalid fields retain their values and reference specific correction text. The first invalid field receives focus.

## Do's and Don'ts

- Give resource titles the strongest emphasis in the list. Show the source domain and the original post date.
- Preserve the active query when switching topics and reset paging when the search changes.
- Keep private conversations, identities, phone numbers and reader status outside the public interface.
