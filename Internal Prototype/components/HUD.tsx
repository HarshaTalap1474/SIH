"use client";

import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";

export function HUD() {
  const speedKmh = useSim((s) => s.speedKmh);
  const boost = useSim((s) => s.boost);
  const camMode = useSim((s) => s.camMode);

  const ax = useSensor((s) => s.ax);
  const ay = useSensor((s) => s.ay);
  const az = useSensor((s) => s.az);
  const gx = useSensor((s) => s.gx);
  const gy = useSensor((s) => s.gy);
  const gz = useSensor((s) => s.gz);
  const pitch = useSensor((s) => s.pitch);
  const roll = useSensor((s) => s.roll);
  const yawHeading = useSensor((s) => s.yawHeading);
  const roadAnomaly = useSensor((s) => s.roadAnomaly);

  const f1 = (v: number) => v.toFixed(2);
  const f0 = (v: number) => Math.round(v).toString();

  return (
    <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-h-full flex-col gap-3 overflow-y-auto select-none">
      <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
        <h1 className="text-sm font-semibold tracking-wide text-amber-400">
          HEMM Dumper Simulator
        </h1>
        <p className="mt-0.5 text-[11px] text-neutral-300">
          SIH Prototype · Heavy Earth Moving Machinery
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[11px] leading-5 text-neutral-200 backdrop-blur-sm">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
          Controls
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <span className="font-mono font-semibold text-amber-400">W / S</span>
          <span>Accelerate / Reverse</span>
          <span className="font-mono font-semibold text-amber-400">A / D</span>
          <span>Steer left / right</span>
          <span className="font-mono font-semibold text-amber-400">W+S</span>
          <span className="text-orange-300">Boost</span>
          <span className="font-mono font-semibold text-amber-400">C</span>
          <span>Camera view</span>
          <span className="font-mono font-semibold text-amber-400">R</span>
          <span>Reset truck</span>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 font-mono text-[10px] leading-4 text-neutral-300 backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
            MPU6050 {useSensor.getState().source === "virtual-pad" ? "(sim)" : ""}
          </span>
          {roadAnomaly && (
            <span className="animate-pulse rounded bg-orange-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300">
              ⚠ Anomaly
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4">
          <span>accel_g x {f1(ax)}</span>
          <span>gyro°/s x {f0(gx)}</span>
          <span>accel_g y {f1(ay)}</span>
          <span>gyro°/s y {f0(gy)}</span>
          <span className="text-neutral-100">accel_g z {f1(az)}</span>
          <span>gyro°/s z {f0(gz)}</span>
        </div>
        <div className="mt-1 border-t border-white/10 pt-1 text-neutral-200">
          pitch {f0(pitch)}° · roll {f0(roll)}° · yaw {f0(yawHeading)}°
        </div>
      </div>

      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="rounded-xl border border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums text-white">
              {speedKmh}
            </span>
            <span className="pb-1 text-xs text-neutral-400">km/h</span>
            {boost && (
              <span className="mb-1 ml-1 animate-pulse rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                Boost
              </span>
            )}
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-wider text-neutral-400">
            Camera: {camMode === "chase" ? "Chase" : "Top-down"}
          </div>
        </div>

        <button
          onClick={() => useSim.getState().resetSim()}
          className="w-fit cursor-pointer rounded-lg border border-white/10 bg-black/50 px-3 py-1.5 text-xs text-neutral-200 backdrop-blur-sm transition-colors hover:bg-black/70"
        >
          ↺ Reset (R)
        </button>
      </div>
    </div>
  );
}