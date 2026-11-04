// Runs the app's real extension-list sync against the public MCP registry, then saves a
// curated subset of entries as SQL so extension screenshots use real registry data.
//   node scripts/screenshots/snapshot-registry.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "fixtures/registry.sql.json");
const wanted = (
  process.env.WANTED ??
  "github,notion,slack,linear,stripe,sentry,canva,figma,playwright,filesystem,postgres,supabase,cloudflare,vercel,atlassian,hubspot,asana,airtable,zapier,brave,exa,firecrawl,context7,todoist,spotify,google-maps,obsidian,discord,gmail,calendar"
).split(",");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage();
await page.addInitScript(() => {
  window.__DOCS_SCENE__ = {
    passthrough: ["https://registry.modelcontextprotocol.io/"],
    localStorage: { "agent-one-onboarding-completed": true },
  };
  localStorage.setItem("agent-one-onboarding-completed", "true");
});
await page.goto(`http://localhost:${process.env.PORT ?? 1430}/chat`);
const deadline = Date.now() + Number(process.env.SYNC_MS ?? 240000);
let count = 0;
while (Date.now() < deadline) {
  await page.waitForTimeout(5000);
  count = await page.evaluate(async () => {
    const db = await window.__DOCS_DB__("sqlite:mcp-registry.db");
    return db.selectValue(
      "SELECT COUNT(*) FROM registry_entries WHERE is_latest = 1",
    );
  });
  const done = await page.evaluate(async () => {
    const db = await window.__DOCS_DB__("sqlite:mcp-registry.db");
    return db.selectValue(
      "SELECT initial_complete FROM registry_sync WHERE id = 1",
    );
  });
  console.log(`entries: ${count}${done ? " (complete)" : ""}`);
  if (done) break;
}

const rows = await page.evaluate(async (wanted) => {
  const db = await window.__DOCS_DB__("sqlite:mcp-registry.db");
  const all = db.exec({
    sql: "SELECT * FROM registry_entries WHERE is_latest = 1 AND status = 'active'",
    rowMode: "object",
    returnValue: "resultRows",
  });
  const picked = [];
  for (const term of wanted) {
    const matches = all
      .filter((r) => `${r.name} ${r.title}`.toLowerCase().includes(term))
      .sort((a, b) => a.name.length - b.name.length)
      .slice(0, 2);
    for (const m of matches) if (!picked.includes(m)) picked.push(m);
  }
  return { total: all.length, picked };
}, wanted);

const q = (v) =>
  v == null
    ? "NULL"
    : typeof v === "number"
      ? String(v)
      : `'${String(v).replaceAll("'", "''")}'`;
const sql = rows.picked.map(
  (r) =>
    `INSERT INTO registry_entries (name, version, is_latest, status, updated_at, title, description, keywords, has_stdio, has_http, summary_json, entry_json) VALUES (${[r.name, r.version, r.is_latest, r.status, r.updated_at, r.title, r.description, r.keywords, r.has_stdio, r.has_http, r.summary_json, r.entry_json].map(q).join(", ")});`,
);
sql.push("UPDATE registry_sync SET initial_complete = 1 WHERE id = 1;");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ total: rows.total, sql }, null, 1));
console.log(`saved ${rows.picked.length} of ${rows.total} entries to ${out}`);
await browser.close();
