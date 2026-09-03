"use client";

import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore, hwClient } from "@/lib/hardwareClient";

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

  // ADAS Store
  const connected = useAdasStore((s) => s.connected);
  const hwConnected = useHardwareStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);
  const closestObstacleM = useAdasStore((s) => s.closestObstacleM);
  const ttcSeconds = useAdasStore((s) => s.ttcSeconds);
  const steeringGuidance = useAdasStore((s) => s.steeringGuidance);
  const latencyMs = useAdasStore((s) => s.latencyMs);
  const rays = useAdasStore((s) => s.rays);

  const isCritical = risk === "CRITICAL" || emergencyBrake;
  const isCaution = risk === "CAUTION" && !isCritical;

  let steerText = "▲ LANE CENTERED";
  let steerColor = "text-emerald-400";
  if (steeringGuidance < -0.15) {
    steerText = `◄ STEER LEFT (${Math.round(Math.abs(steeringGuidance) * 100)}%)`;
    steerColor = "text-amber-400";
  } else if (steeringGuidance > 0.15) {
    steerText = `STEER RIGHT ► (${Math.round(steeringGuidance * 100)}%)`;
    steerColor = "text-amber-400";
  }

  const f1 = (v: number) => v.toFixed(2);
  const f0 = (v: number) => Math.round(v).toString();

  // Normalized Speed Percentage for UI Bar (Max ~ 50 km/h)
  const speedPct = Math.min(100, Math.max(0, (speedKmh / 50) * 100));

  return (
    <div className="pointer-events-none fixed left-4 top-4 z-20 flex max-h-[calc(100vh-2rem)] w-84 max-w-[calc(100vw-2rem)] flex-col gap-2.5 overflow-y-auto font-sans text-white select-none scrollbar-none">
      {/* ========================================================================= */}
      {/* 1. HEADER & SYSTEM TELEMETRY BADGE                                       */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 p-3.5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500 shadow-[0_0_10px_#f59e0b]" />
            </span>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase text-amber-400">
                HEMM DUMPER 797F
              </h1>
              <p className="text-[10px] text-zinc-400 font-medium tracking-tight">
                Autonomous Safety & Digital Twin
              </p>
            </div>
          </div>

          {/* Connection Status Pills */}
          <div className="flex items-center gap-1.5">
            {/* HW Connection Status Pill */}
            <button
              type="button"
              onClick={() => {
                const current = useHardwareStore.getState().esp32Ip;
                const next = window.prompt("ESP32 WebSocket URL:", current);
                if (next && next.trim()) {
                  useHardwareStore.getState().setEsp32Ip(next.trim());
                  hwClient.disconnect();
                  hwClient.connect();
                }
              }}
              title="Click to view/change ESP32 WebSocket URL"
              className={`pointer-events-auto cursor-pointer flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider uppercase border transition-all ${
                hwConnected
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] hover:bg-emerald-500/25"
                  : "bg-zinc-800/60 border-white/10 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hwConnected ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-500"
                }`}
              />
              {hwConnected ? "HW CONNECTED" : "HW OFFLINE"}
            </button>

            {/* AI Connection Status Pill */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-mono font-bold tracking-wider uppercase border transition-all ${
                connected
                  ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                  : "bg-zinc-800/60 border-white/10 text-zinc-400"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-zinc-500"
                }`}
              />
              {connected ? "AI LIVE" : "LOCAL ADAS"}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPEEDOMETER & TRANSMISSION GEAR CARD                                  */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/85 p-3.5 shadow-2xl backdrop-blur-2xl">
        {/* Speed Number & Units */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-black font-mono tracking-tight tabular-nums text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {speedKmh}
            </span>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-amber-400">
              KM/H
            </span>
          </div>

          {/* Speed Limit & Status */}
          <div className="text-right">
            <span className="inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-[9px] font-bold text-zinc-300">
              MAX 50
            </span>
            {boost && (
              <span className="ml-1.5 animate-pulse rounded-md bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-0.5 font-mono text-[9px] font-black text-black uppercase shadow-[0_0_10px_#f97316]">
                BOOST
              </span>
            )}
          </div>
        </div>

        {/* Speed Linear Bar Gauge */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800/80 p-0.5 border border-white/5">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              boost
                ? "bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 shadow-[0_0_10px_#ea580c]"
                : speedKmh > 35
                ? "bg-gradient-to-r from-amber-400 to-orange-400"
                : "bg-gradient-to-r from-emerald-400 to-amber-400"
            }`}
            style={{ width: `${speedPct}%` }}
          />
        </div>

        {/* Gearbox Transmission Pill Row */}
        <div className="mt-3 flex items-center justify-between gap-1 border-t border-white/10 pt-2.5">
          {(["P", "R", "N", "D", "B"] as const).map((g) => {
            const isCurrent =
              (g === "B" && boost) ||
              (g === "R" && gear === "R" && !boost) ||
              (g === "D" && gear === "D" && !boost) ||
              (g === "N" && gear === "N" && !boost) ||
              (g === "P" && gear === "P" && !boost);

            return (
              <div
                key={g}
                className={`flex-1 text-center py-1 rounded-lg font-mono text-[10px] font-extrabold tracking-wider transition-all ${
                  isCurrent
                    ? g === "B"
                      ? "bg-gradient-to-b from-orange-500 to-amber-600 text-black shadow-[0_0_12px_#ea580c]"
                      : g === "R"
                      ? "bg-gradient-to-b from-red-600 to-rose-700 text-white shadow-[0_0_12px_#dc2626]"
                      : "bg-gradient-to-b from-amber-400 to-amber-500 text-black shadow-[0_0_12px_#f59e0b]"
                    : "bg-white/5 text-zinc-500 border border-white/5"
                }`}
              >
                {g === "B" ? "BST" : g}
              </div>
            );
          })}
        </div>

        {/* View & Lighting Metadata Tags */}
        <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-zinc-400 border-t border-white/5 pt-2">
          <span>
            CAM: <strong className="text-amber-400 capitalize">{camMode}</strong>
          </span>
          <span>
            LIGHTS: <strong className={headlights ? "text-amber-400" : "text-zinc-500"}>{headlights ? "ON" : "OFF"}</strong>
          </span>
          <span>
            FOG: <strong className="text-amber-400 capitalize">{fogMode}</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TINYML ADAS COLLISION AVOIDANCE & PATH GUIDANCE CARD                  */}
      {/* ========================================================================= */}
      <div
        className={`relative overflow-hidden rounded-2xl border p-3.5 font-mono shadow-2xl backdrop-blur-2xl transition-all duration-300 ${
          isCritical
            ? "border-red-500/80 bg-gradient-to-b from-red-950/90 to-zinc-950/90 ring-2 ring-red-500/40 shadow-[0_0_30px_rgba(239,68,68,0.3)] animate-pulse"
            : isCaution
            ? "border-amber-500/60 bg-gradient-to-b from-amber-950/60 to-zinc-950/90 ring-1 ring-amber-500/30"
            : "border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/85"
        }`}
      >
        {/* ADAS Header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
              TinyML Radar Perception
            </span>
          </div>
          <span className="text-[9px] font-mono text-zinc-400">
            Latency: <strong className="text-zinc-200">{latencyMs > 0 ? `${(latencyMs * 1000).toFixed(0)}µs` : "<1ms"}</strong>
          </span>
        </div>

        {/* Dynamic Collision Warning Alert Banner */}
        <div
          className={`flex items-center justify-between rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all ${
            isCritical
              ? "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]"
              : isCaution
              ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <span className="text-xs">
              {isCritical ? "🛑" : isCaution ? "⚠" : "✔"}
            </span>
            {isCritical
              ? "EMERGENCY BRAKE ENGAGED"
              : isCaution
              ? "OBSTACLE PROXIMITY ALERT"
              : "HAUL ROAD CLEAR"}
          </span>
          <span className="text-[9px] font-bold opacity-85">
            {isCritical ? "AEB ACTIVE" : isCaution ? "CAUTION" : "SAFE"}
          </span>
        </div>

        {/* Real-Time Distance & TTC Metrics */}
        <div className="mt-2.5 grid grid-cols-2 gap-2 text-[10px]">
          <div className="rounded-xl border border-white/5 bg-white/5 p-2">
            <div className="text-[9px] uppercase tracking-wider text-zinc-400">
              Obstacle Dist
            </div>
            <div
              className={`mt-0.5 text-base font-black tracking-tight ${
                closestObstacleM < 15
                  ? "text-red-400 drop-shadow-[0_0_8px_#ef4444]"
                  : closestObstacleM < 30
                  ? "text-amber-400"
                  : "text-white"
              }`}
            >
              {closestObstacleM >= 80 ? ">80 m" : `${closestObstacleM.toFixed(1)} m`}
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/5 p-2">
            <div className="text-[9px] uppercase tracking-wider text-zinc-400">
              Time to Collision
            </div>
            <div
              className={`mt-0.5 text-base font-black tracking-tight ${
                ttcSeconds < 2.0
                  ? "text-red-400 drop-shadow-[0_0_8px_#ef4444]"
                  : ttcSeconds < 4.0
                  ? "text-amber-400"
                  : "text-white"
              }`}
            >
              {ttcSeconds > 50 ? "SAFE (∞)" : `${ttcSeconds.toFixed(1)} s`}
            </div>
          </div>
        </div>

        {/* Path Guidance Evasive Steering Assist */}
        <div className="mt-2.5 flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-2.5 py-1.5 text-[10px]">
          <span className="text-[9px] uppercase tracking-wider text-zinc-400">
            Path Guidance:
          </span>
          <span className={`font-bold tracking-wide ${steerColor}`}>
            {steerText}
          </span>
        </div>

        {/* 5-Channel Forward Radar Beam Array */}
        <div className="mt-2.5 border-t border-white/10 pt-2">
          <div className="mb-1 flex justify-between text-[8px] uppercase tracking-widest text-zinc-400 font-bold">
            <span>5-Ray Proximity Array</span>
            <span>Angle Sweep (-45° to +45°)</span>
          </div>
          <div className="flex items-center justify-between gap-1.5 text-[8px] text-zinc-400">
            {[
              { label: "FL -45°", val: rays.farLeft },
              { label: "L -20°", val: rays.left },
              { label: "C 0°", val: rays.center },
              { label: "R +20°", val: rays.right },
              { label: "FR +45°", val: rays.farRight },
            ].map((r) => {
              const pct = Math.min(100, Math.max(12, (r.val / 50) * 100));
              const col =
                r.val < 12
                  ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                  : r.val < 25
                  ? "bg-amber-400"
                  : "bg-emerald-400";
              return (
                <div key={r.label} className="flex-1 flex flex-col items-center gap-1">
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <div className={`h-full rounded-full transition-all ${col}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[7px] font-mono tracking-tighter text-zinc-400">{r.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MPU6050 6-DOF INCLINOMETER & TELEMETRY CARD                             */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 to-zinc-950/85 p-3.5 font-mono text-[10px] leading-4 text-zinc-300 shadow-2xl backdrop-blur-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            MPU6050 6-DOF Inclinometer
          </span>
          {roadAnomaly && (
            <span className="animate-pulse rounded-md bg-orange-500/20 border border-orange-400/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.3)]">
              ⚠ Road Anomaly
            </span>
          )}
        </div>

        {/* Dual Attitude Inclinometer Level Displays */}
        <div className="grid grid-cols-3 gap-1.5 mb-2.5 text-center">
          <div className="rounded-xl border border-white/5 bg-white/5 p-1.5">
            <span className="text-[8px] uppercase tracking-wider text-zinc-400">Pitch</span>
            <div className="text-xs font-black text-amber-400">{f0(pitch)}°</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-1.5">
            <span className="text-[8px] uppercase tracking-wider text-zinc-400">Roll</span>
            <div className="text-xs font-black text-amber-400">{f0(roll)}°</div>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/5 p-1.5">
            <span className="text-[8px] uppercase tracking-wider text-zinc-400">Heading</span>
            <div className="text-xs font-black text-amber-400">{f0(yawHeading)}°</div>
          </div>
        </div>

        {/* Acceleration G-Vectors */}
        <div className="grid grid-cols-3 gap-1 text-[9px] text-zinc-400 border-t border-white/10 pt-2">
          <span>Ax: <strong className="text-white">{f1(ax)}g</strong></span>
          <span>Ay: <strong className="text-white">{f1(ay)}g</strong></span>
          <span>Az: <strong className="text-white">{f1(az)}g</strong></span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. CONTROLS & INTERACTIVE TOOLBAR ROW                                     */}
      {/* ========================================================================= */}
      <div className="pointer-events-auto flex items-center gap-1.5">
        <button
          onClick={() => useSim.getState().resetSim()}
          className="flex-1 cursor-pointer rounded-xl border border-white/10 bg-zinc-900/90 py-2 text-center text-xs font-bold text-zinc-200 shadow-lg backdrop-blur-md transition-all hover:bg-zinc-800 hover:border-white/20 active:scale-95"
        >
          ↺ Reset (R)
        </button>
        <button
          onClick={() => useSim.getState().toggleCam()}
          className="flex-1 cursor-pointer rounded-xl border border-white/10 bg-zinc-900/90 py-2 text-center text-xs font-bold text-zinc-200 shadow-lg backdrop-blur-md transition-all hover:bg-zinc-800 hover:border-white/20 active:scale-95"
        >
          📷 Cam (C)
        </button>
        <button
          onClick={() => useSim.getState().toggleHeadlights()}
          className={`flex-1 cursor-pointer rounded-xl border py-2 text-center text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95 ${
            headlights
              ? "border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-500/30"
              : "border-white/10 bg-zinc-900/90 text-zinc-300 hover:bg-zinc-800"
          }`}
        >
          💡 Lights (H)
        </button>
      </div>
    </div>
  );
}