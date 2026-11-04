// Captures every docs screenshot from the real AgentOne frontend (served by serve-app.mjs)
// and writes the annotated PNGs to public/images/docs/.
//
//   node scripts/screenshots/serve-app.mjs &
//   node scripts/screenshots/capture.mjs [id-filter]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright-core";

import { renderAnnotated } from "./lib/annotate.mjs";
import { NOW } from "./lib/scene.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(here, "../../public/images/docs");
const rawDir = process.env.RAW_DIR;
const port = process.env.PORT ?? 1430;
const filter = process.argv[2];

const shotFiles = fs
  .readdirSync(path.join(here, "shots"))
  .filter((f) => f.endsWith(".mjs"))
  .sort();
const shots = [];
for (const file of shotFiles) {
  const mod = await import(path.join(here, "shots", file));
  shots.push(...mod.default);
}

const selected = shots.filter(
  (shot) => !shot.skip && (!filter || shot.id.includes(filter)),
);
if (!selected.length) {
  console.error(`No shots match "${filter}"`);
  process.exit(1);
}

const helpers = {
  async rect(target, padding = 0) {
    const locators = Array.isArray(target) ? target : [target];
    const boxes = [];
    for (const locator of locators) {
      const box = await locator
        .first()
        .boundingBox()
        .catch(() => null);
      if (!box) throw new Error(`Element not visible: ${locator}`);
      boxes.push(box);
    }
    const x = Math.min(...boxes.map((b) => b.x)) - padding;
    const y = Math.min(...boxes.map((b) => b.y)) - padding;
    const right = Math.max(...boxes.map((b) => b.x + b.width)) + padding;
    const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + padding;
    return { x, y, width: right - x, height: bottom - y };
  },
  async box(target, marker, options = {}) {
    return {
      type: "box",
      rect: await helpers.rect(target),
      marker,
      ...options,
    };
  },
  /** Every element a locator matches, for annotating a group (like the rail's ticks). */
  async all(locator) {
    const count = await locator.count();
    return Array.from({ length: count }, (_, i) => locator.nth(i));
  },
  /** A crop spanning the chat column's full width, from the top of `from` to the bottom of `to`. */
  async column(page, from, to, padY = 24, padBottom = padY) {
    const form = await helpers.rect(page.getByTestId("chat-form"));
    const span = await helpers.rect([from, to]);
    return {
      x: form.x - 24,
      width: form.width + 48,
      y: span.y - padY,
      height: span.height + padY + padBottom,
    };
  },
  /** The box around an element's visible text, rather than the element (for full-width rows and links). */
  async text(locator) {
    const box = await locator.first().evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      const r = range.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    return {
      boundingBox: async () => box,
      first() {
        return this;
      },
      toString: () => `text(${locator})`,
    };
  },
  /** Like `all`, but only elements fully inside the viewport (for lists that scroll). */
  async visible(locator, page, margin = 24) {
    const { height } = page.viewportSize();
    const out = [];
    for (const item of await helpers.all(locator)) {
      const box = await item.boundingBox();
      if (box && box.y >= margin && box.y + box.height <= height - margin)
        out.push(item);
    }
    return out;
  },
  async pin(target, marker, options = {}) {
    return {
      type: "pin",
      rect: await helpers.rect(target),
      marker,
      ...options,
    };
  },
  async marker(target, marker, options = {}) {
    return {
      type: "marker",
      rect: await helpers.rect(target),
      marker,
      ...options,
    };
  },
  async label(target, text, options = {}) {
    return {
      type: "label",
      rect: await helpers.rect(target),
      text,
      ...options,
    };
  },
};

// Only hides things that blink or depend on the OS. Animations are left alone: the app's
// scroll fades are scroll-driven animations, so overriding animation timing breaks them.
// macOS uses overlay scrollbars that are hidden when idle, so scrollbars are hidden too.
const CAPTURE_CSS = `
  *, *::before, *::after { caret-color: transparent !important; }
  ::-webkit-scrollbar { display: none; }
  * { scrollbar-width: none !important; }
  .cm-cursor, .cm-dropCursor { display: none !important; }
`;

// `isolate`: show a dialog or popover on the app's plain dimmed backdrop, without the
// blurred page behind it (dialogs and popovers render outside #root).
const ISOLATE_CSS = `
  #root { visibility: hidden !important; }
  [data-slot="dialog-overlay"] { backdrop-filter: none !important; }
`;
// `hideMain`: blank out the chat pane so sidebar shots have clean space for markers.
const HIDE_MAIN_CSS = `
  [data-testid="chat-main"], div:has(> button[aria-label$="usage stats"]) { visibility: hidden !important; }
`;

const browser = await chromium.launch({ channel: "chrome" });
let failures = 0;

for (const shot of selected) {
  const viewport = shot.viewport ?? { width: 1200, height: 760 };
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: shot.theme === "dark" ? "dark" : "light",
    // Stops hover marquees from scrolling titles mid-capture.
    reducedMotion: shot.reducedMotion ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(shot.timeout ?? 8000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const scene = shot.scene ?? {};
    await page.addInitScript(
      ([scene]) => {
        window.__DOCS_SCENE__ = scene;
        let seed = scene.seed ?? 7;
        Math.random = () =>
          ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
        for (const [key, value] of Object.entries(scene.localStorage ?? {})) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      },
      [scene],
    );
    if (shot.html) await page.setContent(shot.html);
    else if (shot.image)
      await page.setContent(
        `<body style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(path.join(here, "sources", shot.image)).toString("base64")}" style="display:block;width:${viewport.width}px;height:${viewport.height}px"></body>`,
      );
    else
      await page.goto(
        shot.url ?? `http://localhost:${port}${shot.route ?? "/"}`,
      );
    await page
      .waitForLoadState(
        shot.url || shot.html || shot.image ? "load" : "networkidle",
      )
      .catch(() => {});
    await page.waitForTimeout(shot.settle ?? 2500);
    await page.addStyleTag({
      content:
        CAPTURE_CSS + (shot.hideMain ? HIDE_MAIN_CSS : "") + (shot.css ?? ""),
    });
    if (shot.prepare) await shot.prepare(page, helpers);
    // Hide rows that a scroll area cuts in half, so lists end cleanly on a row boundary.
    if (shot.trimScrollers) {
      await page.evaluate(() => {
        for (const scroller of document.querySelectorAll("*")) {
          const style = getComputedStyle(scroller);
          if (
            !/(auto|scroll)/.test(style.overflowY) ||
            scroller.scrollHeight <= scroller.clientHeight + 4
          )
            continue;
          const bottom = scroller.getBoundingClientRect().bottom;
          for (const el of scroller.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            const parent = el.parentElement.getBoundingClientRect();
            const straddles = r.top < bottom && r.bottom > bottom + 1;
            const parentIsRowContainer =
              el.parentElement === scroller || parent.height > 120;
            if (straddles && r.height <= 120 && parentIsRowContainer)
              el.style.visibility = "hidden";
            if (r.top >= bottom) el.style.visibility = "hidden";
          }
        }
      });
    }
    // Isolation hides the page, so it's applied after the steps that interact with it.
    if (shot.isolate) await page.addStyleTag({ content: ISOLATE_CSS });
    if (!shot.keepFocus)
      await page.evaluate(() => document.activeElement?.blur?.());
    if (!shot.keepMouse)
      await page.mouse.move(viewport.width - 2, viewport.height / 2);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(shot.afterPrepare ?? 1200);

    const annotations = shot.annotate ? await shot.annotate(page, helpers) : [];
    const crop = shot.crop ? await shot.crop(page, helpers) : undefined;
    const png = await page.screenshot();
    if (rawDir) {
      fs.mkdirSync(rawDir, { recursive: true });
      fs.writeFileSync(
        path.join(rawDir, `${shot.id.replaceAll("/", "__")}.png`),
        png,
      );
    }
    const warnings = [];
    const final = await renderAnnotated(browser, png, viewport, annotations, {
      frame: shot.frame ?? (crop ? "plain" : shot.url ? "browser" : "window"),
      title:
        shot.title ??
        (shot.url
          ? shot.url.replace(/^https:\/\//, "").replace(/\/$/, "")
          : "AgentOne"),
      theme: shot.theme,
      spotlight: shot.spotlight,
      crop,
      warnings,
      textured: shot.textured,
    });
    const file = path.join(outDir, `${shot.id}.png`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, final);
    for (const warning of warnings) console.log(`  ⚠ ${shot.id}: ${warning}`);
    console.log(
      `✓ ${shot.id}${errors.length ? `  (page errors: ${errors.length})` : ""}`,
    );
  } catch (error) {
    failures++;
    console.error(`✗ ${shot.id}: ${error.message.split("\n")[0]}`);
    if (rawDir)
      await page.screenshot({
        path: path.join(rawDir, `FAILED__${shot.id.replaceAll("/", "__")}.png`),
      });
  } finally {
    await context.close();
  }
}

await browser.close();
process.exit(failures ? 1 : 0);
