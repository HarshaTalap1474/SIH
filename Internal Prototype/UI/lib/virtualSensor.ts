import { create } from "zustand";
import { SENSOR } from "./constants";

export type SensorSource = "virtual-pad" | "hardware";

export interface MpuPayload {
  mpu6050: {
    accel_g: { x: number; y: number; z: number };
    gyro_deg_per_sec: { x: number; y: number; z: number };
    orientation_deg: { pitch: number; roll: number; yaw_heading: number };
    road_anomaly_detected: boolean;
  };
}

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
  setTiltFromPad: (dx: number, dy: number) => void;
  triggerImpact: (strength: number) => void;
  clearTilt: () => void;
  setSource: (source: SensorSource) => void;
  tick: (dt: number) => void;
}

const angleDelta = (a: number, b: number) => {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

export const buildMpuPayload = (s: SensorState): MpuPayload => ({
  mpu6050: {
    accel_g: { x: s.ax, y: s.ay, z: s.az },
    gyro_deg_per_sec: { x: s.gx, y: s.gy, z: s.gz },
    orientation_deg: { pitch: s.pitch, roll: s.roll, yaw_heading: s.yawHeading },
    road_anomaly_detected: s.roadAnomaly,
  },
});

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

  setTiltFromPad: (dx, dy) => {
    const ry = -dy;
    const r = Math.hypot(dx, ry);
    const k = Math.min(r / SENSOR.padRadiusPx, 1);
    const theta = Math.atan2(ry, dx);
    set({
      targetRoll: k * Math.cos(theta) * SENSOR.maxRollDeg,
      targetPitch: k * Math.sin(theta) * SENSOR.maxPitchDeg,
      targetYaw: ((theta * 180) / Math.PI + 360) % 360,
      targetK: k,
      active: true,
    });
  },

  triggerImpact: (strength) =>
    set((s) => ({ impact: Math.min(s.impact + strength, 4) })),

  clearTilt: () =>
    set({ targetRoll: 0, targetPitch: 0, targetYaw: 0, targetK: 0, active: false }),

  setSource: (source) => set({ source }),

  tick: (dt) => {
    const s = get();
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