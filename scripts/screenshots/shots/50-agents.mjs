// Extensions, scheduled agents, agent tools in chat, updates.
import {
  allChats,
  computerUseChat,
  historyChat,
  subagentChat,
} from "../lib/fixtures.mjs";
import { base, chatSql, merge, signedIn } from "../lib/scene.mjs";

const chats = [subagentChat, historyChat, computerUseChat, ...allChats];
const scene = (...extra) =>
  base(merge(signedIn(), { sql: { app: chatSql(chats) } }, ...extra));

const agents = [
  {
    id: "sa-briefing",
    type: "scheduled-agent",
    title: "Daily briefing",
    schedule: "0 7 * * 1-5",
    enabled: true,
    prompt:
      "Give me a short morning briefing: today's weather in Portland, the top 5 tech headlines, and anything on my calendar.",
    modelId: null,
    modelConfig: null,
    delayCutoffSeconds: 300,
  },
  {
    id: "sa-downloads",
    type: "scheduled-agent",
    title: "Tidy Downloads folder",
    schedule: "0 18 * * 5",
    enabled: true,
    prompt:
      "Move files older than 30 days from ~/Downloads into ~/Downloads/Archive and tell me what you moved.",
    modelId: null,
    modelConfig: null,
    delayCutoffSeconds: -1,
  },
  {
    id: "sa-prices",
    type: "scheduled-agent",
    title: "Flight price check",
    schedule: "0 9 * * *",
    enabled: false,
    prompt:
      "Search for round-trip flights from PDX to Lisbon for the first week of December and report the cheapest option.",
    modelId: null,
    modelConfig: null,
    delayCutoffSeconds: 300,
  },
];
const withAgents = (...extra) => scene({ scheduledAgents: agents }, ...extra);
const hideComposer = "[data-testid=chat-form]{visibility:hidden}";

/** A dialog on the app's plain dimmed backdrop. */
const dialogShot = (shot) => ({
  isolate: true,
  settle: 3500,
  crop: async (page, h) => h.rect(page.getByRole("dialog").last(), 28),
  ...shot,
});

const openInstall = (query) => async (page) => {
  await page.getByPlaceholder("Search extensions...").fill(query);
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Install" }).first().click();
  await page.waitForTimeout(1200);
};

const openCustom = async (page) => {
  await page.getByRole("button", { name: /Add Custom/ }).click();
  await page.waitForTimeout(900);
};

const filterButton = (page) =>
  page
    .getByRole("button", { name: /Filter/ })
    .or(page.locator("button:has(svg.tabler-icon-filter)"))
    .first();

const scheduledList = (annotate) => ({
  route: "/scheduled-agents",
  viewport: { width: 1100, height: 560 },
  scene: withAgents(),
  settle: 3000,
  crop: async (page, h) => {
    const r = await h.rect(
      [
        page.getByRole("button", { name: "Back" }).first(),
        page.getByRole("switch").last(),
      ],
      0,
    );
    return {
      x: r.x - 32,
      y: 0,
      width: r.width + 64,
      height: r.y + r.height + 40,
    };
  },
  annotate,
});

export default [
  // Extensions
  {
    id: "extensions/browse",
    route: "/extensions",
    viewport: { width: 1000, height: 760 },
    scene: scene(),
    settle: 3500,
    crop: async (page) => {
      const bottom = await page
        .getByRole("button", { name: "Install" })
        .nth(1)
        .evaluate((button) => {
          let card = button.parentElement;
          while (
            (card && !/\brounded/.test(card.className)) ||
            (card && card.getBoundingClientRect().height < 80)
          )
            card = card.parentElement;
          return card.getBoundingClientRect().bottom;
        });
      return { x: 0, y: 0, width: 1000, height: bottom + 6 };
    },
    annotate: async (page, h) => [
      await h.pin(page.getByPlaceholder("Search extensions..."), "1", {
        anchor: "t",
        leader: 40,
      }),
      await h.pin(
        page
          .getByRole("button", { name: /Filter/ })
          .or(page.locator("button:has(svg.tabler-icon-filter)"))
          .first(),
        "2",
        { anchor: "t", leader: 40 },
      ),
      await h.pin(page.getByRole("button", { name: /Add Custom/ }), "3", {
        anchor: "t",
        leader: 22,
      }),
      await h.pin(page.getByRole("button", { name: "Install" }).first(), "4", {
        anchor: "l",
        leader: 30,
      }),
    ],
    prepare: async (page) => {
      // Give the toolbar room above it for markers, without changing anything inside it.
      // The margin goes on the whole toolbar (search, filter, and Add Custom), so the
      // search group and the button stay aligned.
      await page.getByPlaceholder("Search extensions...").evaluate((input) => {
        let row = input;
        while (
          row.parentElement &&
          ![...row.querySelectorAll("button")].some((button) =>
            /Add Custom/.test(button.textContent ?? ""),
          )
        )
          row = row.parentElement;
        row.style.marginTop = "40px";
      });
      await page.waitForTimeout(400);
    },
  },
  {
    id: "extensions/filters",
    route: "/extensions",
    viewport: { width: 1000, height: 760 },
    scene: scene(),
    settle: 3500,
    isolate: true,
    prepare: async (page) => {
      await filterButton(page).click();
      await page.waitForTimeout(600);
    },
    crop: async (page, h) =>
      h.rect(page.locator("[data-radix-popper-content-wrapper]").first(), 24),
  },
  dialogShot({
    id: "extensions/install-dialog",
    route: "/extensions",
    viewport: { width: 1200, height: 1100 },
    scene: scene(),
    prepare: openInstall("context7"),
  }),
  dialogShot({
    id: "extensions/install-remote",
    route: "/extensions",
    viewport: { width: 1200, height: 1000 },
    scene: scene(),
    prepare: openInstall("linear"),
  }),
  dialogShot({
    id: "extensions/add-custom",
    route: "/extensions",
    viewport: { width: 1200, height: 1200 },
    scene: scene(),
    prepare: async (page) => {
      await openCustom(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .getByPlaceholder(/Everything Server|Server name/)
        .fill("Filesystem");
      await dialog
        .getByPlaceholder(/npx -y/)
        .fill("npx -y @modelcontextprotocol/server-filesystem ~/Documents");
      await page.waitForTimeout(300);
    },
  }),
  dialogShot({
    id: "extensions/add-custom-http",
    route: "/extensions",
    viewport: { width: 1200, height: 1200 },
    scene: scene(),
    prepare: async (page) => {
      await openCustom(page);
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("combobox").first().click();
      await page.waitForTimeout(300);
      await page.getByRole("option", { name: /HTTP/ }).click();
      await page.waitForTimeout(500);
      await dialog
        .getByPlaceholder(/Everything Server|Server name/)
        .fill("Team Wiki");
      await dialog
        .getByPlaceholder("https://mcp.example.com/api")
        .fill("https://wiki.example.com/mcp");
    },
  }),
  dialogShot({
    id: "extensions/deep-link-prefill",
    route: `/extensions?mcpName=${encodeURIComponent("Filesystem")}&mcpType=stdio&mcpCommand=${encodeURIComponent("npx -y @modelcontextprotocol/server-filesystem ~/Documents")}`,
    viewport: { width: 1200, height: 1200 },
    scene: scene(),
  }),

  // Scheduled agents
  {
    id: "scheduled-agents/list",
    ...scheduledList(async (page, h) => [
      await h.box(page.getByPlaceholder("Search scheduled agents"), "1", {
        anchor: "l",
        padding: 2,
      }),
      await h.pin(page.getByRole("button", { name: "New" }), "2", {
        anchor: "r",
        leader: 30,
      }),
      await h.pin(page.getByRole("switch").first(), "3", {
        anchor: "r",
        leader: 30,
      }),
    ]),
  },
  { id: "scheduled-agents/list-plain", ...scheduledList() },
  {
    id: "scheduled-agents/editor",
    route: "/scheduled-agents",
    viewport: { width: 1000, height: 1000 },
    scene: withAgents(),
    settle: 3000,
    prepare: async (page) => {
      await page.getByText("Daily briefing").first().click();
      await page.waitForTimeout(800);
      // Show only the open agent, so its card closes cleanly at the bottom.
      for (const title of ["Tidy Downloads folder", "Flight price check"]) {
        await page
          .getByText(title)
          .first()
          .evaluate((el) => {
            let item = el;
            while (
              item.parentElement &&
              !item.parentElement.querySelector("[role=switch]")
            )
              item = item.parentElement;
            while (
              item.parentElement &&
              item.parentElement.querySelectorAll("[role=switch]").length === 1
            )
              item = item.parentElement;
            item.style.display = "none";
          });
      }
      await page
        .getByPlaceholder("Search scheduled agents")
        .evaluate((input) => {
          let row = input;
          while (row.parentElement && !row.querySelector("button"))
            row = row.parentElement;
          row.style.visibility = "hidden";
        });
      await page.waitForTimeout(300);
    },
    crop: async (page, h) =>
      h.rect(
        page
          .getByRole("button", { name: "Save" })
          .locator(
            "xpath=ancestor::*[contains(@class,'rounded') and contains(@class,'border')][last()]",
          ),
        20,
      ),
  },
  dialogShot({
    id: "scheduled-agents/new",
    route: "/scheduled-agents",
    viewport: { width: 1200, height: 900 },
    scene: withAgents(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "New" }).click();
      await page.waitForTimeout(800);
    },
  }),
  dialogShot({
    id: "scheduled-agents/new-manual",
    route: "/scheduled-agents",
    viewport: { width: 1200, height: 1000 },
    scene: withAgents(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "New" }).click();
      await page.waitForTimeout(800);
      await page.getByText("or enter manually").click();
      await page.waitForTimeout(700);
    },
  }),
  {
    id: "scheduled-agents/run-in-sidebar",
    route: "/chat",
    hideMain: true,
    reducedMotion: true,
    keepMouse: true,
    scene: withAgents(),
    prepare: async (page) => {
      await page
        .locator("[data-tour=chat-list] svg.tabler-icon-clock-play")
        .first()
        .hover();
      await page.waitForTimeout(1200);
      // The tooltip covers the row above; hide that row so no stray letters peek out beside it.
      await page.evaluate(() => {
        const tip = document
          .querySelector("[role=tooltip]")
          ?.getBoundingClientRect();
        if (!tip) return;
        for (const el of document.querySelectorAll("[data-tour=chat-list] *")) {
          const r = el.getBoundingClientRect();
          if (r.height < 60 && r.bottom > tip.top && r.top < tip.bottom)
            el.style.visibility = "hidden";
        }
      });
    },
    crop: async (page, h) => {
      const tip = await h.rect(page.getByRole("tooltip"), 16);
      return {
        x: 0,
        y: 0,
        width: Math.max(257, tip.x + tip.width),
        height: 760,
      };
    },
    trimScrollers: true,
  },

  // Agent tools in chat
  {
    id: "tools/subagents",
    route: "/chat/chat-subagent",
    viewport: { width: 1360, height: 900 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Compare Obsidian, Notion"),
        page
          .getByText("is the easiest fit")
          .locator("xpath=following::button[3]"),
        28,
      ),
  },
  {
    id: "tools/chat-history",
    route: "/chat/chat-history",
    viewport: { width: 1360, height: 840 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("What did we decide"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        24,
      ),
  },
  {
    id: "tools/computer-use",
    route: "/chat/chat-computer-use",
    viewport: { width: 1360, height: 840 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Open System Settings and turn on"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        24,
      ),
  },

  // Updates
  dialogShot({
    id: "installation/update-available",
    route: "/chat",
    scene: scene({
      update: {
        rid: 1,
        currentVersion: "1.2.0",
        version: "1.2.1",
        date: "2026-11-10",
        body: "Bug fixes and improvements.",
        rawJson: {},
      },
    }),
  }),
  dialogShot({
    id: "installation/release-notes",
    route: "/chat",
    viewport: { width: 1200, height: 1000 },
    scene: scene({
      localStorage: { "agent-one-release-notes-last-seen-version": "1.1.3" },
    }),
  }),
];
