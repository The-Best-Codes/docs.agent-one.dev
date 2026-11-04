export interface MockResponse {
  status?: number;
  headers?: Record<string, string>;
  body?: unknown;
  /** Server-sent event chunks returned one at a time. */
  stream?: string[];
  /** Keep the stream open after the last chunk (shows a response in progress). */
  hang?: boolean;
}

export interface Scene {
  platform?: "macos" | "windows" | "linux";
  version?: string;
  /** Keyring values, already JSON-encoded (e.g. API keys). */
  secrets?: Record<string, string>;
  /** Extra SQL run after migrations, per database. */
  sql?: { app?: string[]; registry?: string[] };
  files?: Record<string, string>;
  update?: unknown;
  scheduledAgents?: unknown[];
  computerUsePermissions?: unknown;
  /** Responses for other IPC commands, by command name. */
  ipc?: Record<string, unknown>;
  /** Mocked HTTP responses, matched by "METHOD url-prefix" or "url-prefix". */
  http?: Record<string, MockResponse>;
  /** Allow these URL prefixes to reach the network through the dev server. */
  passthrough?: string[];
}
