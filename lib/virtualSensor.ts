import { create } from "zustand";
import { SENSOR } from "./constants";

export type SensorSource = "virtual-pad" | "hardware";

interface SensorState {
  roll: number;
  pitch: number;
  yawHeading: number;
  tiltK: number;
  targetRoll: number;
  targetPitch: number;
  targetYaw: number;
  targetK: number;
  lastRoll: number;
  lastPitch: number;
  lastYaw: number;
  t: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  impact: number;
  roadAnomaly: boolean;
  source: SensorSource;
  active: boolean;
  triggerImpact: (strength: number) => void;
  setHardwareData: (data: {
    pitch: number;
    roll: number;
    yaw: number;
    ax: number;
    ay: number;
    az: number;
    anomaly: boolean;
  }) => void;
  tick: (dt: number) => void;
}

const angleDelta = (a: number, b: number) => {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

export const useSensor = create<SensorState>()((set, get) => ({
  roll: 0,
  pitch: 0,
  yawHeading: 0,
  tiltK: 0,
  targetRoll: 0,
  targetPitch: 0,
  targetYaw: 0,
  targetK: 0,
  lastRoll: 0,
  lastPitch: 0,
  lastYaw: 0,
  t: 0,
  ax: 0,
  ay: 0,
  az: 1,
  gx: 0,
  gy: 0,
  gz: 0,
  impact: 0,
  roadAnomaly: false,
  source: "virtual-pad",
  active: false,

  triggerImpact: (strength) =>
    set((s) => ({ impact: Math.min(s.impact + strength, 4) })),

  setHardwareData: (data) => {
    const tiltK = Math.min(Math.hypot(data.pitch, data.roll) / 30, 1);
    set({
      pitch: data.pitch,
      roll: data.roll,
      yawHeading: data.yaw,
      tiltK,
      ax: data.ax,
      ay: data.ay,
      az: data.az,
      roadAnomaly: data.anomaly,
      source: "hardware",
      active: true,
    });
  },

  tick: (dt) => {
    const s = get();

    if (s.source === "hardware") {
      const gx = dt > 0 ? (s.roll - s.lastRoll) / dt : 0;
      const gy = dt > 0 ? (s.pitch - s.lastPitch) / dt : 0;
      const gz = dt > 0 ? angleDelta(s.yawHeading, s.lastYaw) / dt : 0;

      const impact =
        s.impact > 0.001 ? s.impact * Math.exp(-SENSOR.impactDecay * dt) : 0;
      const roadAnomaly = s.roadAnomaly || impact > SENSOR.anomalyThresholdG;

      set({
        gx,
        gy,
        gz,
        impact,
        roadAnomaly,
        lastRoll: s.roll,
        lastPitch: s.pitch,
        lastYaw: s.yawHeading,
        t: s.t + dt,
      });
      return;
    }

    if (
      !s.active &&
      s.impact < 0.001 &&
      Math.abs(s.roll) < 0.02 &&
      Math.abs(s.pitch) < 0.02 &&
      Math.abs(s.targetRoll) < 0.01 &&
      Math.abs(s.targetPitch) < 0.01
    ) {
      return;
    }

    const k = 1 - Math.exp(-SENSOR.smooth * dt);
    const roll = s.roll + (s.targetRoll - s.roll) * k;
    const pitch = s.pitch + (s.targetPitch - s.pitch) * k;
    const yawHeading = s.yawHeading + angleDelta(s.targetYaw, s.yawHeading) * k;
    const tiltK = s.tiltK + (s.targetK - s.tiltK) * k;
    const t = s.t + dt;

    const gx = (roll - s.lastRoll) / dt;
    const gy = (pitch - s.lastPitch) / dt;
    const gz = angleDelta(yawHeading, s.lastYaw) / dt;

    const pr = (pitch * Math.PI) / 180;
    const rr = (roll * Math.PI) / 180;
    const ax = Math.sin(pr);
    const ay = Math.sin(rr);
    const vib = s.active
      ? 0.03 * Math.sin(t * 37) + 0.02 * Math.sin(t * 71)
      : 0;
    const az = Math.cos(pr) * Math.cos(rr) + vib + s.impact;

    const impact =
      s.impact > 0.001 ? s.impact * Math.exp(-SENSOR.impactDecay * dt) : 0;
    const roadAnomaly = impact > SENSOR.anomalyThresholdG;

    set({
      roll,
      pitch,
      yawHeading,
      tiltK,
      ax,
      ay,
      az,
      gx,
      gy,
      gz,
      impact,
      roadAnomaly,
      lastRoll: roll,
      lastPitch: pitch,
      lastYaw: yawHeading,
      t,
    });
  },
}));