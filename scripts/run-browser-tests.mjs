import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = new URL("../", import.meta.url);
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const previewUrl = new URL(baseUrl);
let server;

function hasExpectedServer() {
  return new Promise((resolve) => {
    const healthUrl = new URL("/__preview-health", baseUrl);
    const request = (healthUrl.protocol === "https:" ? httpsRequest : httpRequest)(
      healthUrl,
      {
        agent: false,
        headers: { connection: "close" },
        method: "GET",
      },
      (response) => {
        const expected = response.statusCode === 200 && response.headers["x-sskem-preview"] === "ready";
        response.resume();
        response.once("end", () => resolve(expected));
      },
    );
    request.setTimeout(5_000, () => request.destroy());
    request.once("error", () => resolve(false));
    request.end();
  });
}

async function waitForServer() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (await hasExpectedServer()) return;
    if (server?.exitCode !== null) {
      throw new Error(`The preview server exited with code ${server.exitCode}.`);
    }
    await delay(250);
  }
  throw new Error(`The preview server did not become ready at ${baseUrl}.`);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  server.kill();
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    delay(2_000).then(() => server?.kill("SIGKILL")),
  ]);
}

try {
  if (!(await hasExpectedServer())) {
    server = spawn(
      process.execPath,
      ["scripts/preview-server.mjs"],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          PREVIEW_HOST: previewUrl.hostname,
          PREVIEW_PORT: previewUrl.port || (previewUrl.protocol === "https:" ? "443" : "80"),
          WRANGLER_LOG_PATH: ".wrangler/wrangler.log",
        },
        stdio: "inherit",
      },
    );
    await waitForServer();
  }

  const playwright = spawn(
    process.execPath,
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    {
      cwd: projectRoot,
      env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
      stdio: "inherit",
    },
  );

  const exitCode = await new Promise((resolve) => playwright.once("exit", resolve));
  process.exitCode = exitCode ?? 1;
} finally {
  await stopServer();
}
