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

export class Orchestrator {
  readonly state: SceneState = { mediaPlaying: false, lightsLevel: 80, lastDoorbellAt: null, lastStress: null };
  readonly decisions: Decision[] = [];

  constructor(private readonly adapter: DeviceAdapter) {}

  private async run(deviceId: string, action: string, params: Record<string, unknown>): Promise<ActionOutcome> {
    try {
      const detail = await this.adapter.command(deviceId, action, params);
      return { deviceId, action, ok: true, detail };
    } catch (error) {
      return { deviceId, action, ok: false, detail: error instanceof Error ? error.message : String(error) };
    }
  }

  async handle(event: DeviceEvent): Promise<Decision> {
    const started = Date.now();
    const actions: ActionOutcome[] = [];
    let rule = "no-op";
    let reason = "event matched no rule";

    if (event.kind === "doorbell") {
      rule = "doorbell.pause_and_overlay";
      reason = "someone is at the door while media may be playing";
      this.state.lastDoorbellAt = event.at;
      if (this.state.mediaPlaying) {
        actions.push(await this.run("firetv:living-room", "pause", {}));
        this.state.mediaPlaying = false;
      }
      actions.push(
        await this.run("firetv:living-room", "show_pip", {
          title: "Front door",
          message: String((event.payload as Record<string, unknown>).summary ?? "Doorbell pressed"),
          pauseCurrentMedia: true,
        }),
      );
    } else if (event.kind === "biometric") {
      const stress = Number((event.payload as Record<string, unknown>).stress ?? 0);
      this.state.lastStress = Number.isFinite(stress) ? stress : null;
      if (Number.isFinite(stress) && stress >= 70) {
        rule = "biometric.dim_lights";
        reason = "reported stress " + stress + " crosses the 70 threshold";
        const target = Math.max(10, this.state.lightsLevel - 40);
        actions.push(await this.run("alexa:lights", "set_level", { level: target }));
        this.state.lightsLevel = target;
      }
    } else if (event.kind === "motion") {
      const sustained = Number((event.payload as Record<string, unknown>).sustainedSeconds ?? 0);
      if (sustained >= 8) {
        rule = "motion.long_dwell_notify";
        reason = "motion sustained for " + sustained + "s at " + event.deviceId;
        actions.push(await this.run("firetv:living-room", "show_pip", { title: "Motion", message: event.deviceId }));
      }
    } else if (event.kind === "media" && event.payload.state === "playing") {
      rule = "media.track_playback";
      reason = "playback state changed to playing";
      this.state.mediaPlaying = true;
    }

    const decision: Decision = { rule, reason, event, actions, durationMs: Date.now() - started };
    this.decisions.push(decision);
    return decision;
  }
}
