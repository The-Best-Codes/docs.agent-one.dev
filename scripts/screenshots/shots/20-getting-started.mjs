// First run, the app layout, and the account menu.
import { allChats } from "../lib/fixtures.mjs";
import { base, chatSql, merge, signedIn } from "../lib/scene.mjs";

const AUTH = "https://www.agent-one.dev/api/auth";
const wide = { width: 1360, height: 980 };
export const withChats = (extra = {}) =>
  base(merge(signedIn(), { sql: { app: chatSql(allChats) } }, extra));

const onboarding = (extra = {}) =>
  merge(
    {
      localStorage: {
        "agent-one-release-notes-last-seen-version": "1.2.2",
        "agent-one-last-model-directory-sync-timestamp": Date.now(),
        "agent-one-last-extension-list-sync-timestamp": Date.now(),
      },
    },
    { localStorage: { "agent-one-setting-THEME": "light" } },
    extra,
  );

const deviceFlow = {
  http: {
    [`POST ${AUTH}/device/code`]: {
      body: {
        device_code: "demo-device-code",
        user_code: "KQ7MWX4D",
        verification_uri: "https://www.agent-one.dev/device",
        verification_uri_complete:
          "https://www.agent-one.dev/device?user_code=KQ7MWX4D",
        expires_in: 1800,
        interval: 5,
      },
    },
    [`POST ${AUTH}/device/token`]: {
      status: 400,
      body: { error: "authorization_pending" },
    },
  },
  ipc: { "plugin:opener|open_url": null },
};

const expandUsage = async (page) => {
  const expand = page.getByRole("button", { name: "Expand usage stats" });
  if (await expand.count()) await expand.click();
  await page.waitForTimeout(500);
};

const composerSpace = "[data-testid=chat-form]{margin-bottom:56px}";

export default [
  {
    id: "overview/hero",
    route: "/chat/chat-lisbon",
    viewport: wide,
    prepare: expandUsage,
    scene: withChats(),
  },
  {
    id: "overview/hero-dark",
    route: "/chat/chat-lisbon",
    viewport: wide,
    theme: "dark",
    prepare: expandUsage,
    scene: withChats({ localStorage: { "agent-one-setting-THEME": "dark" } }),
  },
  {
    id: "overview/app-layout",
    route: "/chat/chat-lisbon",
    viewport: wide,
    prepare: expandUsage,
    scene: withChats(),
    annotate: async (page, h) => [
      await h.box(
        [
          page.getByRole("button", { name: "New Chat" }).last(),
          page
            .locator("[data-tour=chat-list]")
            .getByText("Set up home Wi-Fi mesh"),
        ],
        "1",
        { anchor: "r", padding: 4 },
      ),
      await h.box(
        page.getByRole("button", { name: /usage stats/ }).locator(".."),
        "2",
        { anchor: "r" },
      ),
      await h.pin(
        await h.all(
          page.locator("[aria-label^='Scroll to'] > span[aria-hidden]"),
        ),
        "3",
        { anchor: "r" },
      ),
      await h.box(
        [
          page.getByText(/^Found 8 results/),
          page.getByText("I also saved a packing list"),
          page.getByRole("button", { name: "Regenerate response" }).first(),
        ],
        "4",
        { anchor: "r", padding: 8 },
      ),
      await h.box(page.getByTestId("chat-form"), "5", {
        anchor: "l",
        padding: 3,
      }),
      await h.pin(
        page.locator("[data-tour=account-menu] button").first(),
        "6",
        { anchor: "t", gap: 4 },
      ),
    ],
  },
  {
    id: "overview/composer",
    route: "/chat",
    css: composerSpace,
    scene: withChats(),
    crop: async (page, h) => h.rect(page.getByTestId("chat-form"), 20),
    annotate: async (page, h) => [
      await h.pin(await h.text(page.locator(".cm-placeholder")), "1", {
        anchor: "t",
        gap: 2,
        leader: 46,
      }),
      await h.pin(page.getByTestId("attach-button"), "2", {
        anchor: "b",
        gap: 6,
        leader: 32,
      }),
      await h.pin(page.getByRole("button", { name: /^Model:/ }), "3", {
        anchor: "b",
        gap: 6,
        leader: 32,
      }),
      await h.pin(
        page.getByRole("button", { name: "Model configuration" }),
        "4",
        { anchor: "b", gap: 6, leader: 32 },
      ),
      await h.pin(page.getByTestId("send-button"), "5", {
        anchor: "b",
        gap: 6,
        leader: 32,
      }),
    ],
  },
  {
    id: "overview/account-menu",
    route: "/chat",
    hideMain: true,
    scene: withChats(),
    prepare: async (page) => {
      await page.locator("[data-tour=account-menu] button").first().click();
      await page.waitForTimeout(500);
      // Hide the chat rows behind the open menu so the crop starts on blank space.
      await page.getByPlaceholder("Search chats...").evaluate((search) => {
        const top = search.getBoundingClientRect().bottom;
        const list = document.querySelector("[data-tour=chat-list]");
        for (const el of list.querySelectorAll("*")) {
          const r = el.getBoundingClientRect();
          if (
            r.top > top &&
            r.height < 60 &&
            !el.closest("[data-tour=account-menu]")
          )
            el.style.visibility = "hidden";
        }
      });
    },
    crop: async (page, h) => {
      const r = await h.rect(
        [page.getByRole("menu"), page.locator("[data-tour=account-menu]")],
        28,
      );
      return { ...r, x: 0, width: 257 };
    },
    annotate: async (page, h) =>
      Promise.all(
        [
          /Upgrade Your Plan|Manage Billing/,
          "Account Dashboard",
          "Extensions",
          "Scheduled Agents",
          "Settings",
          "Sign Out",
        ].map((name, i) =>
          h.pin(page.getByRole("menuitem", { name }), String(i + 1), {
            anchor: "r",
            leader: 30,
          }),
        ),
      ),
  },
  {
    id: "overview/collapsed-sidebar",
    route: "/chat/chat-lisbon",
    hideMain: true,
    scene: withChats({ localStorage: { "agent-one-sidebar-collapsed": true } }),
    crop: async (page, h) =>
      h.rect(
        [
          page.locator("[data-tour=sidebar-toggle]"),
          page.getByRole("button", { name: "New Chat" }),
        ],
        24,
      ),
    annotate: async (page, h) => [
      await h.pin(page.locator("[data-tour=sidebar-toggle]"), "1", {
        anchor: "b",
      }),
      await h.pin(page.getByRole("button", { name: "Search chats" }), "2", {
        anchor: "b",
        leader: 40,
      }),
      await h.pin(page.getByRole("button", { name: "New Chat" }), "3", {
        anchor: "b",
      }),
    ],
  },

  // Onboarding
  {
    id: "quickstart/onboarding-welcome",
    route: "/onboarding",
    scene: onboarding(),
    settle: 5000,
    crop: async (page, h) =>
      h.rect(
        [
          page.getByText("Welcome to AgentOne"),
          page.getByRole("button", { name: "Get Started" }),
        ],
        80,
      ),
  },
  {
    id: "quickstart/onboarding-account",
    route: "/onboarding",
    scene: onboarding(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Get Started" }).click();
      await page.waitForTimeout(1500);
    },
    crop: async (page, h) =>
      h.rect(
        page
          .getByRole("heading", { name: "Set up your account" })
          .locator(".."),
        56,
      ),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: "Sign in" }), "1", {
        anchor: "b",
        leader: 40,
      }),
      await h.pin(
        await h.text(page.getByText("I want to use my own API keys instead")),
        "2",
        { anchor: "r", leader: 40 },
      ),
    ],
  },
  {
    id: "quickstart/onboarding-link-account",
    route: "/onboarding",
    scene: onboarding(deviceFlow),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Get Started" }).click();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForTimeout(1500);
    },
    crop: async (page, h) =>
      h.rect(
        page
          .getByRole("heading", { name: "Set up your account" })
          .locator(".."),
        56,
      ),
    annotate: async (page, h) => [
      await h.pin(await h.text(page.getByText("KQ7MWX4D").first()), "1", {
        anchor: "b",
        leader: 36,
      }),
      await h.pin(
        await h.text(page.getByText("Open Login Form Manually")),
        "2",
        { anchor: "b", leader: 36 },
      ),
    ],
  },
  {
    id: "quickstart/onboarding-providers",
    route: "/onboarding",
    viewport: { width: 1100, height: 900 },
    scene: onboarding(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Get Started" }).click();
      await page.waitForTimeout(1500);
      await page.getByText("I want to use my own API keys instead").click();
      await page.waitForTimeout(1500);
    },
    crop: async (page, h) =>
      h.rect(
        [
          page.getByText("Configure providers").first(),
          page.getByRole("button", { name: /Continue/ }),
        ],
        40,
      ),
    trimScrollers: true,
    css: "* { mask-image: none !important; -webkit-mask-image: none !important; }",
  },
  {
    id: "quickstart/onboarding-done",
    route: "/onboarding",
    scene: onboarding(signedIn()),
    prepare: async (page) => {
      await page.getByRole("button", { name: "Get Started" }).click();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: /Continue/ }).click();
      await page.getByText("You're all set!").waitFor({ timeout: 8000 });
      await page.waitForTimeout(1500);
    },
    crop: async (page, h) =>
      h.rect(
        [
          page.getByText("You're all set!"),
          page.getByText("Skip and launch AgentOne"),
        ],
        64,
      ),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: "Take the Tour" }), "1", {
        anchor: "l",
      }),
      await h.pin(
        page
          .getByRole("link", { name: /Browse Documentation/ })
          .or(page.getByRole("button", { name: /Browse Documentation/ })),
        "2",
        { anchor: "l" },
      ),
      await h.pin(
        await h.text(page.getByText("Skip and launch AgentOne")),
        "3",
        { anchor: "l" },
      ),
    ],
  },
  {
    id: "quickstart/tour-step-2",
    route: "/settings",
    css: "[data-testid=chat-form]{margin-bottom:16px}",
    scene: withChats(),
    prepare: async (page) => {
      await page
        .getByRole("button", { name: /Take the tour/i })
        .or(page.getByRole("link", { name: /Take the tour/i }))
        .first()
        .click();
      await page.waitForTimeout(1500);
      await page.getByRole("button", { name: "Next" }).click();
      await page.waitForTimeout(1200);
    },
  },
];
