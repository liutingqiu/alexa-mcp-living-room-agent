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
/** Deterministic local device used when no partner credentials exist. */
export class ContractDeviceAdapter {
    name = "contract-device";
    realDevices = false;
    state = new Map();
    queue = [];
    constructor(devices = ["ring:front-door", "firetv:living-room", "bee:wearable-1", "alexa:lights"]) {
        for (const deviceId of devices) {
            this.state.set(deviceId, {
                deviceId,
                online: true,
                detail: { source: "contract", note: "local stand-in, no vendor API involved" },
            });
        }
    }
    async snapshot(deviceId) {
        const state = this.state.get(deviceId);
        if (!state)
            throw new Error("unknown device: " + deviceId);
        return state;
    }
    async command(deviceId, action, params) {
        if (!this.state.has(deviceId))
            throw new Error("unknown device: " + deviceId);
        return { accepted: true, deviceId, action, params, appliedAt: Date.now(), source: "contract" };
    }
    push(event) {
        this.queue.push(event);
    }
    async *events() {
        while (this.queue.length) {
            const next = this.queue.shift();
            if (next)
                yield next;
        }
    }
}
/**
 * Real HTTP adapter. Never constructed unless PARTNER_DEVICE_BASE_URL and
 * PARTNER_DEVICE_TOKEN are present, because without them every call would 401.
 */
export class HttpDeviceAdapter {
    baseUrl;
    token;
    timeoutMs;
    name = "http-device";
    realDevices = true;
    constructor(baseUrl, token, timeoutMs = 8000) {
        this.baseUrl = baseUrl;
        this.token = token;
        this.timeoutMs = timeoutMs;
    }
    async call(path, init) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const response = await fetch(new URL(path, this.baseUrl).toString(), {
                ...init,
                headers: { authorization: "Bearer " + this.token, "content-type": "application/json", ...(init.headers ?? {}) },
                signal: controller.signal,
            });
            const text = await response.text();
            if (!response.ok)
                throw new Error("device API HTTP " + response.status + ": " + text.slice(0, 160));
            return text ? JSON.parse(text) : {};
        }
        finally {
            clearTimeout(timer);
        }
    }
    async snapshot(deviceId) {
        const payload = await this.call("/v1/devices/" + encodeURIComponent(deviceId), { method: "GET" });
        return { deviceId, online: Boolean(payload.online ?? true), detail: payload };
    }
    async command(deviceId, action, params) {
        return this.call("/v1/devices/" + encodeURIComponent(deviceId) + "/commands", {
            method: "POST",
            body: JSON.stringify({ action, params }),
        });
    }
    async *events() {
        const response = await fetch(new URL("/v1/events", this.baseUrl).toString(), {
            headers: { authorization: "Bearer " + this.token, accept: "text/event-stream" },
        });
        if (!response.ok || !response.body)
            throw new Error("event stream unavailable: HTTP " + response.status);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                return;
            buffer += decoder.decode(value, { stream: true });
            let index = buffer.indexOf("\n\n");
            while (index >= 0) {
                const frame = buffer.slice(0, index).trim();
                buffer = buffer.slice(index + 2);
                const line = frame.split("\n").find((entry) => entry.startsWith("data:"));
                if (line) {
                    try {
                        yield JSON.parse(line.slice(5).trim());
                    }
                    catch {
                        /* ignore malformed frame */
                    }
                }
                index = buffer.indexOf("\n\n");
            }
        }
    }
}
export function selectAdapter() {
    const baseUrl = process.env.PARTNER_DEVICE_BASE_URL;
    const token = process.env.PARTNER_DEVICE_TOKEN;
    if (baseUrl && token)
        return new HttpDeviceAdapter(baseUrl, token);
    return new ContractDeviceAdapter();
}
