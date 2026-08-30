import { create } from "zustand";
import { PHYSICS, START_POS } from "./constants";

export type CamMode = "chase" | "top";

interface SimStore {
  x: number;
  z: number;
  yaw: number;
  speed: number;
  steer: number;
  boost: boolean;
  camMode: CamMode;
  speedKmh: number;
  setFrame: (s: {
    x: number;
    z: number;
    yaw: number;
    speed: number;
    steer: number;
    boost: boolean;
  }) => void;
  toggleCam: () => void;
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
  setFrame: ({ x, z, yaw, speed, steer, boost }) =>
    set({
      x,
      z,
      yaw,
      speed,
      steer,
      boost,
      speedKmh: Math.round(Math.abs(speed) * PHYSICS.kphPerUnit),
    }),
  toggleCam: () =>
    set((s) => ({ camMode: s.camMode === "chase" ? "top" : "chase" })),
  resetSim: () =>
    set({
      x: START_POS.x,
      z: START_POS.z,
      yaw: 0,
      speed: 0,
      steer: 0,
      boost: false,
      speedKmh: 0,
    }),
}));