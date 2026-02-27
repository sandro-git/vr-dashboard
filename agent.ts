/**
 * VR Dashboard Agent — runs on each VR PC.
 * Connects to the central server via WebSocket, listens for commands.
 *
 * Usage: deno run --allow-net --allow-run agent.ts --id=1 --server=ws://192.168.1.100:8000
 */

const args = Object.fromEntries(
  Deno.args.map((a) => a.replace(/^--/, "").split("=")),
);

const PC_ID = args["id"];
const SERVER = args["server"] ?? inferServer();

function inferServer(): string {
  try {
    const url = new URL(import.meta.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      const ws = url.protocol === "https:" ? "wss:" : "ws:";
      return `${ws}//${url.host}`;
    }
  } catch { /* ignore */ }
  return "ws://localhost:8000";
}

if (!PC_ID) {
  console.error("Usage: deno run agent.ts --id=<pc_id> [--server=ws://host:8000]");
  Deno.exit(1);
}

const WS_URL = `${SERVER}/agent?id=${PC_ID}`;

let retryDelay = 1000; // ms, doubles on each failure up to MAX_DELAY
const MAX_DELAY = 30_000;

async function connect(): Promise<void> {
  console.log(`[agent] Connecting to ${WS_URL} ...`);

  const ws = new WebSocket(WS_URL);

  await new Promise<void>((resolve) => {
    ws.onopen = () => {
      console.log(`[agent] Connected (PC id=${PC_ID})`);
      retryDelay = 1000;

      // Send a ping every 15s to keep the connection alive
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ cmd: "ping" }));
        }
      }, 15_000);

      ws.onmessage = async (event) => {
        let msg: { cmd: string };
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.cmd === "shutdown") {
          console.log("[agent] Received shutdown command — shutting down...");
          clearInterval(pingInterval);
          ws.close();
          await runShutdown();
        } else if (msg.cmd === "ping") {
          ws.send(JSON.stringify({ cmd: "pong" }));
        }
      };

      ws.onclose = () => {
        clearInterval(pingInterval);
        resolve();
      };

      ws.onerror = (e) => {
        console.error("[agent] WebSocket error:", e);
      };
    };

    ws.onerror = () => {
      // Connection failed before open
      resolve();
    };
  });
}

async function runShutdown(): Promise<void> {
  const cmd = new Deno.Command("shutdown", { args: ["/s", "/t", "0"] });
  const { code } = await cmd.output();
  if (code !== 0) {
    console.error("[agent] shutdown command failed with code", code);
  }
}

// Main loop with exponential backoff
while (true) {
  try {
    await connect();
  } catch (e) {
    console.error("[agent] Unexpected error:", e);
  }
  console.log(`[agent] Reconnecting in ${retryDelay / 1000}s...`);
  await new Promise((r) => setTimeout(r, retryDelay));
  retryDelay = Math.min(retryDelay * 2, MAX_DELAY);
}
