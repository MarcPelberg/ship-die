// Delivered directly to the browser. The GET form and every link also work without it.
export const archiveSearch = `
const form = document.getElementById("search");
const field = document.getElementById("keyword");
const clear = form.querySelector(".clear");
const feedback = document.getElementById("feedback");
let timer;
let request;
let composing = false;
let replaceSearch = false;

function cancel() {
  clearTimeout(timer);
  if (request) request.abort();
  document.getElementById("catalog").removeAttribute("aria-busy");
  feedback.textContent = "";
}
function reflectValue() {
  clear.hidden = !field.value;
}
async function search(explicit) {
  cancel();
  const url = new URL(form.action);
  for (const [name, raw] of new FormData(form)) {
    const value = String(raw).trim();
    if (value) url.searchParams.set(name, value);
  }
  const controller = new AbortController();
  request = controller;
  const catalog = document.getElementById("catalog");
  catalog.setAttribute("aria-busy", "true");
  feedback.textContent = "Searching…";
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error();
    const page = new DOMParser().parseFromString(await response.text(), "text/html");
    if (controller.signal.aborted) return;
    const nextCatalog = page.getElementById("catalog");
    if (!nextCatalog) throw new Error();
    catalog.replaceWith(nextCatalog);
    document.title = page.title;
    if (location.href !== url.href) {
      if (replaceSearch && !explicit) history.replaceState(null, "", url);
      else history.pushState(null, "", url);
    }
    replaceSearch = !explicit;
    feedback.textContent = "";
    document.getElementById("announcement").textContent = nextCatalog.querySelector("#result-status")?.textContent || "Results updated";
  } catch {
    if (!controller.signal.aborted) {
      feedback.textContent = "Search could not load. Select Search to retry.";
    }
  } finally {
    if (!controller.signal.aborted) document.getElementById("catalog").removeAttribute("aria-busy");
  }
}
function schedule() {
  cancel();
  reflectValue();
  if (!composing) timer = setTimeout(() => search(false), field.value ? 300 : 0);
}
document.documentElement.classList.add("enhanced");
reflectValue();
field.addEventListener("compositionstart", () => { composing = true; cancel(); });
field.addEventListener("compositionend", () => { composing = false; schedule(); });
field.addEventListener("input", schedule);
form.addEventListener("submit", event => {
  event.preventDefault();
  if (!composing) search(true);
});
clear.addEventListener("click", () => {
  field.value = "";
  reflectValue();
  field.focus();
  search(true);
});
document.addEventListener("click", event => {
  const topicLink = event.target.closest?.(".topic-links a");
  if (!topicLink || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  const url = new URL(topicLink.href);
  if (field.value.trim()) url.searchParams.set("q", field.value.trim());
  else url.searchParams.delete("q");
  topicLink.href = url;
});
window.addEventListener("popstate", () => location.reload());
`;
