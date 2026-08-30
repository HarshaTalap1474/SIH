"use client";

import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";
import { useAdasStore } from "@/lib/mlClient";

export function HUD() {
  const speedKmh = useSim((s) => s.speedKmh);
  const boost = useSim((s) => s.boost);
  const gear = useSim((s) => s.gear);
  const camMode = useSim((s) => s.camMode);
  const headlights = useSim((s) => s.headlights);
  const fogMode = useSim((s) => s.fogMode);

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
    <div className="pointer-events-none fixed left-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] w-80 max-w-[calc(100vw-2rem)] flex-col gap-2.5 overflow-y-auto font-sans text-white select-none">
      {/* Title Header Card */}
      <div className="rounded-xl border border-amber-500/20 bg-neutral-950/85 px-4 py-3 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h1 className="text-sm font-bold tracking-wide text-amber-400">
            HEMM Dumper Simulator
          </h1>
        </div>
        <p className="mt-0.5 text-[11px] text-neutral-300">
          SIH Problem 26007 · Heavy Earth Moving Machinery
        </p>
      </div>

      {/* Controls Card */}
      <div className="rounded-xl border border-white/10 bg-neutral-950/85 px-4 py-3 text-[11px] leading-5 text-neutral-200 shadow-2xl backdrop-blur-md">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          Controls
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
          <span className="font-mono font-semibold text-amber-400">W / S</span>
          <span>Accelerate / Reverse</span>
          <span className="font-mono font-semibold text-amber-400">A / D</span>
          <span>Steer left / right</span>
          <span className="font-mono font-semibold text-amber-400">W+S</span>
          <span className="text-orange-400 font-semibold">Boost</span>
          <span className="font-mono font-semibold text-amber-400">C</span>
          <span>Camera view ({camMode})</span>
          <span className="font-mono font-semibold text-amber-400">H</span>
          <span>Headlights ({headlights ? "ON" : "OFF"})</span>
          <span className="font-mono font-semibold text-amber-400">F</span>
          <span>Fog density ({fogMode})</span>
          <span className="font-mono font-semibold text-amber-400">R</span>
          <span>Reset truck</span>
        </div>
      </div>

      {/* MPU6050 Simulation Telemetry Card (Directly Visible) */}
      <div className="rounded-xl border border-white/10 bg-neutral-950/85 px-4 py-3 font-mono text-[10px] leading-4 text-neutral-300 shadow-2xl backdrop-blur-md">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            MPU6050 {useSensor.getState().source === "virtual-pad" ? "(sim)" : ""}
          </span>
          {roadAnomaly && (
            <span className="animate-pulse rounded bg-orange-500/30 border border-orange-400/50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300">
              ⚠ Road Anomaly
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-neutral-300">
          <span>accel_g x <strong className="text-white">{f1(ax)}</strong></span>
          <span>gyro°/s x <strong className="text-white">{f0(gx)}</strong></span>
          <span>accel_g y <strong className="text-white">{f1(ay)}</strong></span>
          <span>gyro°/s y <strong className="text-white">{f0(gy)}</strong></span>
          <span>accel_g z <strong className="text-white">{f1(az)}</strong></span>
          <span>gyro°/s z <strong className="text-white">{f0(gz)}</strong></span>
        </div>
        <div className="mt-1.5 border-t border-white/10 pt-1.5 text-neutral-200">
          pitch <strong className="text-amber-400">{f0(pitch)}°</strong> · roll{" "}
          <strong className="text-amber-400">{f0(roll)}°</strong> · yaw{" "}
          <strong className="text-amber-400">{f0(yawHeading)}°</strong>
        </div>
      </div>

      {/* TinyML ADAS Collision Avoidance & Path Guidance Card */}
      <AdasCard />

      {/* Speedometer & Gear Display Card */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="rounded-xl border border-white/10 bg-neutral-950/85 px-4 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-extrabold font-mono tabular-nums text-white">
              {speedKmh}
            </span>
            <span className="pb-1 text-xs font-bold text-amber-400 uppercase">
              km/h
            </span>
            {boost && (
              <span className="mb-1 ml-1 animate-pulse rounded-md bg-orange-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                Boost
              </span>
            )}
          </div>

          {/* Gear Selector */}
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold">
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
                  className={`rounded px-2 py-0.5 font-mono text-[10px] transition-all ${
                    isCurrent
                      ? g === "B"
                        ? "bg-orange-500 text-black font-extrabold shadow"
                        : g === "R"
                        ? "bg-red-500 text-white font-extrabold shadow"
                        : "bg-amber-400 text-black font-extrabold shadow"
                      : "bg-white/5 text-neutral-500"
                  }`}
                >
                  {g === "B" ? "BOOST" : g}
                </span>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400">
            <span>Cam: <strong className="text-amber-400 capitalize">{camMode}</strong></span>
            <span>Fog: <strong className="text-amber-400 capitalize">{fogMode}</strong></span>
          </div>
        </div>

        {/* Quick Buttons Row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => useSim.getState().resetSim()}
            className="cursor-pointer rounded-lg border border-white/10 bg-neutral-900/85 px-3 py-1.5 text-xs text-neutral-200 shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-800"
          >
            ↺ Reset (R)
          </button>
          <button
            onClick={() => useSim.getState().toggleCam()}
            className="cursor-pointer rounded-lg border border-white/10 bg-neutral-900/85 px-3 py-1.5 text-xs text-neutral-200 shadow-md backdrop-blur-sm transition-colors hover:bg-neutral-800"
          >
            📷 Cam (C)
          </button>
          <button
            onClick={() => useSim.getState().toggleHeadlights()}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs shadow-md backdrop-blur-sm transition-colors ${
              headlights
                ? "border-amber-400/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                : "border-white/10 bg-neutral-900/85 text-neutral-300 hover:bg-neutral-800"
            }`}
          >
            💡 Lights (H)
          </button>
        </div>
      </div>
    </div>
  );
}

function AdasCard() {
  const connected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);
  const closestObstacleM = useAdasStore((s) => s.closestObstacleM);
  const ttcSeconds = useAdasStore((s) => s.ttcSeconds);
  const steeringGuidance = useAdasStore((s) => s.steeringGuidance);
  const latencyMs = useAdasStore((s) => s.latencyMs);
  const rays = useAdasStore((s) => s.rays);

  const isCritical = risk === "CRITICAL" || emergencyBrake;
  const isCaution = risk === "CAUTION" && !isCritical;

  let steerText = "▲ PATH CLEAR";
  let steerColor = "text-emerald-400";
  if (steeringGuidance < -0.15) {
    steerText = `◄ STEER LEFT (${Math.round(Math.abs(steeringGuidance) * 100)}%)`;
    steerColor = "text-amber-400";
  } else if (steeringGuidance > 0.15) {
    steerText = `STEER RIGHT ► (${Math.round(steeringGuidance * 100)}%)`;
    steerColor = "text-amber-400";
  }

  return (
    <div
      className={`rounded-xl border px-4 py-3 font-mono text-[10px] leading-4 shadow-2xl backdrop-blur-md transition-all ${
        isCritical
          ? "border-red-500 bg-red-950/80 ring-2 ring-red-500/50 animate-pulse"
          : isCaution
          ? "border-amber-500/60 bg-amber-950/40 ring-1 ring-amber-500/30"
          : "border-white/10 bg-neutral-950/85"
      }`}
    >
      {/* Card Header & Server Status */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            TinyML ADAS · Radar
          </span>
        </div>
        <span
          className={`flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider ${
            connected ? "text-emerald-400" : "text-neutral-400"
          }`}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-neutral-500"
            }`}
          />
          {connected ? "AI Online (8765)" : "Local Mode"}
        </span>
      </div>

      {/* Primary Collision Warning Banner */}
      <div
        className={`mb-2 flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-wider ${
          isCritical
            ? "bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            : isCaution
            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
            : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
        }`}
      >
        <span>
          {isCritical
            ? "🛑 AUTO EMERGENCY BRAKE"
            : isCaution
            ? "⚠ PROXIMITY CAUTION"
            : "✔ CLEAR PATH"}
        </span>
        <span className="text-[9px] font-normal lowercase opacity-80">
          {latencyMs > 0 ? `${(latencyMs * 1000).toFixed(0)}µs` : "<1ms"}
        </span>
      </div>

      {/* Real-Time Obstacle Metrics Grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-neutral-300">
        <div>
          Obstacle Dist:{" "}
          <strong
            className={`text-[11px] ${
              closestObstacleM < 15
                ? "text-red-400 font-extrabold"
                : closestObstacleM < 30
                ? "text-amber-400"
                : "text-white"
            }`}
          >
            {closestObstacleM >= 80 ? ">80m" : `${closestObstacleM.toFixed(1)}m`}
          </strong>
        </div>
        <div>
          TTC (Time-to-Hit):{" "}
          <strong
            className={`text-[11px] ${
              ttcSeconds < 2.0
                ? "text-red-400 font-extrabold"
                : ttcSeconds < 4.0
                ? "text-amber-400"
                : "text-white"
            }`}
          >
            {ttcSeconds > 50 ? "--" : `${ttcSeconds.toFixed(1)}s`}
          </strong>
        </div>
      </div>

      {/* Path Guidance Evasive Steering Assist */}
      <div className="mt-2 border-t border-white/10 pt-1.5 flex items-center justify-between text-neutral-300">
        <span className="text-[9px] uppercase tracking-wider text-neutral-400">
          Path Guidance:
        </span>
        <span className={`font-bold tracking-wide ${steerColor}`}>
          {steerText}
        </span>
      </div>

      {/* 5-Ray Mini Proximity Visualizer */}
      <div className="mt-2 flex items-center justify-between gap-1 pt-1 text-[8px] text-neutral-400">
        {[
          { label: "FL", val: rays.farLeft },
          { label: "L", val: rays.left },
          { label: "C", val: rays.center },
          { label: "R", val: rays.right },
          { label: "FR", val: rays.farRight },
        ].map((r) => {
          const pct = Math.min(100, Math.max(10, (r.val / 50) * 100));
          const col =
            r.val < 12 ? "bg-red-500" : r.val < 25 ? "bg-amber-400" : "bg-emerald-500";
          return (
            <div key={r.label} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full ${col}`} style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[7px] font-mono">{r.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}