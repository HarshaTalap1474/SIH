import { create } from "zustand";
import { PHYSICS, START_POS } from "./constants";

export type CamMode = "chase" | "top" | "cockpit";
export type FogMode = "heavy" | "medium" | "clear";
export type GearMode = "P" | "R" | "N" | "D" | "B";

interface SimStore {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steer: number;
  boost: boolean;
  camMode: CamMode;
  speedKmh: number;
  gear: GearMode;
  headlights: boolean;
  fogMode: FogMode;
  setFrame: (s: {
    x: number;
    z: number;
    yaw: number;
    speed: number;
    steer: number;
    boost: boolean;
    gear?: GearMode;
  }) => void;
  toggleCam: () => void;
  setCamMode: (mode: CamMode) => void;
  toggleHeadlights: () => void;
  toggleFog: () => void;
  resetSim: () => void;
}

export const useSim = create<SimStore>()((set) => ({
  x: START_POS.x,
  z: START_POS.z,
  yaw: 0,
  speed: 0,
  steer: 0,
  boost: false,
  camMode: "chase",
  speedKmh: 0,
  gear: "P",
  headlights: true,
  fogMode: "heavy",

  setFrame: ({ x, z, yaw, speed, steer, boost, gear: passedGear }) => {
    const speedKmh = Math.round(Math.abs(speed) * PHYSICS.kphPerUnit);
    const gear: GearMode = passedGear || (boost
      ? "B"
      : speed > 0.15
      ? "D"
      : speed < -0.15
      ? "R"
      : "P");

    set({
      x,
      z,
      yaw,
      speed,
      steer,
      boost,
      speedKmh,
      gear,
    });
  },

  toggleCam: () =>
    set((s) => {
      const modes: CamMode[] = ["chase", "cockpit", "top"];
      const nextIdx = (modes.indexOf(s.camMode) + 1) % modes.length;
      return { camMode: modes[nextIdx] };
    }),

  setCamMode: (camMode) => set({ camMode }),

  toggleHeadlights: () => set((s) => ({ headlights: !s.headlights })),

  toggleFog: () =>
    set((s) => {
      const modes: FogMode[] = ["heavy", "medium", "clear"];
      const nextIdx = (modes.indexOf(s.fogMode) + 1) % modes.length;
      return { fogMode: modes[nextIdx] };
    }),

  resetSim: () =>
    set({
      x: START_POS.x,
      z: START_POS.z,
      yaw: 0,
      speed: 0,
      steer: 0,
      boost: false,
      speedKmh: 0,
      gear: "N",
    }),
}));