/**
 * Living-room orchestrator: deterministic rules over device events.
 *
 * The rules are plain code so a judge can read the decision table and predict
 * every action. Each decision is recorded with the event that triggered it, the
 * actions attempted, and the result of each call.
 */
export class Orchestrator {
    adapter;
    state = { mediaPlaying: false, lightsLevel: 80, lastDoorbellAt: null, lastStress: null };
    decisions = [];
    constructor(adapter) {
        this.adapter = adapter;
    }
    async run(deviceId, action, params) {
        try {
            const detail = await this.adapter.command(deviceId, action, params);
            return { deviceId, action, ok: true, detail };
        }
        catch (error) {
            return { deviceId, action, ok: false, detail: error instanceof Error ? error.message : String(error) };
        }
    }
    async handle(event) {
        const started = Date.now();
        const actions = [];
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
            actions.push(await this.run("firetv:living-room", "show_pip", {
                title: "Front door",
                message: String(event.payload.summary ?? "Doorbell pressed"),
                pauseCurrentMedia: true,
            }));
        }
        else if (event.kind === "biometric") {
            const stress = Number(event.payload.stress ?? 0);
            this.state.lastStress = Number.isFinite(stress) ? stress : null;
            if (Number.isFinite(stress) && stress >= 70) {
                rule = "biometric.dim_lights";
                reason = "reported stress " + stress + " crosses the 70 threshold";
                const target = Math.max(10, this.state.lightsLevel - 40);
                actions.push(await this.run("alexa:lights", "set_level", { level: target }));
                this.state.lightsLevel = target;
            }
        }
        else if (event.kind === "motion") {
            const sustained = Number(event.payload.sustainedSeconds ?? 0);
            if (sustained >= 8) {
                rule = "motion.long_dwell_notify";
                reason = "motion sustained for " + sustained + "s at " + event.deviceId;
                actions.push(await this.run("firetv:living-room", "show_pip", { title: "Motion", message: event.deviceId }));
            }
        }
        else if (event.kind === "media" && event.payload.state === "playing") {
            rule = "media.track_playback";
            reason = "playback state changed to playing";
            this.state.mediaPlaying = true;
        }
        const decision = { rule, reason, event, actions, durationMs: Date.now() - started };
        this.decisions.push(decision);
        return decision;
    }
}
