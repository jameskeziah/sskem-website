import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const projectRoot = new URL("../", import.meta.url);
const baseUrl = "http://127.0.0.1:3000";
let server;

async function hasExpectedServer() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(1_500) });
    const html = await response.text();
    return response.ok && html.includes("SSKEMS");
  } catch {
    return false;
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30_000;
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

if (!(await hasExpectedServer())) {
  server = spawn(
    process.execPath,
    ["scripts/preview-server.mjs"],
    {
      cwd: projectRoot,
      env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
      stdio: "inherit",
    },
  );
  await waitForServer();
}

const playwright = spawn(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
  { cwd: projectRoot, env: process.env, stdio: "inherit" },
);

const exitCode = await new Promise((resolve) => playwright.once("exit", resolve));
await stopServer();
process.exitCode = exitCode ?? 1;
