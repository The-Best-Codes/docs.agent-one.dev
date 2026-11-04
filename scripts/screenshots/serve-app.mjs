// Serves the real AgentOne desktop frontend in a normal browser, with the Tauri
// backend replaced by an in-browser mock (see ./mock). Used to take docs screenshots.
//
//   AGENT_ONE_DIR=../agent-one node scripts/screenshots/serve-app.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(here, "../..");
const appDir = path.resolve(
  docsRoot,
  process.env.AGENT_ONE_DIR ?? "../agent-one",
);
const port = Number(process.env.PORT ?? 1430);

const appRequire = createRequire(path.join(appDir, "package.json"));
const { createServer } = await import(appRequire.resolve("vite"));

const modelDirectoryFile = path.resolve(
  docsRoot,
  process.env.MODEL_DIRECTORY_DIR ?? "../ai-model-directory",
  "data/all.min.json",
);

// Mirrors the migration lists registered in src-tauri/src/lib.rs, in order.
function readMigrations() {
  const libRs = fs.readFileSync(
    path.join(appDir, "src-tauri/src/lib.rs"),
    "utf8",
  );
  const result = { app: [], registry: [] };
  for (const block of libRs.split(".add_migrations(").slice(1)) {
    const key = block.includes('"sqlite:mcp-registry.db"') ? "registry" : "app";
    for (const match of block.matchAll(
      /include_str!\(\s*"\.\.\/migrations\/([^"]+)"\s*\)/g,
    )) {
      result[key].push(
        fs.readFileSync(
          path.join(appDir, "src-tauri/migrations", match[1]),
          "utf8",
        ),
      );
    }
  }
  return result;
}

const mockDir = path.join(here, "mock");
const mockEntry = path.join(mockDir, "setup.ts");

const server = await createServer({
  root: appDir,
  configFile: path.join(appDir, "vite.config.ts"),
  server: { port, strictPort: true, fs: { allow: [appDir, docsRoot] } },
  optimizeDeps: { exclude: ["@sqlite.org/sqlite-wasm"] },
  plugins: [
    {
      name: "agent-one-docs-mock",
      enforce: "pre",
      transformIndexHtml(html) {
        return html.replace(
          '<script type="module" src="/src/main.tsx"></script>',
          `<script type="module" src="/@fs${mockEntry}"></script>\n    <script type="module" src="/src/main.tsx"></script>`,
        );
      },
      configureServer(server) {
        server.middlewares.use("/__docs/model-directory.json", (_req, res) => {
          res.setHeader("content-type", "application/json");
          res.end(fs.readFileSync(modelDirectoryFile));
        });
        server.middlewares.use("/__docs/proxy", async (req, res) => {
          const target = new URL(req.url, "http://x").searchParams.get("url");
          try {
            const response = await fetch(target);
            res.statusCode = response.status;
            res.setHeader(
              "content-type",
              response.headers.get("content-type") ?? "text/plain",
            );
            res.end(Buffer.from(await response.arrayBuffer()));
          } catch (error) {
            res.statusCode = 502;
            res.end(String(error));
          }
        });
      },
      async resolveId(id, importer, options) {
        if (id === "virtual:agent-one-migrations")
          return "\0agent-one-migrations";
        // Bare imports from the mock resolve against the app's node_modules first.
        if (
          !importer?.startsWith(mockDir) ||
          id.startsWith(".") ||
          id.startsWith("/")
        )
          return null;
        const fromApp = await this.resolve(
          id,
          path.join(appDir, "src/main.tsx"),
          {
            ...options,
            skipSelf: true,
          },
        );
        return fromApp ?? null;
      },
      load(id) {
        if (id === "\0agent-one-migrations")
          return `export default ${JSON.stringify(readMigrations())};`;
      },
    },
  ],
});

await server.listen();
console.log(`AgentOne docs harness: http://localhost:${port}/`);
