// Runs JS against a harness page for picking selectors:
//   SCENE=scene.json node scripts/screenshots/inspect.mjs /route "expression"
import fs from "node:fs";

import { chromium } from "playwright-core";

const scene = process.env.SCENE
  ? JSON.parse(fs.readFileSync(process.env.SCENE, "utf8"))
  : {};
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } });
await page.addInitScript(
  ([scene]) => {
    window.__DOCS_SCENE__ = scene;
    for (const [k, v] of Object.entries(scene.localStorage ?? {}))
      localStorage.setItem(k, JSON.stringify(v));
  },
  [scene],
);
await page.goto(
  `http://localhost:${process.env.PORT ?? 1430}${process.argv[2] ?? "/"}`,
);
await page.waitForTimeout(Number(process.env.WAIT ?? 4000));
if (process.env.PRE)
  await new Function("page", `return (async () => { ${process.env.PRE} })()`)(
    page,
  );
console.log(JSON.stringify(await page.evaluate(process.argv[3]), null, 1));
await browser.close();
