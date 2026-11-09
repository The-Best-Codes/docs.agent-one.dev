// Projects, auto mode, and skills.
import {
  allChats,
  autoModeChat,
  PROJECT_FOLDER,
  projectChats,
  projects,
  skillsChat,
} from "../lib/fixtures.mjs";
import { base, chatSql, merge, projectSql, signedIn } from "../lib/scene.mjs";

const scene = (extra = {}) =>
  base(
    merge(
      signedIn(),
      {
        folders: [PROJECT_FOLDER],
        sql: {
          app: [
            ...projectSql(projects),
            ...chatSql([
              ...projectChats,
              autoModeChat,
              skillsChat,
              ...allChats,
            ]),
          ],
        },
      },
      extra,
    ),
  );
const hideComposer = "[data-testid=chat-form]{visibility:hidden}";
const projectRow = (page, name = "Field Notes app") =>
  page
    .locator("[data-tour=chat-list]")
    .getByRole("button", { name, exact: true });

/** Hovers a project row so its New chat and options buttons appear. */
const hoverProject = async (page) => {
  await projectRow(page).hover();
  await page.waitForTimeout(400);
};

export default [
  {
    id: "projects/sidebar",
    route: "/chat/chat-fn-onboarding",
    hideMain: true,
    reducedMotion: true,
    keepMouse: true,
    scene: scene(),
    prepare: hoverProject,
    crop: async () => ({ x: 0, y: 0, width: 256, height: 420 }),
    annotate: async (page, h) => [
      await h.pin(page.getByRole("button", { name: "New project" }), "1", {
        anchor: "r",
        leader: 24,
      }),
      await h.box(
        projectRow(page).locator(
          "xpath=ancestor::*[.//a[@aria-label='New chat in Field Notes app']][1]",
        ),
        "2",
        { anchor: "r", padding: 2 },
      ),
      await h.pin(
        await h.text(
          page
            .locator("[data-tour=chat-list]")
            .getByText("Chats", { exact: true }),
        ),
        "3",
        { anchor: "r", leader: 24 },
      ),
    ],
  },
  {
    id: "projects/edit-project",
    route: "/chat/chat-fn-onboarding",
    viewport: { width: 1200, height: 1500 },
    isolate: true,
    settle: 3000,
    scene: scene(),
    prepare: async (page) => {
      await hoverProject(page);
      await page
        .getByRole("button", { name: "Project options" })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: "Edit Project" }).click();
      await page.waitForTimeout(600);
      await page
        .getByRole("button", { name: "Memory, instruction files, and skills" })
        .click();
      await page.waitForTimeout(800);
    },
    crop: async (page, h) => h.rect(page.getByRole("dialog").last(), 28),
    css: "[role=dialog]{max-height:none !important}",
  },
  {
    id: "projects/picker",
    route: "/chat",
    viewport: { width: 1200, height: 800 },
    scene: scene(),
    prepare: async (page) => {
      await page.getByRole("button", { name: "No project" }).click();
      await page.waitForTimeout(600);
    },
    crop: async (page, h) =>
      h.rect(
        [
          page.locator("[data-testid=chat-form]"),
          page.locator("[data-radix-popper-content-wrapper]").last(),
        ],
        24,
      ),
  },
  {
    id: "projects/delete-project",
    route: "/chat/chat-fn-onboarding",
    isolate: true,
    settle: 3000,
    scene: scene(),
    prepare: async (page) => {
      await hoverProject(page);
      await page
        .getByRole("button", { name: "Project options" })
        .first()
        .click();
      await page.waitForTimeout(400);
      await page.getByRole("menuitem", { name: "Delete Project" }).click();
      await page.waitForTimeout(800);
    },
    crop: async (page, h) => h.rect(page.getByRole("dialog").last(), 28),
  },
  {
    id: "tools/auto-mode-blocked",
    route: "/chat/chat-auto-mode",
    viewport: { width: 1360, height: 900 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("The due dates in Field Notes"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        24,
      ),
  },
  {
    id: "tools/skills-in-chat",
    route: "/chat/chat-skills",
    viewport: { width: 1360, height: 900 },
    css: hideComposer,
    scene: scene(),
    crop: async (page, h) =>
      h.column(
        page,
        page.getByText("Turn the Q3 sales numbers"),
        page.getByRole("button", { name: "Regenerate response" }).last(),
        24,
      ),
  },
];
