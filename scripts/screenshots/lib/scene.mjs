// Helpers for building harness scenes: a signed-in demo account, seeded chats, and settings.
import fs from "node:fs";

const registry = JSON.parse(
  fs.readFileSync(
    new URL("../fixtures/registry.sql.json", import.meta.url),
    "utf8",
  ),
);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
export const NOW = Date.now();

const PRO_PRODUCT = "30fdb516-8321-40db-b7f3-383ff25fca96";
const FREE_PRODUCT = "5c5c6d84-43dc-4a87-9a0f-23ee080af1b7";
const AUTH = "https://www.agent-one.dev/api/auth";

const sql = (value) =>
  value == null
    ? "NULL"
    : typeof value === "number"
      ? String(value)
      : `'${String(value).replaceAll("'", "''")}'`;

let messageCounter = 0;
export const text = (role, body, extra = {}) => ({
  id: `msg-${++messageCounter}`,
  role,
  parts: [{ type: "text", text: body }],
  ...extra,
});
export const user = (body, extra) => text("user", body, extra);
export const assistant = (body, extra) => text("assistant", body, extra);

/** Turns a list of chats into SQL inserts for the app database. */
export function chatSql(chats) {
  return chats.flatMap((chat, index) => {
    const created = chat.createdAt ?? NOW - (index + 1) * 5 * HOUR;
    const updated = chat.updatedAt ?? created + 10 * 60 * 1000;
    return [
      `INSERT INTO chat_metadata (id, title, title_state, model_id, model_config, branch_of, created_at, updated_at, last_message_at, scheduled_agent_id, scheduled_agent_title, project_id)
       VALUES (${sql(chat.id)}, ${sql(chat.title)}, 'done', ${sql(chat.modelId ?? null)}, ${sql(chat.modelConfig ? JSON.stringify(chat.modelConfig) : null)}, ${sql(chat.branchOf ?? null)}, ${created}, ${updated}, ${updated}, ${sql(chat.scheduledAgentId ?? null)}, ${sql(chat.scheduledAgentTitle ?? null)}, ${sql(chat.projectId ?? null)});`,
      `INSERT INTO chat_messages (id, messages) VALUES (${sql(chat.id)}, ${sql(JSON.stringify(chat.messages ?? []))});`,
    ];
  });
}

/** Turns a list of projects into SQL inserts for the app database. */
export function projectSql(projects) {
  return projects.map(
    (project) =>
      `INSERT INTO projects (id, name, instructions, folder, separate_memory, memory, agents_files, skills_folders, created_at, updated_at)
       VALUES (${sql(project.id)}, ${sql(project.name)}, ${sql(project.instructions ?? "")}, ${sql(project.folder ?? null)}, ${project.separateMemory ? 1 : 0}, ${sql(JSON.stringify(project.memory ?? []))}, ${sql(project.agentsFiles ? JSON.stringify(project.agentsFiles) : null)}, ${sql(project.skillsFolders ? JSON.stringify(project.skillsFolders) : null)}, ${NOW - 10 * DAY}, ${NOW - DAY});`,
  );
}

export function signedIn({
  plan = "pro",
  credited = 1000,
  balance = 742,
  name = "Alex Rivera",
} = {}) {
  const productId = plan === "free" ? FREE_PRODUCT : PRO_PRODUCT;
  const periodEnd = new Date(NOW + 18 * DAY).toISOString();
  const subscription = {
    id: "sub_demo",
    status: "active",
    product_id: productId,
    amount: plan === "free" ? 0 : 899,
    currency: "usd",
    recurring_interval: "month",
    current_period_start: new Date(NOW - 12 * DAY).toISOString(),
    current_period_end: periodEnd,
    cancel_at_period_end: false,
    ends_at: null,
    trial_end: null,
    meters: [],
  };
  return {
    secrets: { "agent-one-web-auth-token": JSON.stringify("demo-token") },
    http: {
      [`${AUTH}/get-session`]: {
        body: {
          session: {
            id: "s1",
            userId: "u1",
            expiresAt: new Date(NOW + 30 * DAY).toISOString(),
            token: "demo-token",
          },
          user: {
            id: "u1",
            name,
            email: "alex@example.com",
            emailVerified: true,
          },
        },
      },
      [`${AUTH}/customer/state`]: {
        body: {
          id: "cus_demo",
          email: "alex@example.com",
          name,
          active_subscriptions: [subscription],
          granted_benefits: [],
          active_meters: [
            {
              id: "m1",
              meter_id: "credits",
              consumed_units: credited - balance,
              credited_units: credited,
              balance,
            },
          ],
        },
      },
      "https://www.agent-one.dev/api/sync/settings": { body: { settings: {} } },
    },
  };
}

/** Deep-merges scene fragments; arrays and SQL lists concatenate. */
export function merge(...parts) {
  const out = {};
  for (const part of parts) {
    for (const [key, value] of Object.entries(part ?? {})) {
      if (Array.isArray(value)) out[key] = [...(out[key] ?? []), ...value];
      else if (value && typeof value === "object")
        out[key] = merge(out[key] ?? {}, value);
      else out[key] = value;
    }
  }
  return out;
}

export const settings = (values) => ({
  localStorage: Object.fromEntries(
    Object.entries(values).map(([key, value]) => [
      `agent-one-setting-${key}`,
      value,
    ]),
  ),
});

/** The baseline every shot starts from: onboarding done, release notes seen, light theme. */
export const base = (overrides = {}) =>
  merge(
    {
      localStorage: {
        "agent-one-onboarding-completed": true,
        "agent-one-onboarding-reminder-dismissed": true,
        "agent-one-star-reminder-dismissed": true,
        "agent-one-release-notes-last-seen-version": "1.2.0",
        "agent-one-last-model-directory-sync-timestamp": NOW,
        "agent-one-last-extension-list-sync-timestamp": NOW,
      },
    },
    settings({ THEME: "light", USER_NAME: "Alex" }),
    { sql: { registry: registry.sql } },
    overrides,
  );

export { DAY, HOUR };

const API_KEY_ENV = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Enables built-in providers with placeholder API keys ("bring your own key"). */
export function byok(
  providers = ["openai", "anthropic", "google", "openrouter"],
) {
  return {
    localStorage: Object.fromEntries(
      providers.map((id) => [
        `agent-one-setting-PROVIDER_CONFIG_${id.toUpperCase()}`,
        { enabled: true, headers: {}, models: [] },
      ]),
    ),
    secrets: Object.fromEntries(
      providers
        .filter((id) => API_KEY_ENV[id])
        .map((id) => [
          API_KEY_ENV[id],
          JSON.stringify(`sk-demo-${id}-0000000000000000`),
        ]),
    ),
  };
}

/** A local Ollama server with a few models pulled. */
export const ollama = (models = ["gemma4:e4b", "qwen3:8b", "llama3.2:3b"]) => ({
  http: {
    "http://127.0.0.1:11434/v1/models": {
      body: {
        object: "list",
        data: models.map((id) => ({
          id,
          object: "model",
          owned_by: "library",
        })),
      },
    },
  },
});
