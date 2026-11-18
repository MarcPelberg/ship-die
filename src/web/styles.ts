export const archiveStyles = `
@font-face { font-family: "Archivo"; font-style: normal; font-weight: 100 900; font-display: optional; src: url("/archivo-latin.woff2") format("woff2"); }
:root {
  color-scheme: light;
  --ink: #182743; --muted: #52647b; --primary: #244ead; --deep: #152d50;
  --signal: #b7dcff; --wash: #e8effb; --surface: #f8faff; --paper: #fff;
  --edge: #c9d4e4; --rail: #7f92aa; --scroll-hover: #536e93; --scroll-active: #314c72;
  --display: "Archivo", "Arial", sans-serif; --body: "Inter", "Segoe UI", sans-serif;
  --code: "IBM Plex Mono", Consolas, "Liberation Mono", monospace;
  --page: 72rem; --radius: .42rem;
  scrollbar-gutter: stable;
}
* { box-sizing: border-box; scrollbar-color: var(--rail) var(--surface); scrollbar-width: auto; }
*::-webkit-scrollbar { width: 12px; height: 10px; }
*::-webkit-scrollbar-track { background: var(--surface); }
*::-webkit-scrollbar-thumb { background: var(--rail); border: 2px solid var(--surface); border-radius: 10px; }
*::-webkit-scrollbar-thumb:hover { background: var(--scroll-hover); }
*::-webkit-scrollbar-thumb:active { background: var(--scroll-active); }
body { margin: 0; background: var(--surface); color: var(--ink); font: 1rem/1.5 var(--body); }
a { color: var(--primary); text-underline-offset: .18em; }
a, button { cursor: pointer; }
a:hover { text-decoration: underline; }
a:active, button:active { opacity: .78; }
:focus-visible { outline: 3px solid var(--primary); outline-offset: 3px; }
.mast :focus-visible { outline-color: var(--signal); }
button, input { font: inherit; }
[hidden] { display: none !important; }
.sr-only,.skip:not(:focus) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.skip:focus { position: absolute; inset: .5rem auto auto .5rem; z-index: 5; background: var(--paper); padding: .5rem; }
.frame { width: min(calc(100% - 5rem), var(--page)); margin-inline: auto; }
.mast { background: var(--deep); color: var(--paper); }
.mast-inner { display: flex; align-items: center; justify-content: space-between; height: 4.2rem; gap: 1rem; }
.brand,.repo { color: inherit; display: inline-flex; align-items: center; text-decoration: none; }
.brand { gap: .8rem; font: 700 1.35rem/1 var(--display); letter-spacing: -.055em; }
.mark { display: grid; place-items: center; width: 2rem; height: 1.75rem; background: var(--signal); color: var(--deep); border-radius: 2px; font: bold 1.15rem/1 var(--code); letter-spacing: -.11em; box-shadow: -3px 3px var(--deep), -4px 4px var(--signal); }
.repo { gap: .45rem; padding: .4rem 0 .4rem .5rem; font: .85rem var(--code); }
.repo span { font-family: var(--body); color: var(--signal); }
.intro { display: flex; align-items: center; justify-content: space-between; gap: 2rem; padding: 2.7rem 0 1.35rem; }
h1,h2,h3,p { margin: 0; }
h1,h2,h3 { font-family: var(--display); }
h1 { font-size: clamp(2.35rem,5.1vw,4rem); letter-spacing: -.065em; line-height: 1.04; }
.intro p { margin-top: .7rem; color: var(--muted); font-size: 1rem; }
.intro strong { color: var(--ink); font: 600 .96em var(--code); }
.index-mark { position: relative; width: 6.8rem; height: 4.3rem; flex: none; margin-right: .75rem; }
.index-mark i { position: absolute; width: 4.15rem; height: 2.9rem; border: 1.5px solid var(--deep); border-radius: .18rem; background: var(--signal); transform: rotate(-13deg); left: .3rem; top: .94rem; }
.index-mark i:nth-child(2) { background: var(--wash); transform: rotate(-3deg); left: 1.15rem; top: .55rem; }
.index-mark i:last-child { left: 2rem; top: .18rem; background: var(--primary); color: var(--paper); transform: rotate(8deg); padding: .35rem .46rem; }
.index-mark b { font: bold 1.25rem/1 var(--code); }
.index-mark b:after { content: ""; position: absolute; bottom: .46rem; left: .52rem; width: 65%; height: 1px; background: var(--signal); }
#search { display: flex; align-items: center; gap: .55rem; background: var(--paper); min-height: 3.6rem; padding: .35rem; border: 1px solid var(--rail); border-radius: var(--radius); }
#search:focus-within { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary); }
.magnifier { flex: none; width: 1rem; height: 1rem; border: 2px solid var(--muted); border-radius: 50%; margin: 0 .33rem 0 .85rem; position: relative; }
.magnifier:after { content: ""; display: block; position: absolute; width: .48rem; height: 2px; background: var(--muted); top: 100%; left: 82%; transform: rotate(45deg); }
#keyword { color: var(--ink); background: transparent; flex: 1; width: 0; min-width: 0; border: 0; padding: .35rem; min-height: 2.5rem; }
#keyword:focus { outline: none; }
#keyword::placeholder { color: var(--muted); }
.enhanced #keyword::-webkit-search-cancel-button { display: none; }
#search button { margin: 0; border: 0; border-radius: .26rem; }
.submit { background: var(--primary); color: var(--paper); font-weight: 650; min-height: 2.75rem; padding: .55rem 1.35rem; }
.submit:hover { background: var(--deep); }
.clear { color: var(--muted); background: transparent; min-width: 2.5rem; min-height: 2.5rem; font-size: 1.45rem; }
.clear:hover { background: var(--wash); }
.search-feedback { display: block; min-height: 1.85rem; padding-top: .16rem; font-size: .82rem; color: var(--muted); }
.search-feedback:empty { padding: 0; }
#catalog { align-items: start; display: grid; grid-template-columns: 13.2rem minmax(0,1fr); gap: clamp(1.75rem,4vw,4rem); padding-bottom: 4rem; }
.topics h2 { font: 600 .76rem/1.4 var(--code); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin: .35rem 0 .8rem .55rem; }
.topic-links { display: grid; gap: .18rem; }
.topic-links a { color: var(--ink); display: flex; gap: .65rem; align-items: center; min-height: 2.68rem; padding: .45rem .58rem; text-decoration: none; border-radius: var(--radius); font-size: .92rem; }
.topic-icon { width: 1.06rem; height: 1.06rem; flex: none; }
.topic-links a:hover { background: var(--wash); text-decoration: underline; }
.topic-links a[aria-current] { background: var(--wash); color: var(--primary); box-shadow: inset 3px 0 var(--primary); font-weight: 650; }
.topic-count { margin-left: auto; font: .75rem/1.3 var(--code); color: var(--muted); }
.resources { min-width: 0; scroll-margin-top: 1rem; }
.list-header { display: flex; align-items: flex-end; justify-content: space-between; gap: .8rem; padding: 0 0 1rem; border-bottom: 2px solid var(--deep); }
.list-header h2 { font: 700 clamp(1.45rem,3vw,1.9rem)/1.15 var(--display); letter-spacing: -.045em; overflow-wrap: anywhere; }
.list-header p,.sort { color: var(--muted); font-size: .83rem; }
.list-header p { margin-top: .18rem; overflow-wrap: anywhere; }
.sort { white-space: nowrap; font: .74rem/1.5 var(--code); }
article { padding: 1.2rem 0 1.25rem; border-bottom: 1px solid var(--edge); overflow-wrap: anywhere; }
.meta,.details { display: flex; align-items: center; flex-wrap: wrap; gap: .5rem; }
.meta { font: .73rem/1.4 var(--code); color: var(--muted); }
.category { display: inline-flex; align-items: center; gap: .33rem; color: var(--primary); font-weight: 600; }
.category .topic-icon { width: .89rem; height: .89rem; }
article h3 { font: 650 clamp(1.24rem,2vw,1.52rem)/1.24 var(--display); letter-spacing: -.032em; margin: .36rem 0 .26rem; }
article h3 a { color: var(--ink); text-decoration: none; }
article h3 a:hover { color: var(--primary); }
.out { color: var(--primary); font: 500 .67em/1 var(--body); }
.summary { color: var(--ink); line-height: 1.5; max-width: 78ch; }
.details { gap: .36rem; margin-top: .65rem; font-size: .76rem; }
.details:empty { display: none; }
.domain { color: var(--muted); margin-right: .25rem; }
.tag { text-decoration: none; color: var(--muted); background: var(--paper); border: 1px solid var(--edge); border-radius: .23rem; padding: .06rem .36rem; }
.tag:hover { color: var(--primary); border-color: var(--primary); }
.pages { display: flex; align-items: center; flex-wrap: wrap; gap: 1rem; margin-top: 1.4rem; font-size: .9rem; color: var(--muted); }
.pages a,.empty a { font-weight: 600; padding-block: .4rem; }
.empty { background: var(--paper); border: 1px solid var(--edge); border-top: none; padding: 2.25rem 1.5rem; }
.empty h3 { font-size: 1.2rem; }
.empty p { margin: .25rem 0 .7rem; color: var(--muted); }
.permalink { margin-left: auto; font: .8rem var(--body); }
.entry { max-width: 52rem; padding: 2rem 0 4rem; }
.back-index { display: inline-block; margin-bottom: 1.25rem; font-size: .95rem; }
.entry article,.entry .empty { border-top: 2px solid var(--deep); }
.entry article { padding-block: 1.5rem 2rem; }
.entry h1 { margin: .75rem 0; font-size: clamp(2rem,5vw,3.2rem); line-height: 1.12; letter-spacing: -.045em; }
.entry .summary { font-size: 1.12rem; line-height: 1.6; }
.entry .details { margin-top: 1rem; }
.entry .domain { font-size: .89rem; }
@media(max-width: 48rem) {
  .frame { width: min(calc(100% - 2rem),var(--page)); }
  .mast-inner { height: 3.65rem; }
  .intro { padding: 1.7rem 0 1.15rem; gap: .65rem; }
  .intro p { margin-top: .5rem; font-size: .95rem; }
  .index-mark { transform: scale(.75); transform-origin: right center; width: 4.95rem; margin-right: 1.4rem; }
  #catalog { display: block; padding-bottom: 2.5rem; }
  .topics h2 { margin: 0 0 .4rem; }
  .topic-links { display: flex; overflow-x: auto; padding: .25rem .2rem .6rem; gap: .4rem; }
  .topic-links a { flex: none; border: 1px solid var(--edge); background: var(--paper); min-height: 2.55rem; gap: .4rem; padding-inline: .55rem; font-size: .85rem; }
  .topic-links a[aria-current] { border-color: var(--primary); box-shadow: inset 0 -2px var(--primary); }
  .topic-count { margin-left: .14rem; }
  .resources { margin-top: 1.3rem; }
  .list-header { padding-bottom: .75rem; }
}
@media(max-width: 30rem) {
  .index-mark { display: none; }
  .magnifier { margin-left: .4rem; margin-right: .05rem; }
  #search { gap: .3rem; }
  .submit { padding-inline: .7rem; }
}
@media(forced-colors: active) {
  * { scrollbar-color: auto; }
  .topic-links a[aria-current] { outline: 2px solid Highlight; outline-offset: -2px; }
  .mark,.index-mark i { border: 1px solid CanvasText; }
}
@media(prefers-reduced-motion: reduce) { * { scroll-behavior: auto; } }
`;
