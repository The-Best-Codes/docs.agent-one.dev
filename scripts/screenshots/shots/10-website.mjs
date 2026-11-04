// Real screenshots of www.agent-one.dev and www.modeldirectory.dev.
const viewport = { width: 1200, height: 800 };
const tallViewport = { width: 1200, height: 1000 };

async function dismissConsent(page) {
  await page
    .getByRole("button", { name: "Reject All" })
    .click({ timeout: 4000 })
    .catch(() => {});
}

async function scrollTo(page, locator, offset = 110) {
  await locator.first().evaluate((el, offset) => {
    window.scrollTo(
      0,
      el.getBoundingClientRect().top + window.scrollY - offset,
    );
  }, offset);
  await page.waitForTimeout(400);
}

function downloadShot(os, annotate) {
  return {
    id: `installation/download-${os.toLowerCase()}`,
    url: "https://www.agent-one.dev/download",
    viewport: tallViewport,
    settle: 2500,
    prepare: async (page) => {
      await dismissConsent(page);
      await page.getByRole("tab", { name: os }).click();
      await scrollTo(page, page.getByRole("tab", { name: os }), 190);
    },
    annotate,
    textured: true,
    crop: async (page, h) => {
      const r = await h.rect(
        [page.getByRole("tablist"), page.getByText("GitHub releases")],
        48,
      );
      return { ...r, height: r.height + 56 };
    },
  };
}

export default [
  { ...downloadShot("macOS"), id: "installation/download-macos-plain" },
  downloadShot("macOS", async (page, h) => [
    await h.box(page.getByRole("tab", { name: "macOS" }), "1", { anchor: "l" }),
    await h.pin(
      page.getByRole("link", { name: "Download Apple Silicon (.dmg)" }),
      "2",
      { anchor: "l", leader: 44 },
    ),
    await h.pin(
      page.getByRole("link", { name: "Download Intel (.dmg)" }),
      "3",
      { anchor: "l", leader: 44 },
    ),
  ]),
  downloadShot("Windows", async (page, h) => [
    await h.box(page.getByRole("tab", { name: "Windows" }), "1", {
      anchor: "t",
    }),
    await h.pin(page.getByRole("link", { name: /Microsoft Store/ }), "2", {
      anchor: "l",
      leader: 44,
    }),
    await h.pin(page.getByText("More download options"), "3", {
      anchor: "l",
      leader: 44,
      gap: 14,
    }),
  ]),
  downloadShot("Linux", async (page, h) => [
    await h.box(page.getByRole("tab", { name: "Linux" }), "1", { anchor: "r" }),
    await h.pin(page.getByRole("link", { name: "Download AppImage" }), "2", {
      anchor: "l",
      leader: 44,
    }),
    await h.pin(page.getByRole("link", { name: /\.deb/ }), "3", {
      anchor: "l",
      leader: 44,
    }),
    await h.pin(page.getByRole("link", { name: /\.rpm/ }), "4", {
      anchor: "l",
      leader: 44,
    }),
  ]),
  {
    id: "account/pricing",
    url: "https://www.agent-one.dev/pricing",
    viewport: { width: 1360, height: 1300 },
    settle: 2500,
    prepare: async (page) => {
      await dismissConsent(page);
      await scrollTo(
        page,
        page.getByRole("heading", { name: "Free", exact: true }),
        200,
      );
    },
    crop: async (page, h) =>
      h
        .rect(
          page
            .getByRole("heading", { name: "Free", exact: true })
            .locator("xpath=ancestor::section[1]"),
          0,
        )
        .then((r) => ({ ...r, height: r.height + 28 })),
  },
  {
    id: "models/model-directory-home",
    url: "https://www.modeldirectory.dev/",
    viewport,
    settle: 2500,
    frame: "browser",
    annotate: async (page, h) => [
      await h.pin(
        page
          .getByRole("banner")
          .getByRole("link", { name: "Models", exact: true })
          .or(
            page
              .getByRole("navigation")
              .getByRole("link", { name: "Models", exact: true }),
          )
          .first(),
        "1",
        { anchor: "b" },
      ),
      await h.pin(
        page
          .getByRole("banner")
          .getByRole("link", { name: "Providers", exact: true })
          .or(
            page
              .getByRole("navigation")
              .getByRole("link", { name: "Providers", exact: true }),
          )
          .first(),
        "2",
        { anchor: "b" },
      ),
      await h.pin(
        page
          .getByText(/Search models, provider/)
          .first()
          .locator(".."),
        "3",
        { anchor: "b", leader: 19 },
      ),
    ],
    crop: async (page, h) => {
      const chips = await h.rect(
        page.getByText("Most widely available models").locator(".."),
        0,
      );
      return { x: 0, y: 0, width: 1200, height: chips.y + chips.height + 64 };
    },
  },
  {
    id: "models/model-directory-list",
    url: "https://www.modeldirectory.dev/list",
    viewport: { width: 1360, height: 820 },
    settle: 4000,
    prepare: async (page) => {
      await page.getByPlaceholder(/Filter table rows/).fill("claude sonnet 5");
      // Keep the columns that fit, so the table ends on a real column edge instead of a fade.
      await page.addStyleTag({
        content:
          "table th:nth-child(n+8), table td:nth-child(n+8) { display: none !important; } table { width: 100% !important; } div.pointer-events-none.absolute.z-20 { display: none !important; }",
      });
      await page.waitForTimeout(1500);
    },
    crop: async (page, h) => {
      const rows = await h.visible(page.locator("tbody tr"), page, 60);
      const last = await h.rect(rows[Math.min(rows.length, 8) - 1], 0);
      const title = await h.rect(
        page.getByRole("heading", { name: "All AI models" }),
        0,
      );
      return {
        x: 0,
        y: title.y - 10,
        width: 1360,
        height: last.y + last.height + 1 - (title.y - 10),
      };
    },
  },
];
