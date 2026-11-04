import type { MockResponse, Scene } from "./scene";

interface PendingRequest {
  method: string;
  url: string;
  headers: [string, string][];
  data: number[] | null;
}

interface PendingBody {
  chunks: Uint8Array[];
  hang: boolean;
}

const requests = new Map<number, PendingRequest>();
const bodies = new Map<number, PendingBody>();
let nextRid = 1;

const MODEL_DIRECTORY_URL =
  "https://raw.githubusercontent.com/The-Best-Codes/ai-model-directory/main/data/all.min.json";

function findMock(
  scene: Scene,
  method: string,
  url: string,
): MockResponse | undefined {
  const entries = Object.entries(scene.http ?? {}).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [pattern, response] of entries) {
    const [maybeMethod, maybeUrl] = pattern.includes(" ")
      ? pattern.split(" ", 2)
      : [null, pattern];
    if (maybeMethod && maybeMethod !== method) continue;
    if (url.startsWith(maybeUrl)) return response;
  }
}

async function resolve(scene: Scene, request: PendingRequest) {
  if ((window as any).__DOCS_VERBOSE__)
    console.log("[http]", request.method, request.url);

  if (request.url === MODEL_DIRECTORY_URL) {
    const response = await fetch("/__docs/model-directory.json");
    return {
      status: response.status,
      headers: {},
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }

  const mock = findMock(scene, request.method, request.url);
  if (mock?.stream) {
    return {
      status: 200,
      headers: { "content-type": "text/event-stream" },
      chunks: mock.stream.map((chunk) => new TextEncoder().encode(chunk)),
      hang: Boolean(mock.hang),
    };
  }
  if (mock) {
    const text =
      typeof mock.body === "string" ? mock.body : JSON.stringify(mock.body);
    return {
      status: mock.status ?? 200,
      headers: { "content-type": "application/json", ...mock.headers },
      bytes: new TextEncoder().encode(text),
    };
  }

  if (
    request.method === "GET" &&
    scene.passthrough?.some((prefix) => request.url.startsWith(prefix))
  ) {
    const response = await fetch(
      `/__docs/proxy?url=${encodeURIComponent(request.url)}`,
    );
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      bytes: new Uint8Array(await response.arrayBuffer()),
    };
  }

  return {
    status: 503,
    headers: {},
    bytes: new TextEncoder().encode("offline (docs harness)"),
  };
}

export async function handleHttp(
  cmd: string,
  args: Record<string, any>,
  scene: Scene,
) {
  switch (cmd) {
    case "plugin:http|fetch": {
      const rid = nextRid++;
      const config = args.clientConfig;
      requests.set(rid, {
        method: config.method,
        url: config.url,
        headers: config.headers,
        data: config.data,
      });
      return rid;
    }
    case "plugin:http|fetch_send": {
      const request = requests.get(args.rid);
      if (!request) throw new Error("unknown request");
      const result = await resolve(scene, request);
      const responseRid = nextRid++;
      bodies.set(responseRid, {
        chunks: "chunks" in result ? result.chunks : [result.bytes],
        hang: "hang" in result ? result.hang : false,
      });
      return {
        status: result.status,
        statusText: "",
        url: request.url,
        headers: Object.entries(result.headers),
        rid: responseRid,
      };
    }
    case "plugin:http|fetch_read_body": {
      const body = bodies.get(args.rid);
      const chunk = body?.chunks.shift();
      if (!chunk) {
        if (body?.hang) await new Promise(() => {});
        return [1];
      }
      const out = new Uint8Array(chunk.byteLength + 1);
      out.set(chunk);
      return out.buffer;
    }
    default:
      return null;
  }
}
