// Settings, models and providers, and tools.
import { allChats } from "../lib/fixtures.mjs";
import {
  base,
  byok,
  chatSql,
  merge,
  ollama,
  settings,
  signedIn,
} from "../lib/scene.mjs";

const scene = (...extra) =>
  base(merge(signedIn(), { sql: { app: chatSql(allChats) } }, ...extra));
const profile = settings({
  USER_NAME: "Alex",
  SYSTEM_PROMPT_APPENDIX:
    "Keep answers short unless I ask for detail. I live in Portland, Oregon.",
  MEMORY: [
    "Prefers metric units",
    "Works as a product designer at a small startup",
    "Is learning Spanish",
  ],
});

/** Hides everything on the page except `el` and its ancestors, so a card sits on a blank page. */
const showOnly = (el) => {
  for (
    let node = el;
    node.parentElement && node !== document.body;
    node = node.parentElement
  ) {
    for (const sibling of node.parentElement.children) {
      if (sibling !== node) sibling.style.visibility = "hidden";
    }
  }
};

/** Scrolls a settings card into view, shows only that card, and crops to it. */
function section(id, anchor, options = {}) {
  return {
    id,
    route: "/settings",
    viewport: { width: 1200, height: options.height ?? 1000 },
    scene: options.scene ?? scene(profile),
    settle: 3000,
    prepare: async (page, h) => {
      await page
        .locator(`#${anchor}`)
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(500);
      if (options.prepare) await options.prepare(page, h);
      await page.locator(`#${anchor}`).evaluate(showOnly);
    },
    crop: async (page, h) => h.rect(page.locator(`#${anchor}`), 20),
    annotate: options.annotate,
  };
}

/** A dialog on the app's plain dimmed backdrop. */
const dialogShot = (shot) => ({
  isolate: true,
  settle: 3000,
  crop: async (page, h) => h.rect(page.getByRole("dialog").last(), 28),
  ...shot,
});

const homeLab = {
  secrets: {
    "agent-one-custom-provider-api-keys": JSON.stringify({
      "home-lab": "sk-homelab-0000",
    }),
  },
  localStorage: {
    "agent-one-custom-providers": [
      {
        id: "home-lab",
        name: "Home Lab vLLM",
        baseUrl: "http://192.168.1.40:8000/v1",
        headers: {},
        enabled: true,
        models: [
          {
            id: "qwen3-32b",
            name: "Qwen3 32B",
            supportsText: true,
            supportsTools: true,
            supportsImages: false,
            contextWindow: 131072,
          },
          {
            id: "llama-4-scout",
            name: "Llama 4 Scout",
            supportsText: true,
            supportsTools: true,
            supportsImages: true,
            contextWindow: 262144,
          },
        ],
      },
    ],
  },
};

const popover = (page) => page.locator("[data-radix-popper-content-wrapper]");

const openOpenAi = async (page) => {
  await page
    .locator("#setting-built-in-providers input")
    .first()
    .fill("openai");
  await page.waitForTimeout(600);
  await page
    .getByRole("button", { name: "Configure OpenAI provider" })
    .first()
    .click();
  await page.waitForTimeout(900);
};

export default [
  {
    id: "settings/overview",
    route: "/settings",
    viewport: { width: 1100, height: 980 },
    scene: scene(profile),
    settle: 3000,
    frame: "window",
    crop: async (page, h) => {
      const row = await h.rect(
        page.locator("input[value='Prefers metric units']"),
        0,
      );
      return { x: 0, y: 0, width: 1100, height: row.y + row.height + 8 };
    },
    annotate: async (page, h) => {
      const row = await h.rect(
        page.locator("input[value='Prefers metric units']"),
        0,
      );
      const items = [];
      for (const item of await h.all(
        page.locator("nav").first().locator("a, button"),
      )) {
        const box = await item.boundingBox();
        if (box && box.y > 0 && box.y + box.height < row.y + row.height - 8)
          items.push(item);
      }
      return [
        await h.pin(
          page.getByRole("button", { name: /Back to Chat/ }).first(),
          "1",
          { anchor: "l" },
        ),
        await h.pin(
          page.getByRole("button", { name: /Search settings/ }).first(),
          "2",
          { anchor: "l" },
        ),
        await h.box(items, "3", { anchor: "l", align: "start", padding: 8 }),
      ];
    },
  },
  dialogShot({
    id: "settings/search",
    route: "/settings",
    viewport: { width: 1100, height: 760 },
    scene: scene(profile),
    keepFocus: true,
    prepare: async (page) => {
      await page.keyboard.press("Meta+k");
      await page.waitForTimeout(500);
      await page.keyboard.type("theme", { delay: 40 });
      await page.waitForTimeout(800);
    },
  }),
  section("settings/account", "section-account-card-0"),
  section("settings/profile", "section-account-card-1"),
  section("settings/appearance", "section-appearance-card-0"),
  section("settings/background", "section-appearance-card-1", {
    height: 1100,
    prepare: async (page) => {
      await page
        .locator("#setting-chat-background")
        .getByText("Aurora", { exact: true })
        .click();
      await page.waitForTimeout(3000);
      // The selected wallpaper also paints the page behind the card; keep the backdrop plain.
      await page.addStyleTag({
        content:
          '[style*="background-image"]:not(#setting-chat-background *){background-image:none !important;opacity:0 !important}',
      });
    },
  }),
  section("settings/appearance-chat", "section-appearance-card-2"),
  section("settings/chats", "section-chats-card-0", { height: 1200 }),
  section("settings/streaming", "section-chats-card-1"),
  section("settings/titles", "section-chats-card-2"),
  section("settings/keyboard-shortcuts", "section-keyboard-shortcuts", {
    height: 1100,
    annotate: async (page, h) => [
      await h.pin(
        page.locator("#setting-shortcut-stopResponse button").first(),
        "1",
        { anchor: "b", leader: 40 },
      ),
    ],
  }),
  dialogShot({
    id: "settings/shortcut-editor",
    route: "/settings#setting-shortcut-newChat",
    scene: scene(),
    prepare: async (page) => {
      await page.locator("#setting-shortcut-newChat").scrollIntoViewIfNeeded();
      await page.locator("#setting-shortcut-newChat button").first().click();
      await page.waitForTimeout(700);
    },
  }),
  section("settings/performance", "section-performance", { height: 1000 }),
  section("settings/help-and-updates", "section-about", { height: 1200 }),

  // Providers
  section("models/providers", "setting-built-in-providers", {
    scene: scene(byok()),
    prepare: async (page) => {
      await page
        .locator("#setting-built-in-providers input")
        .first()
        .fill("open");
      await page.waitForTimeout(700);
    },
    annotate: async (page, h) => [
      await h.pin(
        page.locator("#setting-built-in-providers input").first(),
        "1",
        { anchor: "l", leader: 30 },
      ),
      await h.pin(
        page
          .getByRole("button", { name: /Configure OpenRouter provider/ })
          .last(),
        "2",
        { anchor: "b", leader: 30 },
      ),
      await h.pin(
        page.getByRole("switch", { name: /Enable OpenRouter/ }).first(),
        "3",
        { anchor: "r", leader: 30 },
      ),
    ],
  }),
  dialogShot({
    id: "models/provider-dialog",
    route: "/settings#setting-built-in-providers",
    viewport: { width: 1200, height: 1000 },
    scene: scene(byok()),
    prepare: async (page) => {
      await openOpenAi(page);
      await page
        .getByRole("dialog")
        .getByPlaceholder("Search models...")
        .fill("gpt-5.5");
      await page.waitForTimeout(600);
    },
    annotate: async (page, h) => [
      await h.box(
        page
          .getByRole("dialog")
          .locator("input[type=password]")
          .first()
          .locator(".."),
        "1",
        { anchor: "t" },
      ),
      await h.pin(
        await h.text(
          page.getByRole("dialog").getByText("HTTP Headers").first(),
        ),
        "2",
        { anchor: "r", leader: 30 },
      ),
      await h.box(
        page.getByRole("dialog").getByPlaceholder("Search models...").first(),
        "3",
        { anchor: "t" },
      ),
      await h.pin(
        page.getByRole("dialog").getByRole("button", { name: /Add Model/ }),
        "4",
        { anchor: "l", leader: 30 },
      ),
    ],
    trimScrollers: true,
  }),
  dialogShot({
    id: "models/add-model",
    route: "/settings#setting-built-in-providers",
    viewport: { width: 1200, height: 1000 },
    scene: scene(byok()),
    prepare: async (page) => {
      await openOpenAi(page);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: /Add Model/ })
        .click();
      await page.waitForTimeout(800);
      const dialog = page.getByRole("dialog").last();
      await dialog
        .getByPlaceholder("e.g. gpt-5")
        .fill("gpt-5.5-research-preview");
      await dialog
        .getByPlaceholder(/Optional label/)
        .fill("GPT-5.5 Research Preview");
      await dialog.getByPlaceholder("e.g. 200000").fill("400000");
      await dialog.getByPlaceholder("e.g. 8192").fill("128000");
      await page.evaluate(() => {
        const dialogs = [...document.querySelectorAll('[role="dialog"]')];
        const overlays = [
          ...document.querySelectorAll('[data-slot="dialog-overlay"]'),
        ];
        for (const el of [...dialogs.slice(0, -1), ...overlays.slice(0, -1)])
          el.style.visibility = "hidden";
      });
      await page.waitForTimeout(300);
    },
  }),
  section("models/local-providers", "setting-local-providers", {
    scene: scene(ollama()),
  }),
  dialogShot({
    id: "models/ollama-dialog",
    route: "/settings#setting-local-providers",
    viewport: { width: 1200, height: 1000 },
    scene: scene(ollama()),
    settle: 3500,
    prepare: async (page) => {
      await page
        .locator("#setting-local-providers")
        .getByRole("button", { name: /Configure Ollama/ })
        .first()
        .click();
      await page.waitForTimeout(900);
    },
  }),
  section("models/custom-providers", "setting-custom-providers", {
    scene: scene(homeLab),
  }),
  dialogShot({
    id: "models/custom-provider-dialog",
    route: "/settings#setting-custom-providers",
    viewport: { width: 1200, height: 1200 },
    scene: scene({
      http: {
        "http://192.168.1.40:8000/v1/models": {
          body: {
            object: "list",
            data: [
              { id: "qwen3-32b", object: "model" },
              { id: "llama-4-scout", object: "model" },
            ],
          },
        },
      },
    }),
    prepare: async (page) => {
      await page
        .locator("#setting-custom-providers")
        .getByRole("button", { name: /Add Provider/ })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: /OpenAI Compatible/ }).click();
      await page.waitForTimeout(900);
      const dialog = page.getByRole("dialog");
      await dialog.getByPlaceholder(/My Local LLM/).fill("Home Lab vLLM");
      await dialog
        .getByPlaceholder(/localhost:1234/)
        .fill("http://192.168.1.40:8000/v1");
      await dialog.getByRole("button", { name: /Auto/ }).click();
      await page.waitForTimeout(1200);
    },
  }),
  section("models/text-to-speech", "setting-tts-providers", {
    prepare: async (page) => {
      await page
        .locator("#setting-tts-providers")
        .getByRole("combobox")
        .first()
        .click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: "OpenAI", exact: true }).click();
      await page.waitForTimeout(600);
    },
  }),
  {
    id: "models/model-selector",
    route: "/chat",
    viewport: { width: 1200, height: 1000 },
    scene: scene(byok()),
    isolate: true,
    keepFocus: true,
    prepare: async (page) => {
      await page.getByRole("button", { name: /^Model:/ }).click();
      await page.waitForTimeout(700);
      await page
        .getByPlaceholder("Search models...")
        .pressSequentially("claude opus 4", { delay: 50 });
      await page.waitForTimeout(800);
    },
    crop: async (page, h) => h.rect(popover(page).first(), 20),
    annotate: async (page, h) => [
      await h.pin(
        [
          popover(page).first().locator("svg.tabler-icon-search").first(),
          page.getByPlaceholder("Search models..."),
        ],
        "1",
        { anchor: "l", leader: 30, gap: 16 },
      ),
      await h.pin(page.getByRole("button", { name: /Filter models/ }), "2", {
        anchor: "r",
        leader: 30,
        gap: 16,
      }),
    ],
    trimScrollers: true,
  },
  {
    id: "models/model-selector-filter",
    route: "/chat",
    viewport: { width: 1200, height: 1000 },
    scene: scene(byok()),
    isolate: true,
    prepare: async (page) => {
      await page.getByRole("button", { name: /^Model:/ }).click();
      await page.waitForTimeout(700);
      await page.getByRole("button", { name: /Filter models/ }).click();
      await page.waitForTimeout(600);
      // Show just the search row and the filter menu: hide the model list and the panel around them.
      await page.getByPlaceholder("Search models...").evaluate((input) => {
        const panel = input.closest("[data-radix-popper-content-wrapper]");
        let row = input;
        while (
          row.parentElement &&
          !row.querySelector("button[aria-label^='Filter']")
        )
          row = row.parentElement;
        for (const el of panel.querySelectorAll("*")) {
          if (el.contains(row)) {
            el.style.background = "transparent";
            el.style.border = "none";
            el.style.boxShadow = "none";
          } else if (!row.contains(el)) el.style.visibility = "hidden";
        }
      });
    },
    crop: async (page, h) =>
      h.rect(
        [
          page
            .getByPlaceholder("Search models...")
            .locator(
              "xpath=ancestor::*[.//button[starts-with(@aria-label,'Filter')]][1]",
            ),
          popover(page).last(),
        ],
        24,
      ),
  },
  {
    id: "models/model-config",
    route: "/chat/chat-lisbon",
    viewport: { width: 1200, height: 1300 },
    scene: scene(),
    isolate: true,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Model configuration" }).click();
      await page.waitForTimeout(900);
    },
    crop: async (page, h) => h.rect(popover(page).first(), 20),
    css: "[data-radix-popper-content-wrapper] * { max-height: none !important; }",
  },
  dialogShot({
    id: "tools/yolo-dialog",
    route: "/chat",
    viewport: { width: 1200, height: 1000 },
    scene: scene(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Model configuration" }).click();
      await page.waitForTimeout(600);
      await page.getByRole("combobox").first().click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /YOLO/ }).click();
      await page.waitForTimeout(900);
    },
    crop: async (page, h) =>
      h.rect(
        page
          .getByRole("alertdialog")
          .or(page.getByRole("dialog").filter({ hasText: "YOLO" }))
          .last(),
        28,
      ),
  }),

  // Tools
  section("tools/settings", "section-tools-card-1", { height: 1000 }),
  section("tools/system-tools", "section-tools-card-4"),
  dialogShot({
    id: "tools/tool-config",
    route: "/settings#setting-tool-run-command",
    scene: scene(),
    prepare: async (page) => {
      await page.locator("#setting-tool-run-command").scrollIntoViewIfNeeded();
      await page
        .locator("#setting-tool-run-command")
        .getByRole("button")
        .first()
        .click();
      await page.waitForTimeout(800);
    },
  }),
  section("tools/chat-history-settings", "section-tools-card-7"),
  section("tools/computer-use-settings", "section-tools-card-8", {
    scene: scene({
      computerUsePermissions: { accessibility: true, screenRecording: false },
    }),
  }),
];
