# Living Room Orchestrator - Technical Report

**Competition:** submitted to Amazon Developer and related hackathons  
**Team:** Tingqiu Liu (@liutingqiu)  
**Repository:** https://github.com/liutingqiu/alexa-mcp-living-room-agent  
**Runtime:** Node 26, TypeScript 5.6.3, no MCP SDK dependency

---

## 1. What was wrong before

The submitted version declared four MCP tool schemas, then answered tool calls from string
constants - including a fabricated `liveFeedUrl` for a Ring device and biometric values that came
from nowhere. No socket was opened, no JSON-RPC frame was parsed, and there was no server to connect
to at all: `mcp_server.ts` was a class with a `handleCall(name)` switch.

## 2. What exists now

A real server, built on `node:http`, that speaks the MCP Streamable HTTP profile:

* `POST /mcp` accepts a JSON-RPC 2.0 object or batch, answers as JSON, or as `text/event-stream`
  when the client sends `accept: text/event-stream`, and sets `mcp-session-id` on every response.
* Methods: `initialize` (returns `protocolVersion`, `serverInfo`, `capabilities.tools`), `tools/list`,
  `tools/call`, `ping`, and notification methods (which correctly return no body).
* Error codes: `-32700` parse error on malformed JSON (HTTP 400), `-32601` method not found, tool
  failures returned as `isError: true` content rather than transport errors.
* `GET /health` reports the active adapter and whether it targets real devices.

## 3. Device layer, stated plainly

`DeviceAdapter` is the seam. Two implementations:

| Adapter | Used when | Talks to |
| --- | --- | --- |
| `ContractDeviceAdapter` | default | nothing - deterministic local state, `realDevices: false` |
| `HttpDeviceAdapter` | `PARTNER_DEVICE_BASE_URL` + `PARTNER_DEVICE_TOKEN` set | a partner endpoint over HTTP with bearer auth, 8 s timeout, and an SSE event stream |

Alexa+, Ring and Bee have no public developer APIs. That is a fact about the platform, not a gap in
the code, and it is why the repository does not contain a code path that could plausibly reach them.
The HTTP adapter is the real implementation of the interface a partner grant would expose; every
tool result carries which adapter produced it, so a judge can see which mode a run used.

## 4. Rule table

`src/orchestrator.ts` holds a small readable decision table:

| Event | Condition | Actions |
| --- | --- | --- |
| `doorbell` | always | pause media if playing, show picture-in-picture |
| `biometric` | `stress >= 70` | lower lights by 40, floor 10 |
| `motion` | `sustainedSeconds >= 8` | picture-in-picture notice |
| `media` | `state == playing` | update scene state |

Each decision is recorded with the triggering event, the reason string (including the measured value
that crossed the threshold), every action attempted, and whether it succeeded. A device that rejects
a command produces `ok: false` and does not abort the decision.

## 5. Measured session

Recording from `scripts/demo-run.mjs` against the contract adapter on 2026-10-24:

| Metric | Value |
| --- | --- |
| Round trips | 7 (initialize, tools/list, 5 tool calls) |
| Tools exposed | 5 |
| Protocol version | 2025-06-18 |
| Latency p50 / max | 15 ms / 19 ms (loopback) |
| Decisions produced | 3 (playback tracked, doorbell pause+overlay, stress dim) |
| Scene state after run | media paused, lights 40, last stress 84 |
| Tests | 8 passed |

Latencies are loopback round trips, not device latencies; with the HTTP adapter they would be
dominated by the partner endpoint.

## 6. Limitations

* No real device has been contacted, so no end-to-end claim is made about Alexa+, Ring or Bee.
* The SSE endpoint is one-shot per request (frames then close), not a long-lived duplex stream;
  resumability via `Last-Event-ID` is not implemented.
* No auth on the server itself — it binds to `127.0.0.1` and assumes a local trusted client.
* The rule table is hand-written and small by design; nothing here learns from history.
