# Alexa+ MCP Living Room Orchestration Studio 🏠✨

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/Tests-5%2F5%20Passed-brightgreen)](tests/alexa_mcp.test.js)
[![Amazon Devpost](https://img.shields.io/badge/Amazon-Developer%20Hackathon%20%24138K-orange)](https://amazonappdev2026.devpost.com/)
[![MCP Spec](https://img.shields.io/badge/MCP-Spec%202025--11--25-blue)](https://modelcontextprotocol.io/)
[![Live Terminal](https://img.shields.io/badge/Live%20Terminal-GitHub%20Pages-success)](https://liutingqiu.github.io/alexa-mcp-living-room-agent/)

**Self-Hosted Model Context Protocol (MCP Spec 2025-11-25 Streamable HTTP) Server uniting Amazon Alexa+, Fire TV (Vega OS), Ring Doorbell, and Bee Wearable AI into an Autonomous Living Room Mesh.**

Submitted to the **Build, Ship, Shape: Amazon Developer Hackathon ($138,000 Cash Pool)** on Devpost.

---

## 🌟 Overview

For the first time, Fire TV, Alexa+, Ring, and Bee are open to developers in a single global hackathon.

**Alexa+ MCP Living Room Studio** bridges these devices into a unified proactive intelligence mesh:
1. **Self-Hosted MCP Server (Spec 2025-11-25):** Implements Streamable HTTP JSON-RPC 2.0 to expose home device capabilities directly to Alexa+.
2. **Proactive Visitor Handling:** Pauses 4K media on Fire TV, displays a picture-in-picture (PiP) feed of the visitor from Ring Doorbell, and dims ambient lights.
3. **Biofeedback Stress Reduction:** Ingests live telemetry from the user's Bee AI Wearable and dynamically softens living room ambiance.
4. **Live Interactive Web Simulator:** Fully functional browser dashboard deployed on GitHub Pages.

---

## 🌐 Live Interactive Studio

Simulate the multi-device living room mesh and MCP tool calls online:  
👉 **[https://liutingqiu.github.io/alexa-mcp-living-room-agent/](https://liutingqiu.github.io/alexa-mcp-living-room-agent/)**

---

## 📦 Quick Start & Usage

```bash
git clone https://github.com/liutingqiu/alexa-mcp-living-room-agent.git
cd alexa-mcp-living-room-agent
npm install
npm test
```

### TypeScript / ESM Example

```typescript
import { AlexaStreamableMCPServer } from 'alexa-mcp-living-room-agent';

// 1. Initialize self-hosted MCP Server
const server = new AlexaStreamableMCPServer();

// 2. Query available tools via MCP JSON-RPC 2.0
const toolsResponse = await server.handleMCPRequest({
  jsonrpc: '2.0',
  id: 'init_01',
  method: 'tools/list'
});
console.log('Available MCP Tools:', toolsResponse.result);

// 3. Dispatch cross-device doorbell notification
await server.handleMCPRequest({
  jsonrpc: '2.0',
  id: 'call_01',
  method: 'tools/call',
  params: {
    name: 'firetv_display_heads_up_alert',
    arguments: {
      alertTitle: 'Ring Motion Detected',
      message: 'Visitor at front porch',
      pauseCurrentMedia: true
    }
  }
});
```

---

## 🧪 Automated Test Suite

```bash
node --test tests/alexa_mcp.test.js
```

Output:
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

## 📖 Hackathon Documentation

Read the full project pitch deck, architectural rationale, and multi-device interaction matrix:  
👉 **[PITCH_DECK.md](PITCH_DECK.md)**

---

## 📄 License

Released under the [MIT License](LICENSE).
