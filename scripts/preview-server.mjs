import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const clientRoot = resolve(projectRoot, "dist/client");
const { default: worker } = await import(new URL("../dist/server/index.js", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function staticResponse(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded.replace(/^\/+/, "");
  const candidate = resolve(clientRoot, relative);
  if (candidate !== clientRoot && !candidate.startsWith(`${clientRoot}${sep}`)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    if (!(await stat(candidate)).isFile()) return null;
    const body = await readFile(candidate);
    return new Response(body, {
      headers: {
        "cache-control": relative.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
        "content-type": contentTypes[extname(candidate).toLowerCase()] ?? "application/octet-stream",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function send(nodeResponse, response) {
  nodeResponse.statusCode = response.status;
  response.headers.forEach((value, name) => nodeResponse.setHeader(name, value));
  nodeResponse.end(Buffer.from(await response.arrayBuffer()));
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1:3000"}`);
    const asset = await staticResponse(url.pathname);
    if (asset) {
      await send(response, asset);
      return;
    }

    const webRequest = new Request(url, {
      method: request.method,
      headers: request.headers,
    });
    const result = await worker.fetch(
      webRequest,
      {
        ASSETS: {
          fetch: async (assetRequest) =>
            (await staticResponse(new URL(assetRequest.url).pathname)) ?? new Response("Not found", { status: 404 }),
        },
      },
      { waitUntil() {}, passThroughOnException() {} },
    );
    await send(response, result);
  } catch (error) {
    response.statusCode = 500;
    response.end(String(error));
  }
});

server.listen(3000, "127.0.0.1", () => {
  process.stdout.write("SSKEMS production preview: http://127.0.0.1:3000\n");
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
