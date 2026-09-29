// Genera el PDF del manual con Edge (playwright-core): portada sin pie de página y cuerpo
// con número de página; después se unen las dos partes (ver README de docs/manual).
import { chromium } from "playwright-core";
const M = new URL("../manual/", import.meta.url);
const out = (f) => new URL(f, M).pathname.slice(1);
const b = await chromium.launch({ channel: "msedge" });
const p = await b.newPage();
const footer = '<div style="width:100%;font-family:Arial;font-size:7.5px;color:#8a8a8a;padding:0 16mm;display:flex;justify-content:space-between"><span>Real Herramientas Stock · Manual de uso</span><span class="pageNumber"></span></div>';
await p.goto(new URL("manual.html?part=cover", M).href, { waitUntil: "networkidle" }); await p.addStyleTag({ content: "@page { margin: 0 !important; } .cover { height: 296mm !important; }" }); await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: out("_cover.pdf"), format: "A4", printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
await p.goto(new URL("manual.html?part=body", M).href, { waitUntil: "networkidle" }); await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: out("_body.pdf"), format: "A4", printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: footer });
await b.close(); console.log("pdfs ok");
