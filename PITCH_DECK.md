# Alexa+ MCP Living Room Orchestration Studio 🏠✨

> **Submitted to Devpost • Build, Ship, Shape: Amazon Developer Hackathon ($138,000 Cash Pool)**  
> **Target Track:** Alexa+ & Living Room Experience (Cross-Device Integration: Fire TV, Ring, Bee Wearable AI)  
> **Live Interactive Studio:** [https://liutingqiu.github.io/alexa-mcp-living-room-agent/](https://liutingqiu.github.io/alexa-mcp-living-room-agent/)  
> **Open Source GitHub Repository:** [https://github.com/liutingqiu/alexa-mcp-living-room-agent](https://github.com/liutingqiu/alexa-mcp-living-room-agent)  
> **Lead Developer & Author:** Tingqiu Liu (`@liutingqiu`, `tianqi689@gmail.com`)

---

## 🎯 Executive Summary & The Problem

Amazon has united **Fire TV**, **Alexa+**, **Ring**, and **Bee (Wearable AI)** into a single developer ecosystem. However, in most smart homes, these devices remain isolated silos:
1. When someone rings the doorbell or walks up to the porch, the user watching a movie on Fire TV misses the event or fumbles for their phone.
2. Smart home lighting and entertainment do not adapt to the user's real-time physiological state (e.g. stress, fatigue tracked by wearables).
3. Alexa+ requires a standardized, interoperable protocol to communicate with custom tools and local hardware.

---

## 💡 The Solution: Alexa+ Self-Hosted MCP Server

**Alexa+ MCP Living Room Orchestration Studio** implements a self-hosted **Model Context Protocol (MCP Spec 2025-11-25, Streamable HTTP)** server that bridges Alexa+ with Fire TV, Ring Doorbell, and Bee Wearable AI into an autonomous, proactive home intelligence mesh.

### Core Architectural Innovations:

### 1. Spec-Compliant Self-Hosted MCP Server
- Implements the official **MCP 2025-11-25** standard with Streamable HTTP JSON-RPC 2.0 transport.
- Exposes standardized tools:
  - `ring_get_doorbell_feed`: Fetches visitor snapshots and motion telemetry.
  - `firetv_display_heads_up_alert`: Renders picture-in-picture (PiP) overlays and pauses media playback on Vega OS / Fire OS.
  - `bee_wearable_get_biometrics`: Ingests continuous heart rate, HRV, and stress telemetry.
  - `alexa_set_ambient_lighting`: Manages smart home focus and biofeedback illumination.

### 2. Proactive Cross-Device Orchestration
- **Visitor Flow:** When Ring detects front-door motion, the agent autonomously pauses 4K video on Fire TV, overlays the live camera feed in the top-right corner, and shifts ambient lights to alert blue (#38BDF8).
- **Biofeedback Calming Flow:** When Bee Wearable detects elevated stress (e.g. >120 BPM), the agent softens lighting to soothing emerald green (#14F195) and adjusts sound volume.

### 3. Interactive Web Studio & Device Simulator
- Deployed on **GitHub Pages** with live multi-device state tracking, simulated Ring motion and Bee stress triggers, and real-time MCP JSON-RPC audit traces.

---

## 🛠️ Architecture & Tech Stack

```text
alexa-mcp-living-room-agent/
├── src/
│   ├── types.ts                   # MCP schemas, device telemetry, scene states
│   ├── server/
│   │   └── mcp_server.ts          # Streamable HTTP MCP server & cross-device orchestration
│   └── index.ts                   # Unified library entrypoint
├── tests/
│   └── alexa_mcp.test.js          # 5 automated unit tests (MCP tools, RPC calls, orchestration)
├── index.html                     # Live interactive simulator on GitHub Pages
├── PITCH_DECK.md                  # Hackathon pitch deck & submission document
└── README.md                      # Developer documentation & quickstart
```

- **Runtime:** Node.js (ESM), TypeScript 5.6
- **Test Suite:** `node:test` + `node:assert/strict` (5/5 passed, 100% green)
- **Frontend:** Pure HTML5/CSS/JS (Amazon Orange & Alexa Cyan aesthetic, deployed on GitHub Pages)
- **Amazon Integrations:** Alexa+ MCP Spec 2025-11-25, Fire TV Vega OS / Fire OS, Ring Doorbell, Bee Wearable AI

---

## 🔬 Test Suite Verification

```text
✔ 1. AlexaStreamableMCPServer advertises MCP spec 2025-11-25 tools (0.7ms)
✔ 2. AlexaStreamableMCPServer dispatches Ring doorbell feed tool call (0.2ms)
✔ 3. AlexaStreamableMCPServer overlays alert and pauses Fire TV playback (0.1ms)
✔ 4. Cross-device orchestration responds to Ring motion event (0.2ms)
✔ 5. Cross-device orchestration responds to Bee Wearable biometric stress spike (0.1ms)

ℹ pass 5
ℹ fail 0
```

---

## 🏆 Project Deliverables & Links

- **Live Interactive Studio:** [https://liutingqiu.github.io/alexa-mcp-living-room-agent/](https://liutingqiu.github.io/alexa-mcp-living-room-agent/)
- **GitHub Repository:** [https://github.com/liutingqiu/alexa-mcp-living-room-agent](https://github.com/liutingqiu/alexa-mcp-living-room-agent)
- **Lead Developer Contact:** Tingqiu Liu (`tianqi689@gmail.com`) / GitHub: `liutingqiu`

---
*Built with ❤️ for Amazon, Alexa+, Devpost, and the Global Ambient AI Community.*
