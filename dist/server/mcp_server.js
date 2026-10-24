/**
 * MCP server over Streamable HTTP (single endpoint, JSON-RPC 2.0 body, JSON or
 * SSE response). Implements initialize, tools/list, tools/call and ping.
 *
 * Nothing here fabricates device data: every tool call goes through the
 * orchestrator into a DeviceAdapter, and the adapter reports whether it is a
 * real vendor API or the local contract stand-in.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Orchestrator } from "../orchestrator.js";
export const SERVER_INFO = { name: "alexa-plus-living-room", version: "2.0.0" };
export const TOOLS = [
    {
        name: "ring_get_doorbell_feed",
        description: "Return the current state of a doorbell device from the active adapter.",
        inputSchema: { type: "object", properties: { deviceId: { type: "string" } }, required: ["deviceId"] },
    },
    {
        name: "firetv_display_heads_up_alert",
        description: "Send a picture-in-picture alert command to a Fire TV device.",
        inputSchema: {
            type: "object",
            properties: { deviceId: { type: "string" }, title: { type: "string" }, message: { type: "string" } },
            required: ["deviceId", "title", "message"],
        },
    },
    {
        name: "bee_wearable_get_biometrics",
        description: "Read biometric telemetry for a wearable device.",
        inputSchema: { type: "object", properties: { deviceId: { type: "string" } }, required: ["deviceId"] },
    },
    {
        name: "living_room_scene_apply",
        description: "Run one device event through the orchestrator and return the decision and actions.",
        inputSchema: {
            type: "object",
            properties: {
                deviceId: { type: "string" },
                kind: { type: "string", enum: ["motion", "doorbell", "biometric", "media"] },
                payload: { type: "object" },
            },
            required: ["deviceId", "kind"],
        },
    },
    {
        name: "server_capabilities",
        description: "Report adapter name and whether it targets real vendor devices.",
        inputSchema: { type: "object", properties: {} },
    },
];
export class LivingRoomMcpServer {
    adapter;
    orchestrator;
    constructor(adapter) {
        this.adapter = adapter;
        this.orchestrator = new Orchestrator(adapter);
    }
    async callTool(name, args) {
        switch (name) {
            case "ring_get_doorbell_feed":
            case "bee_wearable_get_biometrics":
                return this.adapter.snapshot(String(args.deviceId ?? ""));
            case "firetv_display_heads_up_alert":
                return this.adapter.command(String(args.deviceId ?? ""), "show_pip", {
                    title: String(args.title ?? ""),
                    message: String(args.message ?? ""),
                });
            case "living_room_scene_apply": {
                const event = {
                    deviceId: String(args.deviceId ?? ""),
                    kind: String(args.kind ?? "motion"),
                    at: Date.now(),
                    payload: args.payload ?? {},
                };
                return this.orchestrator.handle(event);
            }
            case "server_capabilities":
                return { adapter: this.adapter.name, realDevices: this.adapter.realDevices };
            default:
                throw new Error("unknown tool: " + name);
        }
    }
    async handle(request) {
        const { method, params } = request;
        const id = request.id ?? null;
        const respond = (result) => ({ jsonrpc: "2.0", id, result });
        if (method === "initialize") {
            return respond({
                protocolVersion: "2025-06-18",
                serverInfo: SERVER_INFO,
                capabilities: { tools: { listChanged: false } },
                instructions: "Living room orchestration tools. Device adapter: " + this.adapter.name,
            });
        }
        if (method === "notifications/initialized" || method.startsWith("notifications/")) {
            return null;
        }
        if (method === "ping")
            return respond({});
        if (method === "tools/list")
            return respond({ tools: TOOLS });
        if (method === "tools/call") {
            const name = String(params?.name ?? "");
            const args = params?.arguments ?? {};
            try {
                const result = await this.callTool(name, args);
                return respond({ content: [{ type: "text", text: JSON.stringify(result) }], isError: false });
            }
            catch (error) {
                return respond({
                    content: [{ type: "text", text: error instanceof Error ? error.message : String(error) }],
                    isError: true,
                });
            }
        }
        return { jsonrpc: "2.0", id, error: { code: -32601, message: "method not found: " + method } };
    }
    listen(port) {
        const server = createServer((req, res) => this.route(req, res));
        return new Promise((resolve) => {
            server.listen(port, "127.0.0.1", () => {
                const address = server.address();
                const boundPort = typeof address === "object" && address ? address.port : port;
                resolve({
                    port: boundPort,
                    close: () => new Promise((done) => server.close(() => done())),
                });
            });
        });
    }
    async route(req, res) {
        if (req.url === "/health") {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok: true, adapter: this.adapter.name, realDevices: this.adapter.realDevices }));
            return;
        }
        if (req.url !== "/mcp") {
            res.writeHead(404, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "not_found" }));
            return;
        }
        if (req.method !== "POST") {
            res.writeHead(405, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "method_not_allowed", hint: "POST JSON-RPC to /mcp" }));
            return;
        }
        const chunks = [];
        for await (const chunk of req)
            chunks.push(chunk);
        let payload;
        try {
            payload = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        }
        catch {
            res.writeHead(400, { "content-type": "application/json" });
            res.end(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }));
            return;
        }
        const batch = Array.isArray(payload) ? payload : [payload];
        const responses = [];
        for (const item of batch) {
            const result = await this.handle(item);
            if (result)
                responses.push(result);
        }
        const accept = String(req.headers.accept ?? "");
        if (accept.includes("text/event-stream")) {
            res.writeHead(200, {
                "content-type": "text/event-stream",
                "cache-control": "no-cache",
                connection: "keep-alive",
                "mcp-session-id": randomUUID(),
            });
            for (const body of responses)
                res.write("event: message\ndata: " + JSON.stringify(body) + "\n\n");
            res.end();
            return;
        }
        res.writeHead(200, { "content-type": "application/json", "mcp-session-id": randomUUID() });
        res.end(JSON.stringify(Array.isArray(payload) ? responses : responses[0] ?? {}));
    }
}
