export type AmazonDeviceType = 'FIRE_TV' | 'ALEXA_PLUS' | 'RING_DOORBELL' | 'BEE_WEARABLE';
export interface MCPToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
    };
}
export interface MCPRequestPayload {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: Record<string, unknown>;
}
export interface MCPResponsePayload {
    jsonrpc: '2.0';
    id: string | number;
    result?: unknown;
    error?: {
        code: number;
        message: string;
        data?: unknown;
    };
}
export interface DeviceTelemetryEvent {
    sourceDevice: AmazonDeviceType;
    deviceId: string;
    eventType: 'MOTION_DETECTED' | 'HEART_RATE_SPIKE' | 'MEDIA_PLAYBACK' | 'VOICE_INTENT';
    payload: Record<string, unknown>;
    timestamp: number;
}
export interface LivingRoomSceneState {
    sceneId: string;
    fireTvStatus: 'IDLE' | 'PLAYING_MOVIE' | 'PAUSED_ALERT';
    ringAlertActive: boolean;
    userStressLevel: 'NORMAL' | 'ELEVATED' | 'HIGH';
    activeLightingAmbientHex: string;
    lastOrchestrationTrace: string;
}
