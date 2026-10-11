import { MCPToolDefinition, MCPRequestPayload, MCPResponsePayload, DeviceTelemetryEvent, LivingRoomSceneState } from '../types.js';
export declare const ALEXA_MCP_TOOLS: MCPToolDefinition[];
export declare class AlexaStreamableMCPServer {
    private serverVersion;
    private sceneState;
    constructor();
    getSceneState(): LivingRoomSceneState;
    /**
     * Dispatches incoming JSON-RPC 2.0 Streamable HTTP calls from Alexa+.
     */
    handleMCPRequest(request: MCPRequestPayload): Promise<MCPResponsePayload>;
    /**
     * Autonomous cross-device orchestration logic:
     * When Ring detects motion at the door while Fire TV is playing:
     * - Pauses Fire TV media
     * - Shows PiP camera feed on TV
     * - Reads Bee Wearable user stress
     * - Dims ambient lighting to assist focus
     */
    processDeviceEvent(event: DeviceTelemetryEvent): Promise<LivingRoomSceneState>;
    private executeTool;
}
