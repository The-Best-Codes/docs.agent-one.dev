// Stand-in for the Tauri backend so the real AgentOne frontend runs in a browser.
// A scene (window.__DOCS_SCENE__, injected by capture.mjs) seeds settings, secrets,
// chats, and mocked web responses for each screenshot.
import sqlite3InitModule from "@sqlite.org/sqlite-wasm";
import { mockIPC, mockWindows } from "@tauri-apps/api/mocks";
import migrations from "virtual:agent-one-migrations";

import { handleHttp } from "./http";
import type { Scene } from "./scene";

const scene: Scene = (window as any).__DOCS_SCENE__ ?? {};
const verbose = Boolean((window as any).__DOCS_VERBOSE__);

(window as any).__TAURI_OS_PLUGIN_INTERNALS__ = {
  platform: scene.platform ?? "macos",
  os_type: scene.platform ?? "macos",
  family: scene.platform === "windows" ? "windows" : "unix",
  version: "15.0.0",
  arch: "aarch64",
  exe_extension: scene.platform === "windows" ? "exe" : "",
  eol: "\n",
};

const sqlite3Promise = sqlite3InitModule();
const databases = new Map<string, Promise<any>>();

function openDatabase(name: string) {
  let db = databases.get(name);
  if (!db) {
    db = sqlite3Promise.then((sqlite3) => {
      const instance = new sqlite3.oo1.DB(":memory:", "c");
      const key = name.includes("mcp-registry") ? "registry" : "app";
      for (const sql of migrations[key]) instance.exec(sql);
      for (const sql of scene.sql?.[key] ?? []) instance.exec(sql);
      return instance;
    });
    databases.set(name, db);
  }
  return db;
}

function bindFor(query: string, values: unknown[] = []) {
  const normalized = values.map((value) =>
    typeof value === "boolean"
      ? Number(value)
      : value === undefined
        ? null
        : value,
  );
  if (/\$\d+/.test(query)) {
    return Object.fromEntries(
      normalized.map((value, index) => [`$${index + 1}`, value]),
    );
  }
  return normalized;
}

(window as any).__DOCS_DB__ = openDatabase;

let lastDb = "sqlite:agent-one.db";
const secrets = new Map<string, string>(Object.entries(scene.secrets ?? {}));
const files = new Map<string, string>(Object.entries(scene.files ?? {}));
const seen = new Set<string>();

mockWindows("main");
mockIPC(
  async (cmd, rawArgs) => {
    const args = (rawArgs ?? {}) as Record<string, any>;
    if (verbose && !seen.has(cmd)) {
      seen.add(cmd);
      console.log("[ipc]", cmd, JSON.stringify(args)?.slice(0, 200));
    }

    if (cmd.startsWith("plugin:http|")) return handleHttp(cmd, args, scene);

    switch (cmd) {
      case "plugin:sql|load":
        lastDb = args.db;
        await openDatabase(args.db);
        return args.db;
      case "plugin:sql|execute": {
        const db = await openDatabase(args.db ?? lastDb);
        db.exec({ sql: args.query, bind: bindFor(args.query, args.values) });
        return [
          db.changes(),
          Number(db.selectValue("SELECT last_insert_rowid()") ?? 0),
        ];
      }
      case "plugin:sql|select": {
        const db = await openDatabase(args.db ?? lastDb);
        return db.exec({
          sql: args.query,
          bind: bindFor(args.query, args.values),
          rowMode: "object",
          returnValue: "resultRows",
        });
      }
      case "plugin:sql|close":
        return true;

      case "storage_get_item":
        return { value: secrets.get(args.key) ?? null, error: null };
      case "storage_set_item":
        secrets.set(args.key, args.valueJson);
        return null;
      case "storage_remove_item":
        secrets.delete(args.key);
        return null;
      case "storage_has_item":
        return secrets.has(args.key);

      case "plugin:fs|read_text_file":
      case "plugin:fs|read_file": {
        const content = files.get(args.path) ?? (await loadFile(args.path));
        if (content == null) throw new Error(`No such file: ${args.path}`);
        return Array.from(new TextEncoder().encode(content));
      }
      case "plugin:fs|write_text_file":
      case "plugin:fs|write_file":
        return null;
      case "plugin:fs|exists":
        return files.has(args.path) || args.path === "model-directory.json";
      case "plugin:fs|mkdir":
      case "plugin:fs|remove":
        return null;
      case "plugin:fs|read_dir":
        return [];

      case "plugin:path|resolve_directory":
        return "/Users/alex/Library/Application Support/dev.agent-one";
      case "plugin:path|join":
        return (args.paths as string[]).join("/");
      case "plugin:app|version":
        return scene.version ?? "1.1.3";
      case "plugin:app|name":
        return "AgentOne";
      case "plugin:app|tauri_version":
        return "2.12.0";
      case "plugin:updater|check":
        return scene.update ?? null;
      case "is_update_managed_externally":
        return false;
      case "plugin:deep-link|get_current":
        return null;
      case "plugin:notification|is_permission_granted":
        return true;
      case "plugin:notification|request_permission":
        return "granted";
      case "list_scheduled_agents":
        return scene.scheduledAgents ?? [];
      case "computer_use_permissions":
        return (
          scene.computerUsePermissions ?? {
            accessibility: true,
            screenRecording: true,
          }
        );
      case "mcp_check_oauth_support":
        return false;
      default:
        return scene.ipc?.[cmd] ?? null;
    }
  },
  { shouldMockEvents: true },
);

async function loadFile(path: string) {
  if (path === "model-directory.json") {
    const response = await fetch("/__docs/model-directory.json");
    return response.ok ? response.text() : null;
  }
  return null;
}
