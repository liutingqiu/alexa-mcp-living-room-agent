/**
 * Protocol and orchestration tests. The MCP transport is exercised over real
 * HTTP: sockets are opened, JSON-RPC is parsed, SSE is produced.
 */

import test from "node:test";
import assert from "node:assert/strict";

const { LivingRoomMcpServer } = await import("../dist/server/mcp_server.js");
const { ContractDeviceAdapter } = await import("../dist/devices.js");

async function withServer(run) {
  const server = new LivingRoomMcpServer(new ContractDeviceAdapter());
  const handle = await server.listen(0);
  const url = "http://127.0.0.1:" + handle.port + "/mcp";
  try {
    await run(url, server);
  } finally {
    await handle.close();
  }
}

async function rpc(url, body, headers = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return response;
}

test("initialize returns protocol version and server info", async () => {
  await withServer(async (url) => {
    const response = await rpc(url, { jsonrpc: "2.0", id: 1, method: "initialize", params: {} });
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("mcp-session-id"));
    const body = await response.json();
    assert.equal(body.id, 1);
    assert.equal(body.result.serverInfo.name, "alexa-plus-living-room");
    assert.ok(body.result.protocolVersion);
    assert.equal(body.result.capabilities.tools.listChanged, false);
  });
});

test("tools/list exposes the orchestration surface", async () => {
  await withServer(async (url) => {
    const body = await (await rpc(url, { jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
    const names = body.result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(names, [
      "bee_wearable_get_biometrics",
      "firetv_display_heads_up_alert",
      "living_room_scene_apply",
      "ring_get_doorbell_feed",
      "server_capabilities",
    ]);
    for (const tool of body.result.tools) assert.ok(tool.inputSchema.type === "object");
  });
});

test("server_capabilities reports that the adapter is not talking to real devices", async () => {
  await withServer(async (url) => {
    const body = await (await rpc(url, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "server_capabilities", arguments: {} },
    })).json();
    const payload = JSON.parse(body.result.content[0].text);
    assert.equal(payload.adapter, "contract-device");
    assert.equal(payload.realDevices, false);
  });
});

test("doorbell event produces the pause-and-overlay decision with real actions", async () => {
  await withServer(async (url) => {
    await rpc(url, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "living_room_scene_apply", arguments: { deviceId: "media", kind: "media", payload: { state: "playing" } } },
    });
    const body = await (await rpc(url, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "living_room_scene_apply", arguments: { deviceId: "ring:front-door", kind: "doorbell", payload: { summary: "Someone at the door" } } },
    })).json();
    const decision = JSON.parse(body.result.content[0].text);
    assert.equal(decision.rule, "doorbell.pause_and_overlay");
    assert.ok(decision.actions.length >= 2);
    assert.equal(decision.actions[0].action, "pause");
    assert.ok(decision.actions.every((action) => action.ok));
  });
});

test("biometric stress above threshold dims the lights and records the number", async () => {
  await withServer(async (_url, server) => {
    const decision = await server.orchestrator.handle({
      deviceId: "bee:wearable-1",
      kind: "biometric",
      at: Date.now(),
      payload: { stress: 82 },
    });
    assert.equal(decision.rule, "biometric.dim_lights");
    assert.equal(server.orchestrator.state.lightsLevel, 40);
    assert.ok(decision.reason.includes("82"));
  });
});

test("unknown method returns -32601", async () => {
  await withServer(async (url) => {
    const body = await (await rpc(url, { jsonrpc: "2.0", id: 6, method: "tools/unknown" })).json();
    assert.equal(body.error.code, -32601);
  });
});

test("malformed JSON returns a parse error", async () => {
  await withServer(async (url) => {
    const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: "{not json" });
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, -32700);
  });
});

test("SSE clients get an event-stream frame", async () => {
  await withServer(async (url) => {
    const response = await rpc(url, { jsonrpc: "2.0", id: 7, method: "ping" }, { accept: "text/event-stream" });
    assert.equal(response.headers.get("content-type"), "text/event-stream");
    const text = await response.text();
    assert.ok(text.startsWith("event: message"));
    assert.ok(text.includes("\"id\":7"));
  });
});
