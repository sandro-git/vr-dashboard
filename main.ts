/**
 * VR Dashboard Server
 * - Serves the static dashboard at /
 * - REST API: POST /api/wake/:id, POST /api/shutdown/:id
 * - WebSocket endpoint for agents: /agent?id=<pc_id>
 * - WebSocket endpoint for the dashboard UI: /ws
 */

import { PCS } from "./config.ts";
import { sendWakeOnLan } from "./lib/wol.ts";
import { sendShutdown } from "./lib/shutdown.ts";

const PORT = 8000;

// Map of pc_id -> agent WebSocket
const agents = new Map<number, WebSocket>();

// All dashboard browser clients
const dashboardClients = new Set<WebSocket>();

// PC status: "online" | "offline"
const status = new Map<number, "online" | "offline">();
for (const pc of PCS) status.set(pc.id, "offline");

function broadcastStatus(): void {
  const payload = JSON.stringify({
    type: "status",
    pcs: PCS.map((pc) => ({
      ...pc,
      status: status.get(pc.id) ?? "offline",
    })),
  });
  for (const ws of dashboardClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function handleAgentConnection(ws: WebSocket, id: number): void {
  const pc = PCS.find((p) => p.id === id);
  if (!pc) {
    ws.close(1008, `Unknown PC id: ${id}`);
    return;
  }

  ws.onopen = () => {
    agents.set(id, ws);
    status.set(id, "online");
    console.log(`[server] Agent connected: ${pc.name} (id=${id})`);
    broadcastStatus();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.cmd === "ping") {
        ws.send(JSON.stringify({ cmd: "pong" }));
      }
    } catch {
      // ignore malformed messages
    }
  };

  ws.onclose = () => {
    if (agents.get(id) === ws) {
      agents.delete(id);
      status.set(id, "offline");
      console.log(`[server] Agent disconnected: ${pc.name} (id=${id})`);
      broadcastStatus();
    }
  };

  ws.onerror = (e) => {
    console.error(`[server] Agent WS error for ${pc.name}:`, e);
  };
}

function handleDashboardConnection(ws: WebSocket): void {
  dashboardClients.add(ws);

  ws.onopen = () => {
    // Send current state immediately once the socket is open
    ws.send(JSON.stringify({
      type: "status",
      pcs: PCS.map((pc) => ({
        ...pc,
        status: status.get(pc.id) ?? "offline",
      })),
    }));
  };

  ws.onclose = () => dashboardClients.delete(ws);
  ws.onerror = () => dashboardClients.delete(ws);
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // Agent WebSocket endpoint
  if (url.pathname === "/agent") {
    const idParam = url.searchParams.get("id");
    const id = idParam ? parseInt(idParam) : NaN;
    if (isNaN(id)) {
      return new Response("Missing or invalid ?id param", { status: 400 });
    }
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleAgentConnection(socket, id);
    return response;
  }

  // Dashboard WebSocket endpoint
  if (url.pathname === "/ws") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    handleDashboardConnection(socket);
    return response;
  }

  // REST API: wake a PC
  if (req.method === "POST" && url.pathname.startsWith("/api/wake/")) {
    const id = parseInt(url.pathname.split("/").pop() ?? "");
    const pc = PCS.find((p) => p.id === id);
    if (!pc) return new Response("PC not found", { status: 404 });

    try {
      await sendWakeOnLan(pc.mac);
      console.log(`[server] WoL sent to ${pc.name} (${pc.mac})`);
      return Response.json({ ok: true, message: `WoL sent to ${pc.name}` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return Response.json({ ok: false, error: msg }, { status: 500 });
    }
  }

  // REST API: shutdown a PC
  if (req.method === "POST" && url.pathname.startsWith("/api/shutdown/")) {
    const id = parseInt(url.pathname.split("/").pop() ?? "");
    const pc = PCS.find((p) => p.id === id);
    if (!pc) return new Response("PC not found", { status: 404 });

    const ws = agents.get(id);
    if (!ws) {
      return Response.json({ ok: false, error: `${pc.name} is not connected` }, { status: 409 });
    }

    const sent = sendShutdown(ws);
    if (sent) {
      console.log(`[server] Shutdown sent to ${pc.name}`);
      return Response.json({ ok: true, message: `Shutdown sent to ${pc.name}` });
    } else {
      return Response.json({ ok: false, error: "Agent socket not open" }, { status: 409 });
    }
  }

  // Serve agent.ts so remote PCs can run it without copying the file:
  //   deno run --allow-net --allow-run http://<server>:8000/agent.ts --id=2
  if (url.pathname === "/agent.ts") {
    try {
      const src = await Deno.readTextFile("./agent.ts");
      return new Response(src, { headers: { "content-type": "application/typescript" } });
    } catch {
      return new Response("agent.ts not found", { status: 404 });
    }
  }

  // Serve static files
  if (url.pathname === "/" || url.pathname === "/index.html") {
    try {
      const html = await Deno.readTextFile("./static/index.html");
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
    } catch {
      return new Response("index.html not found", { status: 404 });
    }
  }

  return new Response("Not found", { status: 404 });
}

console.log(`[server] VR Dashboard running on http://localhost:${PORT}`);
Deno.serve({ port: PORT }, handleRequest);
