/**
 * Device adapters.
 *
 * Alexa+, Ring and Bee do not expose public developer APIs. There is therefore no
 * code path here that can talk to the real devices, and this module does not
 * pretend otherwise: ContractDeviceAdapter is an explicit local stand-in, and
 * HttpDeviceAdapter is the real HTTP shape that a granted partner token would
 * use. Which one is active is reported by the server on /health and echoed in
 * every tool result.
 */
export interface DeviceEvent {
    deviceId: string;
    kind: "motion" | "doorbell" | "biometric" | "media";
    at: number;
    payload: Record<string, unknown>;
}
export interface DeviceState {
    deviceId: string;
    online: boolean;
    detail: Record<string, unknown>;
}
export interface DeviceAdapter {
    readonly name: string;
    readonly realDevices: boolean;
    snapshot(deviceId: string): Promise<DeviceState>;
    command(deviceId: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    events(): AsyncIterable<DeviceEvent>;
}
/** Deterministic local device used when no partner credentials exist. */
export declare class ContractDeviceAdapter implements DeviceAdapter {
    readonly name = "contract-device";
    readonly realDevices = false;
    private readonly state;
    private readonly queue;
    constructor(devices?: string[]);
    snapshot(deviceId: string): Promise<DeviceState>;
    command(deviceId: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    push(event: DeviceEvent): void;
    events(): AsyncIterable<DeviceEvent>;
}
/**
 * Real HTTP adapter. Never constructed unless PARTNER_DEVICE_BASE_URL and
 * PARTNER_DEVICE_TOKEN are present, because without them every call would 401.
 */
export declare class HttpDeviceAdapter implements DeviceAdapter {
    private readonly baseUrl;
    private readonly token;
    private readonly timeoutMs;
    readonly name = "http-device";
    readonly realDevices = true;
    constructor(baseUrl: string, token: string, timeoutMs?: number);
    private call;
    snapshot(deviceId: string): Promise<DeviceState>;
    command(deviceId: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>>;
    events(): AsyncIterable<DeviceEvent>;
}
export declare function selectAdapter(): DeviceAdapter;
