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
export class ContractDeviceAdapter implements DeviceAdapter {
  readonly name = "contract-device";
  readonly realDevices = false;
  private readonly state = new Map<string, DeviceState>();
  private readonly queue: DeviceEvent[] = [];

  constructor(devices: string[] = ["ring:front-door", "firetv:living-room", "bee:wearable-1", "alexa:lights"]) {
    for (const deviceId of devices) {
      this.state.set(deviceId, {
        deviceId,
        online: true,
        detail: { source: "contract", note: "local stand-in, no vendor API involved" },
      });
    }
  }

  async snapshot(deviceId: string): Promise<DeviceState> {
    const state = this.state.get(deviceId);
    if (!state) throw new Error("unknown device: " + deviceId);
    return state;
  }

  async command(deviceId: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.state.has(deviceId)) throw new Error("unknown device: " + deviceId);
    return { accepted: true, deviceId, action, params, appliedAt: Date.now(), source: "contract" };
  }

  push(event: DeviceEvent): void {
    this.queue.push(event);
  }

  async *events(): AsyncIterable<DeviceEvent> {
    while (this.queue.length) {
      const next = this.queue.shift();
      if (next) yield next;
    }
  }
}

/**
 * Real HTTP adapter. Never constructed unless PARTNER_DEVICE_BASE_URL and
 * PARTNER_DEVICE_TOKEN are present, because without them every call would 401.
 */
export class HttpDeviceAdapter implements DeviceAdapter {
  readonly name = "http-device";
  readonly realDevices = true;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly timeoutMs = 8000,
  ) {}

  private async call(path: string, init: RequestInit): Promise<Record<string, unknown>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(new URL(path, this.baseUrl).toString(), {
        ...init,
        headers: { authorization: "Bearer " + this.token, "content-type": "application/json", ...(init.headers ?? {}) },
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error("device API HTTP " + response.status + ": " + text.slice(0, 160));
      return text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } finally {
      clearTimeout(timer);
    }
  }

  async snapshot(deviceId: string): Promise<DeviceState> {
    const payload = await this.call("/v1/devices/" + encodeURIComponent(deviceId), { method: "GET" });
    return { deviceId, online: Boolean(payload.online ?? true), detail: payload };
  }

  async command(deviceId: string, action: string, params: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call("/v1/devices/" + encodeURIComponent(deviceId) + "/commands", {
      method: "POST",
      body: JSON.stringify({ action, params }),
    });
  }

  async *events(): AsyncIterable<DeviceEvent> {
    const response = await fetch(new URL("/v1/events", this.baseUrl).toString(), {
      headers: { authorization: "Bearer " + this.token, accept: "text/event-stream" },
    });
    if (!response.ok || !response.body) throw new Error("event stream unavailable: HTTP " + response.status);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      let index = buffer.indexOf("\n\n");
      while (index >= 0) {
        const frame = buffer.slice(0, index).trim();
        buffer = buffer.slice(index + 2);
        const line = frame.split("\n").find((entry) => entry.startsWith("data:"));
        if (line) {
          try {
            yield JSON.parse(line.slice(5).trim()) as DeviceEvent;
          } catch {
            /* ignore malformed frame */
          }
        }
        index = buffer.indexOf("\n\n");
      }
    }
  }
}

export function selectAdapter(): DeviceAdapter {
  const baseUrl = process.env.PARTNER_DEVICE_BASE_URL;
  const token = process.env.PARTNER_DEVICE_TOKEN;
  if (baseUrl && token) return new HttpDeviceAdapter(baseUrl, token);
  return new ContractDeviceAdapter();
}
