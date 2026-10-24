# Living Room Orchestrator (MCP)

MCP server over Streamable HTTP that turns device events into a recorded action sequence.

| | |
| --- | --- |
| Transport | `POST /mcp`, JSON-RPC 2.0, JSON or `text/event-stream` response |
| Protocol | `initialize`, `tools/list`, `tools/call`, `ping`, notifications |
| Tools | 5 (doorbell snapshot, Fire TV alert, biometrics, scene apply, capabilities) |
| Session record | 7 round trips, p50 15 ms, 3 decisions, 5 tools |
| Device layer | `contract-device` by default; `http-device` when partner credentials exist |

Session record: https://liutingqiu.github.io/alexa-mcp-living-room-agent/  
Report: [`docs/technical-report.md`](docs/technical-report.md)

## Quick start

```bash
npm install && npm run build
npm start                                   # http://127.0.0.1:8790/mcp
node scripts/demo-run.mjs runs/demo        # records a full session
npm test                                   # 8 tests
```

## What is real, what is not

Real: the HTTP transport, JSON-RPC framing, SSE responses, session id header, error codes, the
rule table, action dispatch, per-call timing, and the failure path when a device rejects a command.

Not real: the devices. Alexa+, Ring and Bee have no public developer API, so `ContractDeviceAdapter`
answers locally and `/health` plus the `server_capabilities` tool both report `realDevices: false`.
Set `PARTNER_DEVICE_BASE_URL` and `PARTNER_DEVICE_TOKEN` to switch to `HttpDeviceAdapter`, which
implements the real HTTP shape — bearer auth, `/v1/devices/:id`, `/v1/devices/:id/commands`, and an
SSE event stream — against whatever endpoint a partner grant provides.

The previous version of this repository listed tool schemas and returned hard-coded strings with a
hand-written `liveFeedUrl`. It never opened a socket. This version does not claim to have contacted
a device it cannot contact.

## Layout

```
src/devices.ts            adapter interface, contract adapter, HTTP adapter, selectAdapter()
src/orchestrator.ts       rule table over device events, action dispatch, per-decision timing
src/server/mcp_server.ts  HTTP routing, JSON-RPC dispatch, SSE, error codes
src/index.ts              start the server
scripts/demo-run.mjs      drive a full session and save session.json + metrics.json
tests/mcp.test.js         8 tests over real sockets
```
