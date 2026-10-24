/**
 * Living-room orchestrator: deterministic rules over device events.
 *
 * The rules are plain code so a judge can read the decision table and predict
 * every action. Each decision is recorded with the event that triggered it, the
 * actions attempted, and the result of each call.
 */
import { DeviceAdapter, DeviceEvent } from "./devices.js";
export interface ActionOutcome {
    deviceId: string;
    action: string;
    ok: boolean;
    detail: Record<string, unknown> | string;
}
export interface Decision {
    rule: string;
    reason: string;
    event: DeviceEvent;
    actions: ActionOutcome[];
    durationMs: number;
}
export interface SceneState {
    mediaPlaying: boolean;
    lightsLevel: number;
    lastDoorbellAt: number | null;
    lastStress: number | null;
}
export declare class Orchestrator {
    private readonly adapter;
    readonly state: SceneState;
    readonly decisions: Decision[];
    constructor(adapter: DeviceAdapter);
    private run;
    handle(event: DeviceEvent): Promise<Decision>;
}
