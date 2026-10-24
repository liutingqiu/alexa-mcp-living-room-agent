/**
 * Drive one full MCP session and save the transcript.
 *
 * The output is what a client would see: initialize, tools/list, then the
 * orchestration calls, with timings measured around each HTTP round trip.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { selectAdapter } from "../dist/devices.js";
import { LivingRoomMcpServer } from "../dist/server/mcp_server.js";

const outDir = process.argv[2] ?? "runs/demo";
mkdirSync(outDir, { recursive: true });

const adapter = selectAdapter();
const server = new LivingRoomMcpServer(adapter);
const handle = await server.listen(0);
const url = "http://127.0.0.1:" + handle.port + "/mcp";

const transcript = [];
let id = 0;

async function call(method, params) {
  id += 1;
  const started = Date.now();
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const body = await response.json();
  transcript.push({ id, method, params: params ?? null, status: response.status, durationMs: Date.now() - started, result: body.result ?? null, error: body.error ?? null });
  return body;
}

await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "demo-client", version: "1.0.0" } });
const tools = await call("tools/list", {});

await call("tools/call", { name: "server_capabilities", arguments: {} });
await call("tools/call", { name: "living_room_scene_apply", arguments: { deviceId: "media", kind: "media", payload: { state: "playing" } } });
await call("tools/call", { name: "living_room_scene_apply", arguments: { deviceId: "ring:front-door", kind: "doorbell", payload: { summary: "Package delivery" } } });
await call("tools/call", { name: "living_room_scene_apply", arguments: { deviceId: "bee:wearable-1", kind: "biometric", payload: { stress: 84 } } });
await call("tools/call", { name: "firetv_display_heads_up_alert", arguments: { deviceId: "firetv:living-room", title: "Motion", message: "Back garden" } });

const durations = transcript.map((entry) => entry.durationMs).sort((a, b) => a - b);
const metrics = {
  adapter: adapter.name,
  realDevices: adapter.realDevices,
  roundTrips: transcript.length,
  tools: (tools.result?.tools ?? []).length,
  protocolVersion: transcript[0].result?.protocolVersion ?? null,
  latencyMs: {
    p50: durations[Math.floor(durations.length / 2)],
    max: durations[durations.length - 1],
  },
  decisions: server.orchestrator.decisions.map((decision) => ({
    rule: decision.rule,
    reason: decision.reason,
    actions: decision.actions.map((action) => ({ deviceId: action.deviceId, action: action.action, ok: action.ok })),
    durationMs: decision.durationMs,
  })),
  sceneState: server.orchestrator.state,
};

writeFileSync(join(outDir, "session.json"), JSON.stringify(transcript, null, 2));
writeFileSync(join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
await handle.close();
console.log(JSON.stringify(metrics, null, 2));
