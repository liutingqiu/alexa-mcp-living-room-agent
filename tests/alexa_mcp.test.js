// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { AlexaStreamableMCPServer, ALEXA_MCP_TOOLS } from '../dist/index.js';

test('1. AlexaStreamableMCPServer advertises MCP spec 2025-11-25 tools', async () => {
  const server = new AlexaStreamableMCPServer();
  const res = await server.handleMCPRequest({
    jsonrpc: '2.0',
    id: 'req_01',
    method: 'tools/list'
  });

  assert.equal(res.id, 'req_01');
  const result = res.result;
  assert.equal(result.protocolVersion, '2025-11-25');
  assert.equal(result.tools.length, 4);
});

test('2. AlexaStreamableMCPServer dispatches Ring doorbell feed tool call', async () => {
  const server = new AlexaStreamableMCPServer();
  const res = await server.handleMCPRequest({
    jsonrpc: '2.0',
    id: 'req_02',
    method: 'tools/call',
    params: {
      name: 'ring_get_doorbell_feed',
      arguments: { doorbellId: 'front_door_01' }
    }
  });

  assert.equal(res.id, 'req_02');
  const result = res.result;
  assert.equal(result.doorbellId, 'front_door_01');
  assert.equal(result.status, 'ONLINE');
  assert.ok(result.liveFeedUrl.includes('ring.amazon.com'));
});

test('3. AlexaStreamableMCPServer overlays alert and pauses Fire TV playback', async () => {
  const server = new AlexaStreamableMCPServer();
  const res = await server.handleMCPRequest({
    jsonrpc: '2.0',
    id: 'req_03',
    method: 'tools/call',
    params: {
      name: 'firetv_display_heads_up_alert',
      arguments: {
        alertTitle: 'Delivery at Front Door',
        message: 'Amazon courier arrived',
        pauseCurrentMedia: true
      }
    }
  });

  const result = res.result;
  assert.equal(result.displayOverlayRendered, true);
  assert.equal(result.mediaState, 'PAUSED_ALERT');
  assert.equal(server.getSceneState().fireTvStatus, 'PAUSED_ALERT');
});

test('4. Cross-device orchestration responds to Ring motion event', async () => {
  const server = new AlexaStreamableMCPServer();
  const state = await server.processDeviceEvent({
    sourceDevice: 'RING_DOORBELL',
    deviceId: 'ring_cam_01',
    eventType: 'MOTION_DETECTED',
    payload: { confidence: 0.98 },
    timestamp: Date.now()
  });

  assert.equal(state.ringAlertActive, true);
  assert.equal(state.fireTvStatus, 'PAUSED_ALERT');
  assert.equal(state.activeLightingAmbientHex, '#38BDF8');
  assert.ok(state.lastOrchestrationTrace.includes('Ring Motion Detected'));
});

test('5. Cross-device orchestration responds to Bee Wearable biometric stress spike', async () => {
  const server = new AlexaStreamableMCPServer();
  const state = await server.processDeviceEvent({
    sourceDevice: 'BEE_WEARABLE',
    deviceId: 'bee_band_01',
    eventType: 'HEART_RATE_SPIKE',
    payload: { bpm: 125 },
    timestamp: Date.now()
  });

  assert.equal(state.userStressLevel, 'ELEVATED');
  assert.equal(state.activeLightingAmbientHex, '#14F195');
  assert.ok(state.lastOrchestrationTrace.includes('soothing calm mode'));
});
