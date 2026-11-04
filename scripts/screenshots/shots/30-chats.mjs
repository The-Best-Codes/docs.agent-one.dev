// Chatting: the sidebar, message actions, streaming, attachments, compaction, and rich responses.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  allChats,
  approvalChat,
  branchedChat,
  compactedChat,
  olderChats,
  richChat,
  shortChat,
} from "../lib/fixtures.mjs";
import { base, chatSql, merge, settings, signedIn } from "../lib/scene.mjs";

const sources = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../sources",
);
const COMPLETIONS =
  "POST https://www.agent-one.dev/api/openai-compat/v1/chat/completions";
const chats = [
  shortChat,
  richChat,
  approvalChat,
  compactedChat,
  branchedChat,
  ...allChats,
];
const scene = (extra = {}) =>
  base(merge(signedIn(), { sql: { app: chatSql(chats) } }, extra));
const sidebar =
  (height = 560) =>
  async () => ({ x: 0, y: 0, width: 256, height });
const list = (page) => page.locator("[data-tour=chat-list]");
const hideComposer = "[data-testid=chat-form]{visibility:hidden}";
const composerSpace = "[data-testid=chat-form]{margin-bottom:56px}";

const sse = (text) => {
  const chunk = (delta, finish = null) =>
    `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "agent-one-auto", choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`;
  return [
    chunk({ role: "assistant", content: "" }),
    ...text.split(/(?<= )/).map((word) => chunk({ content: word })),
  ];
};

export default [
  {
    id: "chats/sidebar-menu",
    route: "/chat/chat-lisbon",
    hideMain: true,
    reducedMotion: true,
    keepMouse: true,
    scene: scene(),
    prepare: async (page) => {
      const row = list(page).getByText("Draft reply to the landlord");
      await row.hover();
      await page.waitForTimeout(300);
      await row
        .locator(
          "xpath=ancestor::*[.//button[.//*[contains(@class,'tabler-icon-dots-vertical')]]][1]",
        )
        .locator("button:has(.tabler-icon-dots-vertical)")
        .click();
      await page.waitForTimeout(500);
    },
    crop: sidebar(),
    annotate: async (page, h) =>
      Promise.all(
        ["Change Title", "Export Chat", "Delete Chat", "Select Chat"].map(
          (name, i) =>
            h.pin(page.getByRole("menuitem", { name }), String(i + 1), {
              anchor: "r",
              leader: 30,
            }),
        ),
      ),
  },
  {
    id: "chats/search",
    route: "/chat/chat-lisbon",
    hideMain: true,
    scene: scene(),
    settle: 5000,
    keepFocus: true,
    prepare: async (page) => {
      await page
        .getByPlaceholder("Search chats...")
        .pressSequentially("packing", { delay: 60 });
      await page
        .getByText("Searching...")
        .waitFor({ state: "detached", timeout: 10000 })
        .catch(() => {});
      await page.waitForTimeout(800);
    },
    crop: async (page, h) => {
      const r = await h.rect(
        [
          page.getByPlaceholder("Search chats..."),
          list(page).locator("mark").last(),
        ],
        0,
      );
      return { x: 0, y: 0, width: 256, height: r.y + r.height + 48 };
    },
    annotate: async (page, h) => [
      await h.box(page.getByPlaceholder("Search chats..."), undefined, {
        padding: 4,
      }),
    ],
  },
  {
    id: "chats/search-options",
    route: "/chat/chat-lisbon",
    hideMain: true,
    scene: scene(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Search options" }).click();
      await page.waitForTimeout(500);
    },
    crop: sidebar(300),
    annotate: async (page, h) => [
      await h.pin(
        page.getByRole("menuitemcheckbox", { name: "Search content" }),
        "1",
        { anchor: "r", leader: 44 },
      ),
      await h.pin(
        page.getByRole("menuitemcheckbox", { name: "Allow search operators" }),
        "2",
        { anchor: "r", leader: 44 },
      ),
    ],
  },
  {
    id: "chats/selection-mode",
    route: "/chat/chat-lisbon",
    hideMain: true,
    reducedMotion: true,
    scene: scene(),
    prepare: async (page) => {
      await list(page)
        .getByText("Draft reply to the landlord")
        .click({ modifiers: ["Shift"] });
      await page.waitForTimeout(300);
      await list(page).getByText("Meal plan for the week").click();
      await page.waitForTimeout(500);
    },
    crop: sidebar(),
    annotate: async (page, h) => [
      await h.pin(
        page.getByRole("button", { name: /Select All|Deselect All/ }),
        "1",
        { anchor: "t", align: "end" },
      ),
      await h.pin(
        list(page).locator("button:has(svg.tabler-icon-download)").first(),
        "2",
        { anchor: "t" },
      ),
      await h.pin(
        list(page).locator("button:has(svg.tabler-icon-trash)").first(),
        "3",
        { anchor: "t" },
      ),
    ],
  },
  {
    id: "chats/time-groups",
    route: "/chat/chat-lisbon",
    viewport: { width: 1200, height: 1060 },
    hideMain: true,
    scene: base(
      merge(
        signedIn(),
        { sql: { app: chatSql([...chats, ...olderChats]) } },
        settings({ SIDEBAR_CHAT_TIME_GROUPING: true }),
      ),
    ),
    crop: sidebar(1060),
  },
  {
    id: "chats/branch-indicator",
    route: "/chat/chat-branch",
    hideMain: true,
    reducedMotion: true,
    keepMouse: true,
    scene: scene(),
    prepare: async (page) => {
      await list(page).locator("svg.tabler-icon-arrows-split").first().hover();
      await page.waitForTimeout(1200);
    },
    crop: async (page, h) => {
      const tip = await h.rect(page.getByRole("tooltip"), 16);
      return {
        x: 0,
        y: 0,
        width: Math.max(257, tip.x + tip.width),
        height: 300,
      };
    },
  },
  {
    id: "chats/message-actions",
    route: "/chat/chat-short",
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText(/is the classic choice/),
        page.getByRole("button", { name: "Regenerate response" }),
        4,
        20,
      ),
    annotate: async (page, h) => [
      await h.pin(
        page
          .getByRole("button", { name: /Branch conversation/ })
          .locator("xpath=preceding::button[1]"),
        "1",
        { anchor: "l" },
      ),
      await h.pin(
        page.getByRole("button", { name: /Branch conversation/ }),
        "2",
        { anchor: "b" },
      ),
      await h.pin(
        page.getByRole("button", { name: "Regenerate response" }),
        "3",
        { anchor: "r" },
      ),
    ],
  },
  {
    id: "chats/user-message-actions",
    route: "/chat/chat-short",
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Is there a good day trip from Lisbon"),
        page.getByRole("button", { name: "Edit message" }),
        16,
      ),
    annotate: async (page, h) => [
      await h.pin(
        page
          .getByRole("button", { name: "Edit message" })
          .locator("xpath=preceding::button[1]"),
        "1",
        { anchor: "l" },
      ),
      await h.pin(page.getByRole("button", { name: "Edit message" }), "2", {
        anchor: "r",
      }),
    ],
  },
  {
    id: "chats/edit-message",
    route: "/chat/chat-short",
    css: hideComposer,
    scene: scene(),
    keepFocus: true,
    prepare: async (page) => {
      await page.getByRole("button", { name: "Edit message" }).click();
      await page.waitForTimeout(700);
      // Only the edited message matters here; hide the reply below it to make room for markers.
      await page
        .locator("[data-message-index]")
        .last()
        .evaluate((el) => (el.style.visibility = "hidden"));
    },
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Is there a good day trip from Lisbon"),
        page.getByRole("button", { name: /Save/ }).first(),
        20,
      ),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: /Save/ }).first(), "1", {
        anchor: "b",
        leader: 26,
        gap: 16,
      }),
      await h.pin(
        page.getByRole("button", { name: "More options" }).first(),
        "2",
        { anchor: "b", leader: 26, gap: 16 },
      ),
    ],
  },
  {
    id: "chats/streaming-interrupt",
    route: "/chat",
    viewport: { width: 1360, height: 840 },
    css: "[data-testid=chat-form]{margin-bottom:110px}",
    scene: scene({
      http: {
        [COMPLETIONS]: {
          stream: sse(
            "Here are a few dinner ideas that use what's in your fridge. First, a quick vegetable stir-fry with",
          ),
          hang: true,
        },
      },
    }),
    keepFocus: true,
    prepare: async (page) => {
      await page.getByTestId("chat-editor").click();
      await page.keyboard.type(
        "What can I make for dinner with eggs, spinach, and rice?",
      );
      await page.keyboard.press("Enter");
      await page.waitForTimeout(2500);
      await page.getByTestId("chat-editor").click();
      await page.keyboard.type("Actually, make it vegan please");
      await page.waitForTimeout(500);
    },
    crop: async (page, h) => h.rect(page.getByTestId("chat-form"), 20),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: "Stop response" }), "1", {
        anchor: "b",
        gap: 18,
      }),
      await h.pin(
        page
          .getByRole("button", { name: /Interrupt/ })
          .or(page.getByTestId("send-button")),
        "2",
        { anchor: "b", gap: 18, leader: 50 },
      ),
    ],
  },
  {
    id: "chats/attachments",
    route: "/chat",
    css: composerSpace,
    scene: scene(),
    prepare: async (page) => {
      await page
        .locator("input[type=file]")
        .first()
        .setInputFiles([
          {
            name: "quarterly-report.pdf",
            mimeType: "application/pdf",
            buffer: Buffer.alloc(1_240_000, 32),
          },
          {
            name: "whiteboard.png",
            mimeType: "image/png",
            buffer: fs.readFileSync(path.join(sources, "dmg-background.png")),
          },
        ]);
      await page.waitForTimeout(1200);
    },
    crop: async (page, h) => h.rect(page.getByTestId("chat-form"), 20),
    annotate: async (page, h) => [
      await h.pin(page.getByTestId("attach-button"), "1", {
        anchor: "b",
        gap: 14,
      }),
      await h.box(
        await h.all(
          page
            .getByTestId("chat-form")
            .locator(".overflow-x-auto > div.border"),
        ),
        "2",
        { anchor: "r" },
      ),
    ],
  },
  {
    id: "chats/compaction",
    route: "/chat/chat-compacted",
    viewport: { width: 1360, height: 1000 },
    css:
      hideComposer + "[data-message-index] * { max-height: none !important; }",
    scene: scene(),
    prepare: async (page) => {
      await page.getByText("Conversation compacted").click();
      await page.waitForTimeout(700);
      // Show only the compaction divider, its summary, and the action row under it.
      await page.getByText("Conversation compacted").evaluate((label) => {
        const message = label.closest("[data-message-index]");
        for (const other of document.querySelectorAll("[data-message-index]")) {
          if (other !== message) other.style.visibility = "hidden";
        }
        let block = label;
        while (
          block.parentElement &&
          !block.parentElement.matches("[data-message-index]") &&
          !block.querySelector("h2, h3")
        )
          block = block.parentElement;
        for (const el of message.querySelectorAll("p")) {
          if (
            !block.contains(el) &&
            el.getBoundingClientRect().bottom <
              block.getBoundingClientRect().top
          )
            el.style.visibility = "hidden";
        }
      });
      await page
        .getByText("Conversation compacted")
        .evaluate((el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(400);
    },
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Conversation compacted"),
        page
          .getByText(/Write the social posts/)
          .locator("xpath=following::button[3]"),
        16,
        20,
      ),
  },
  {
    id: "chats/rich-response",
    route: "/chat/chat-rich",
    viewport: { width: 1360, height: 1200 },
    css: hideComposer,
    scene: scene(),
    prepare: async (page) => {
      await page
        .getByText("Here's the flow as a diagram")
        .evaluate((el) => el.scrollIntoView({ block: "start" }));
      await page.waitForTimeout(600);
    },
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Here's the flow as a diagram"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        8,
        20,
      ),
  },
  {
    id: "chats/reasoning",
    route: "/chat/chat-rich",
    viewport: { width: 1360, height: 900 },
    css: hideComposer,
    scene: scene(),
    prepare: async (page) => {
      await page.getByText("Reasoning").first().click();
      await page.waitForTimeout(700);
    },
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Reasoning").first(),
        page.getByText("A Mermaid flowchart fits"),
        20,
      ),
  },
  {
    id: "chats/tool-approval",
    route: "/chat/chat-approval",
    viewport: { width: 1360, height: 840 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Move all the screenshots"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        24,
      ),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: "Deny" }), "1", {
        anchor: "b",
        gap: 16,
      }),
      await h.pin(page.getByRole("button", { name: "Approve" }), "2", {
        anchor: "b",
        gap: 16,
      }),
    ],
  },
];
