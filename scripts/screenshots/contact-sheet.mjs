// Renders a grid of captured images into one PNG for quick review.
//   node scripts/screenshots/contact-sheet.mjs out.png img1.png img2.png ...
import fs from "node:fs";

import { chromium } from "playwright-core";

const [out, ...files] = process.argv.slice(2);
const cells = files
  .map(
    (f) =>
      `<figure><img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}"><figcaption>${f.split("/images/docs/")[1] ?? f}</figcaption></figure>`,
  )
  .join("");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1600, height: 800 } });
await page.setContent(`<style>body{margin:0;background:#ddd;font:14px sans-serif;display:grid;grid-template-columns:repeat(2,1fr);gap:8px;padding:8px}
figure{margin:0;background:#bbb}img{width:100%;display:block}figcaption{padding:2px 6px}</style>${cells}`);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
