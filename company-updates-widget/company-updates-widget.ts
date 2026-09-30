import {
  BlockFactory, BlockDefinition, ExternalBlockDefinition, BaseBlock,
} from "@staffbase/widget-sdk";
import { JSONSchema7 } from "json-schema";
import { detectLocale, isRtl, makeT } from "./i18n";
import { AVAILABLE_LOCALES, BUNDLES } from "./strings";

const P = "sbcu";

// ── Config schema ─────────────────────────────────────────────────────────────

const configurationSchema: JSONSchema7 = {
  properties: {
    updates:     { type: "string", title: "Updates (semicolon-separated: Category | Title | Description | Date)", default: "" },
    widgettitle: { type: "string", title: "Widget Title (optional override)", default: "" },
  },
};

const uiSchema = {
  updates: { "ui:widget": "textarea", "ui:help": "Semicolon-separated. Format: Category | Title | Description | Date" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function initial(s: string): string {
  const trimmed = s.trim();
  if (!trimmed) return "?";
  const firstChar = Array.from(trimmed)[0];
  return /\p{Emoji}/u.test(firstChar) ? firstChar : firstChar.toUpperCase();
}

interface CompanyUpdate {
  category: string;
  title: string;
  description: string;
  date: string;
}

function parseUpdates(raw: string): CompanyUpdate[] {
  return raw.split(";")
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const parts = entry.split("|").map(p => p.trim());
      const [category = "", title = "", description = "", date = ""] = parts;
      return title ? { category, title, description, date } : null;
    })
    .filter((u): u is CompanyUpdate => u !== null);
}

// Subtle pastel pill colors per category, with a neutral fallback.
const CATEGORY_COLORS: { [key: string]: { bg: string; fg: string } } = {
  policy:    { bg: "#eef2ff", fg: "#4338ca" },
  product:   { bg: "#ecfdf5", fg: "#047857" },
  hr:        { bg: "#fffbeb", fg: "#92400e" },
  office:    { bg: "#f0f9ff", fg: "#0369a1" },
  marketing: { bg: "#fdf2f8", fg: "#be185d" },
  it:        { bg: "#f5f3ff", fg: "#6d28d9" },
};
const DEFAULT_CATEGORY_COLOR = { bg: "#f3f4f6", fg: "#374151" };

function categoryColor(category: string): { bg: string; fg: string } {
  return CATEGORY_COLORS[category.trim().toLowerCase()] || DEFAULT_CATEGORY_COLOR;
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const HOST_RESET = `
.${P}-root button{
  width:auto!important;min-width:0!important;margin:0!important;
  background:none!important;border:0!important;box-shadow:none!important;
  color:inherit!important;font-family:inherit!important;line-height:normal!important;
  text-transform:none!important;letter-spacing:inherit!important;outline:none!important;
  padding:0;border-radius:0;cursor:pointer;-webkit-appearance:none;appearance:none;
  display:inline-flex;align-items:center;justify-content:center}
.${P}-root ol,.${P}-root ul{list-style:none!important;margin:0!important;padding:0!important}
.${P}-root li{margin:0!important;padding:0!important;list-style:none!important}
.${P}-root h1,.${P}-root h2,.${P}-root h3,.${P}-root h4,.${P}-root h5,.${P}-root h6,
.${P}-root p,.${P}-root figure{margin:0!important;padding:0!important;font-family:inherit!important}
.${P}-root p{color:inherit!important;font-size:inherit!important;font-weight:inherit!important;
  font-style:normal!important;line-height:inherit!important}
.${P}-root img{max-width:none!important;margin:0!important;border-radius:0}
.${P}-root *,.${P}-root *::before,.${P}-root *::after{box-sizing:border-box}
`;

const CSS = `
${HOST_RESET}

.${P}-root{
  background:transparent;
  padding:20px 22px;
  font-family:inherit;
  color:#111827;
  -webkit-font-smoothing:antialiased;
}

.${P}-header{
  display:flex;align-items:center;gap:10px;margin-bottom:16px;
}
.${P}-icon{
  flex:0 0 auto;color:#9ca3af;display:inline-flex;align-items:center;
}
.${P}-title{
  font-size:16px;font-weight:700;color:#111827;flex:1 1 auto;min-width:0;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.${P}-count{
  display:inline-flex;align-items:center;padding:3px 10px;border-radius:99px;flex:0 0 auto;
  font-size:11.5px;font-weight:600;letter-spacing:.01em;
  background:#f3f4f6;color:#6b7280;
}

.${P}-list{display:flex;flex-direction:column}

.${P}-card{
  display:flex;align-items:center;gap:14px;padding:14px 14px;
  border-radius:12px;background:transparent;
  transition:background .18s ease,transform .18s ease;
  animation:${P}-rise .45s cubic-bezier(.16,1,.3,1) both;
  animation-delay:calc(var(--i,0)*60ms);
  margin-bottom:8px;
}
.${P}-card:last-child{margin-bottom:0}
.${P}-card:hover{background:#f9fafb;transform:translateX(3px)}

/* Avatar circle — neutral gray gradient, white category initial */
.${P}-av{
  width:44px;height:44px;border-radius:50%;flex:0 0 auto;
  display:inline-flex;align-items:center;justify-content:center;overflow:hidden;
  background:linear-gradient(140deg,#d1d5db,#9ca3af);
  color:#fff;font-weight:700;font-size:16px;letter-spacing:-.01em;
}
.${P}-av::after{content:attr(data-ini)}

.${P}-info{flex:1 1 auto;min-width:0}
.${P}-root .${P}-name{
  font-size:14px!important;font-weight:600!important;color:#111827!important;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3!important;
}
.${P}-root .${P}-desc{
  font-size:12px!important;color:#6b7280!important;margin-top:2px!important;line-height:1.4!important;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;
}
.${P}-root .${P}-meta{
  font-size:11px!important;color:#9ca3af!important;margin-top:4px!important;line-height:1.3!important;
}

.${P}-pill{
  flex:0 0 auto;padding:4px 11px;border-radius:99px;
  font-size:12px;font-weight:600;white-space:nowrap;
  background:#f3f4f6;color:#374151;
}

.${P}-root .${P}-empty{
  text-align:center;padding:36px 16px;
  color:#9ca3af!important;font-size:13px!important;line-height:1.5!important;
}

@keyframes ${P}-rise{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:none}
}

@media(max-width:380px){
  .${P}-card{flex-wrap:wrap}
  .${P}-pill{margin-top:4px;margin-left:calc(44px + 14px)}
}

@media(prefers-reduced-motion:reduce){
  .${P}-root *,.${P}-root *::before,.${P}-root *::after{
    animation:none!important;transition:none!important}
}
`;

// ── Factory ───────────────────────────────────────────────────────────────────

const factory: BlockFactory = (BaseBlockClass, widgetApi) => {
  return class CompanyUpdatesWidget extends BaseBlockClass implements BaseBlock {
    constructor() { super(); }

    async renderBlock(container: HTMLElement) {
      const attr = (k: string): string => this.getAttribute(k) || "";

      const viewerLang: string | null =
        (widgetApi as any)?.getUserInformation?.()?.language
        || (widgetApi as any)?.getContentLanguage?.()
        || null;
      const locale = detectLocale({ configLocale: viewerLang, available: AVAILABLE_LOCALES }) || "en_US";
      const t   = makeT(BUNDLES, locale);
      const rtl = isRtl(locale);

      const updates = parseUpdates(attr("updates"));

      const heading = attr("widgettitle") || t("widget.title");

      const cardHtml = (u: CompanyUpdate, i: number): string => {
        const { bg, fg } = categoryColor(u.category);
        return `<li class="${P}-card" style="--i:${i}">
          <span class="${P}-av" data-ini="${esc(initial(u.category || u.title))}" aria-hidden="true"></span>
          <div class="${P}-info">
            <p class="${P}-name">${esc(u.title)}</p>
            ${u.description ? `<p class="${P}-desc">${esc(u.description)}</p>` : ""}
            ${u.date ? `<p class="${P}-meta">${esc(u.date)}</p>` : ""}
          </div>
          ${u.category ? `<span class="${P}-pill" style="background:${bg};color:${fg}">${esc(u.category)}</span>` : ""}
        </li>`;
      };

      const cardsHtml = updates.length
        ? `<ul class="${P}-list">${updates.map(cardHtml).join("")}</ul>`
        : `<p class="${P}-empty">${esc(t("state.empty"))}</p>`;

      container.innerHTML = `<style>${CSS}</style>
        <div class="${P}-root" dir="${rtl ? "rtl" : "ltr"}">
          <div class="${P}-header">
            <span class="${P}-icon" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10v4a1 1 0 0 0 1 1h2l1.2 5.24A1 1 0 0 0 8.18 21h1.64a1 1 0 0 0 .98-1.21L9.8 15H12l7 4V5l-7 4H4a1 1 0 0 0-1 1Z" fill="currentColor"/></svg></span>
            <span class="${P}-title">${esc(heading)}</span>
            ${updates.length ? `<span class="${P}-count">${esc(String(updates.length))}</span>` : ""}
          </div>
          ${cardsHtml}
        </div>`;
    }

    disconnectedCallback() {
      // No timers or listeners to tear down.
    }

    static get observedAttributes() {
      return ATTRS;
    }
  };
};

const ATTRS = ["updates", "widgettitle"];

// ── Block registration ────────────────────────────────────────────────────────

const blockDefinition: BlockDefinition = {
  name: "company-updates-widget",
  label: "Company Updates",
  attributes: ATTRS,
  factory,
  configurationSchema,
  uiSchema,
  blockLevel: "block",
  iconUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Crect width='40' height='40' rx='10' fill='%233B82F6'/%3E%3Cg fill='%23fff'%3E%3Cpath d='M9 16v8a2 2 0 0 0 2 2h3l2 6h3l-2-6h4l11 6V8L21 14H11a2 2 0 0 0-2 2Z'/%3E%3C/g%3E%3C/svg%3E",
};

(window as any).defineBlock({ blockDefinition, author: "Staffbase", version: "1.0.0" } as ExternalBlockDefinition);
