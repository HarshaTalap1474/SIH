"use client";

import { useState } from "react";
import { useSim, CamMode, FogMode } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";

export function HUD() {
  const [showTelemetry, setShowTelemetry] = useState(true);

  const speedKmh = useSim((s) => s.speedKmh);
  const boost = useSim((s) => s.boost);
  const gear = useSim((s) => s.gear);
  const camMode = useSim((s) => s.camMode);
  const headlights = useSim((s) => s.headlights);
  const fogMode = useSim((s) => s.fogMode);
  const x = useSim((s) => s.x);
  const z = useSim((s) => s.z);
  const yaw = useSim((s) => s.yaw);

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

  // Rollover risk classification based on SIH Plan v2.0
  const absRoll = Math.abs(roll);
  const absPitch = Math.abs(pitch);
  const rolloverRisk =
    absRoll > 25 || absPitch > 20
      ? "DANGER"
      : absRoll > 15 || absPitch > 12
      ? "CAUTION"
      : "SAFE";

  const headingDeg = Math.round(((-yaw * 180) / Math.PI + 360) % 360);
  const cardinal =
    headingDeg >= 337.5 || headingDeg < 22.5
      ? "N"
      : headingDeg < 67.5
      ? "NE"
      : headingDeg < 112.5
      ? "E"
      : headingDeg < 157.5
      ? "SE"
      : headingDeg < 202.5
      ? "S"
      : headingDeg < 247.5
      ? "SW"
      : headingDeg < 292.5
      ? "W"
      : "NW";

  const f1 = (v: number) => v.toFixed(2);
  const f0 = (v: number) => Math.round(v).toString();

  // Speed arc calculation (0 to 75 km/h)
  const speedPercentage = Math.min(speedKmh / 65, 1);
  const strokeDash = speedPercentage * 180;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 font-sans text-white select-none">
      {/* TOP BAR: Fleet System Status & Top-Right Tactical Radar */}
      <header className="flex items-start justify-between gap-4">
        {/* Left: Project Header & System Badge */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-neutral-950/80 px-4 py-2.5 shadow-2xl backdrop-blur-md">
            <div className="flex h-3 w-3 items-center justify-center">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xs font-bold tracking-wider uppercase text-amber-400">
                  NMDC Bailadila Iron Ore Mine
                </h1>
                <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-amber-300">
                  HEMM DUMP-101
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                SIH Problem 26007 · Dual-Tier V2V Mesh & Telematics
              </p>
            </div>
          </div>

          {/* Road Anomaly / Pothole Alert Banner */}
          {roadAnomaly && (
            <div className="animate-bounce rounded-lg border border-red-500/50 bg-red-950/90 px-3 py-1.5 shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs font-bold text-red-300">
                <span>⚠</span>
                <span>ROAD ANOMALY / POTHOLE IMPACT DETECTED</span>
              </div>
            </div>
          )}

          {/* Rollover Alert */}
          {rolloverRisk !== "SAFE" && (
            <div
              className={`rounded-lg border px-3 py-1.5 shadow-xl backdrop-blur-md ${
                rolloverRisk === "DANGER"
                  ? "animate-pulse border-red-500 bg-red-950/90 text-red-200"
                  : "border-amber-500 bg-amber-950/90 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                <span>⚠</span>
                <span>
                  {rolloverRisk === "DANGER"
                    ? "CRITICAL ROLLOVER RISK — SLOW DOWN"
                    : "HAUL ROAD LATERAL INCLINE WARNING"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Right: In-Cabin 2D Tactical Radar (SIH Spec 6.4) */}
        <div className="flex flex-col items-end gap-2">
          <div className="relative flex flex-col items-center rounded-2xl border border-white/10 bg-neutral-950/85 p-3 shadow-2xl backdrop-blur-md">
            <div className="mb-2 flex w-full items-center justify-between gap-4 text-[10px] font-semibold tracking-wider uppercase text-neutral-400">
              <span className="text-amber-400">2D Spatial Radar</span>
              <span className="font-mono text-emerald-400">V2V Active</span>
            </div>

            {/* Radar Circular Display */}
            <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-950/20">
              {/* Range rings (50m, 150m, 300m scaled) */}
              <div className="absolute h-28 w-28 rounded-full border border-emerald-500/20" />
              <div className="absolute h-18 w-18 rounded-full border border-emerald-500/25" />
              <div className="absolute h-8 w-8 rounded-full border border-emerald-500/30" />

              {/* Axis Crosshairs */}
              <div className="absolute h-full w-px bg-emerald-500/15" />
              <div className="absolute h-px w-full bg-emerald-500/15" />

              {/* Radar Sweep Animation */}
              <div className="absolute inset-0 animate-spin rounded-full bg-gradient-to-tr from-emerald-500/20 via-transparent to-transparent opacity-60 [animation-duration:4s]" />

              {/* Self Vehicle Center Blip */}
              <div
                className="relative z-10 flex h-3 w-3 items-center justify-center rounded-full bg-amber-400 shadow-md shadow-amber-400/50"
                style={{ transform: `rotate(${-headingDeg}deg)` }}
              >
                <div className="h-0 w-0 border-x-2 border-b-4 border-x-transparent border-b-neutral-950" />
              </div>

              {/* Range labels */}
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[8px] text-emerald-500/60">
                120m
              </span>
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[8px] text-emerald-500/60">
                50m
              </span>
            </div>

            {/* Coordinates & Heading Bar */}
            <div className="mt-2 flex w-full justify-between font-mono text-[10px] text-neutral-400">
              <span>HDG: <strong className="text-amber-400">{headingDeg}° {cardinal}</strong></span>
              <span>POS: {Math.round(x)}, {Math.round(z)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* BOTTOM SECTION: Digital Instrument Cluster, Sensor Drawer, and Action Controls */}
      <footer className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          {/* Left: Speedometer Gauge & Drivetrain Cluster */}
          <div className="pointer-events-auto flex items-end gap-3">
            {/* Speed Gauge Card */}
            <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-neutral-950/85 p-4 shadow-2xl backdrop-blur-md">
              {/* Header Info */}
              <div className="flex items-center justify-between gap-4">
                <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                  Ground Speed
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  MAX 65 KM/H
                </span>
              </div>

              {/* Large Speed Display */}
              <div className="my-1 flex items-baseline gap-2">
                <span className="font-mono text-5xl font-extrabold tracking-tight text-white drop-shadow">
                  {speedKmh}
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  KM/H
                </span>
              </div>

              {/* Speed Arc / Progress Bar */}
              <div className="h-1.5 w-44 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full transition-all duration-75 ${
                    boost
                      ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-lg shadow-orange-500/50"
                      : "bg-gradient-to-r from-amber-400 to-emerald-400"
                  }`}
                  style={{ width: `${Math.min(speedPercentage * 100, 100)}%` }}
                />
              </div>

              {/* Transmission Gear Selector Badges */}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold">
                {(["P", "R", "N", "D", "B"] as const).map((g) => {
                  const isCurrent =
                    (g === "B" && boost) ||
                    (g === "R" && gear === "R") ||
                    (g === "D" && gear === "D" && !boost) ||
                    (g === "N" && gear === "N" && speedKmh === 0) ||
                    (g === "P" && speedKmh === 0 && gear === "N");

                  return (
                    <span
                      key={g}
                      className={`rounded px-2 py-0.5 font-mono text-[11px] transition-all ${
                        isCurrent
                          ? g === "B"
                            ? "bg-orange-500 text-black font-extrabold shadow-md shadow-orange-500/40"
                            : g === "R"
                            ? "bg-red-500 text-white font-extrabold shadow-md shadow-red-500/40"
                            : "bg-amber-400 text-black font-extrabold shadow-md shadow-amber-400/40"
                          : "bg-white/5 text-neutral-500"
                      }`}
                    >
                      {g === "B" ? "BOOST" : g}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Inclinometer / Attitude Horizon Card */}
            <div className="hidden rounded-2xl border border-white/10 bg-neutral-950/85 p-4 shadow-2xl backdrop-blur-md sm:flex sm:flex-col sm:justify-between">
              <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                <span>Inclinometer</span>
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                    rolloverRisk === "DANGER"
                      ? "bg-red-500/20 text-red-400"
                      : rolloverRisk === "CAUTION"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-emerald-500/20 text-emerald-400"
                  }`}
                >
                  {rolloverRisk}
                </span>
              </div>

              {/* Pitch & Roll Indicators */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400">PITCH</span>
                  <span className="text-base font-bold text-white">
                    {f0(pitch)}°
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-neutral-400">ROLL</span>
                  <span className="text-base font-bold text-white">
                    {f0(roll)}°
                  </span>
                </div>
              </div>

              {/* Incline Bar Visualizer */}
              <div className="mt-2 flex h-2 w-32 items-center justify-center rounded-full bg-neutral-800">
                <div
                  className="h-3 w-1.5 rounded-full bg-amber-400 transition-all duration-75"
                  style={{ transform: `translateX(${(roll / 30) * 50}px)` }}
                />
              </div>
            </div>
          </div>

          {/* Center / Right: Interactive Controls & Quick Mode Toggles */}
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            {/* Camera View Switcher */}
            <button
              onClick={() => useSim.getState().toggleCam()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-neutral-800"
              title="Toggle Camera (Key: C)"
            >
              <span className="text-neutral-400">📷</span>
              <span>
                View:{" "}
                <strong className="text-amber-400 capitalize">{camMode}</strong>
              </span>
              <kbd className="rounded bg-white/10 px-1 font-mono text-[9px] text-neutral-300">
                C
              </kbd>
            </button>

            {/* Headlights Toggle */}
            <button
              onClick={() => useSim.getState().toggleHeadlights()}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all ${
                headlights
                  ? "border-amber-400/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  : "border-white/10 bg-neutral-900/90 text-neutral-400 hover:bg-neutral-800"
              }`}
              title="Toggle Headlights (Key: H)"
            >
              <span>💡</span>
              <span>Lights: {headlights ? "ON" : "OFF"}</span>
              <kbd className="rounded bg-white/10 px-1 font-mono text-[9px] text-neutral-300">
                H
              </kbd>
            </button>

            {/* Fog Simulation Level */}
            <button
              onClick={() => useSim.getState().toggleFog()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:border-amber-400/50 hover:bg-neutral-800"
              title="Toggle Mine Fog (Key: F)"
            >
              <span>🌫</span>
              <span>
                Fog: <strong className="text-amber-400 capitalize">{fogMode}</strong>
              </span>
              <kbd className="rounded bg-white/10 px-1 font-mono text-[9px] text-neutral-300">
                F
              </kbd>
            </button>

            {/* Reset Simulation */}
            <button
              onClick={() => useSim.getState().resetSim()}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/90 px-3.5 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:border-red-400/50 hover:bg-neutral-800 hover:text-red-300"
              title="Reset Dumper (Key: R)"
            >
              <span>↺</span>
              <span>Reset</span>
              <kbd className="rounded bg-white/10 px-1 font-mono text-[9px] text-neutral-300">
                R
              </kbd>
            </button>

            {/* Toggle Raw Telemetry */}
            <button
              onClick={() => setShowTelemetry(!showTelemetry)}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-neutral-900/90 px-3 py-2.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all hover:bg-neutral-800 text-neutral-300"
            >
              <span>📊</span>
              <span>{showTelemetry ? "Hide Data" : "Telemetry"}</span>
            </button>
          </div>
        </div>

        {/* Live MPU6050 & Sensor Drawer */}
        {showTelemetry && (
          <div className="pointer-events-auto rounded-xl border border-white/10 bg-neutral-950/80 p-3 shadow-xl backdrop-blur-md">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="text-amber-400">MPU-6050 6-Axis IMU Telemetry</span>
                <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[9px] font-mono text-neutral-300">
                  I2C 0x68 @ 100Hz
                </span>
              </div>
              <span className="text-neutral-500">
                WASD / Arrow Keys to Drive · W+S Boost
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-neutral-300 sm:grid-cols-6">
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">ACCEL X</span>
                <strong className="text-white">{f1(ax)} g</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">ACCEL Y</span>
                <strong className="text-white">{f1(ay)} g</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">ACCEL Z</span>
                <strong className="text-white">{f1(az)} g</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">GYRO X</span>
                <strong className="text-white">{f0(gx)} °/s</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">GYRO Y</span>
                <strong className="text-white">{f0(gy)} °/s</strong>
              </div>
              <div className="rounded-lg bg-white/5 p-1.5">
                <span className="text-neutral-500 block text-[8px]">GYRO Z</span>
                <strong className="text-white">{f0(gz)} °/s</strong>
              </div>
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}