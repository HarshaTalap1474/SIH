"use client";

import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore } from "@/lib/hardwareClient";

const GEAR_LABELS: Record<string, string> = {
  P: "P",
  R: "R",
  N: "N",
  D: "D",
  B: "BST",
};

export function DashboardPanel() {
  // Sim Store
  const speedKmh = useSim((s) => s.speedKmh);
  const boost = useSim((s) => s.boost);
  const gear = useSim((s) => s.gear);

  // Sensor Store
  const pitch = useSensor((s) => s.pitch);
  const roll = useSensor((s) => s.roll);
  const roadAnomaly = useSensor((s) => s.roadAnomaly);

  // Hardware Store
  const estopActive = useHardwareStore((s) => s.estopActive);

  // ADAS Store
  const connected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);
  const closestObstacleM = useAdasStore((s) => s.closestObstacleM);
  const ttcSeconds = useAdasStore((s) => s.ttcSeconds);
  const steeringGuidance = useAdasStore((s) => s.steeringGuidance);

  const isCritical = connected && (risk === "CRITICAL" || emergencyBrake);
  const isCaution = connected && risk === "CAUTION" && !isCritical;
  const isRollover = Math.abs(roll) > 15 || Math.abs(pitch) > 15;

  // Clearance metrics
  const isClear = closestObstacleM >= 79;
  const distColor =
    closestObstacleM < 12
      ? "text-red-400 drop-shadow-[0_0_12px_rgba(239,68,68,0.7)]"
      : closestObstacleM < 25
      ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]"
      : "text-emerald-400";

  // Steering recommendation
  let steerBanner = {
    text: "▲ PATH CLEAR (CENTER)",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  };
  if (steeringGuidance < -0.1) {
    const pct = Math.round(Math.abs(steeringGuidance) * 100);
    steerBanner = {
      text: `◄ STEER LEFT (${pct}%)`,
      cls: "border-amber-500/40 bg-amber-500/20 text-amber-300 animate-pulse",
    };
  } else if (steeringGuidance > 0.1) {
    const pct = Math.round(steeringGuidance * 100);
    steerBanner = {
      text: `STEER RIGHT ► (${pct}%)`,
      cls: "border-amber-500/40 bg-amber-500/20 text-amber-300 animate-pulse",
    };
  }

  // Speed bar percentage (0 - 50 km/h)
  const speedPct = Math.min(100, Math.max(0, (speedKmh / 50) * 100));

  return (
    <aside className="relative z-20 flex h-full w-88 flex-shrink-0 flex-col justify-between gap-3 overflow-hidden border-r border-white/10 bg-zinc-950/95 p-3.5 select-none backdrop-blur-2xl">
      {/* ========================================================================= */}
      {/* CARD 1: DRIVER CLUSTER                                                    */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 via-zinc-900/60 to-zinc-950/90 p-4 shadow-xl">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Driver Cluster
            </span>
          </div>
          <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400">
            CAT 797F
          </span>
        </div>

        {/* Speedometer Readout */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
              {speedKmh}
            </span>
            <span className="font-mono text-xs font-bold tracking-wider text-zinc-400 uppercase">
              KM/H
            </span>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-[9px] font-black uppercase tracking-wider border ${
                boost
                  ? "border-cyan-500/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  : "border-white/10 bg-white/5 text-zinc-400"
              }`}
            >
              {boost ? "⚡ BOOST" : "NORMAL"}
            </span>
            <span className="font-mono text-[9px] font-semibold text-zinc-400">
              MAX 50 KM/H
            </span>
          </div>
        </div>

        {/* Linear Speed Gauge */}
        <div className="flex flex-col gap-1">
          <div className="relative h-2 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                boost
                  ? "bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 shadow-[0_0_12px_rgba(6,182,212,0.8)]"
                  : "bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              }`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
          <div className="flex justify-between font-mono text-[8px] font-bold text-zinc-400">
            <span>0</span>
            <span>25</span>
            <span>50</span>
          </div>
        </div>

        {/* Gear Selector */}
        <div className="grid grid-cols-5 gap-1.5 pt-0.5">
          {(["P", "R", "N", "D", "B"] as const).map((g) => {
            const active = gear === g;
            let activeStyle =
              "border-amber-400/60 bg-amber-400/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.4)]";
            if (g === "D") {
              activeStyle =
                "border-emerald-400/60 bg-emerald-400/20 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.4)]";
            } else if (g === "B") {
              activeStyle =
                "border-cyan-400/60 bg-cyan-400/20 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]";
            } else if (g === "R") {
              activeStyle =
                "border-rose-400/60 bg-rose-400/20 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.4)]";
            } else if (g === "P") {
              activeStyle =
                "border-zinc-400/60 bg-zinc-400/20 text-white shadow-sm";
            }

            return (
              <div
                key={g}
                className={`flex h-8 items-center justify-center rounded-xl border font-mono text-[11px] font-black transition-all ${
                  active
                    ? activeStyle
                    : "border-white/5 bg-white/[0.02] text-zinc-400"
                }`}
              >
                {GEAR_LABELS[g]}
              </div>
            );
          })}
        </div>

        {/* 1-Line Attitude & Telemetry Strip */}
        <div className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] p-2.5">
          <div className="flex items-center justify-between font-mono text-[10px] font-bold">
            <div className="flex items-center gap-3 text-zinc-300">
              <span>
                P:{" "}
                <strong className="text-amber-400">
                  {pitch >= 0 ? "+" : ""}
                  {pitch.toFixed(1)}°
                </strong>
              </span>
              <span>
                R:{" "}
                <strong className="text-amber-400">
                  {roll >= 0 ? "+" : ""}
                  {roll.toFixed(1)}°
                </strong>
              </span>
            </div>

            <span
              className={`rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider ${
                isRollover
                  ? "bg-red-500/20 text-red-300 border border-red-500/40 animate-pulse"
                  : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}
            >
              {isRollover ? "⚠ ROLLOVER RISK" : "✔ STABLE"}
            </span>
          </div>

          {/* Anomaly / E-Stop dynamic notification line */}
          {(roadAnomaly || estopActive) && (
            <div className="flex items-center gap-1.5 pt-0.5 font-mono text-[9px] font-bold">
              {estopActive && (
                <span className="flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-rose-300 border border-rose-500/40 animate-pulse">
                  🛑 E-STOP ACTIVE
                </span>
              )}
              {roadAnomaly && (
                <span className="flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300 border border-amber-500/40 animate-pulse">
                  ⚡ ROAD ANOMALY
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CARD 2: TINYML RADAR PERCEPTION                                           */}
      {/* ========================================================================= */}
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-900/85 via-zinc-900/60 to-zinc-950/90 p-4 shadow-xl">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                connected
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"
                  : "bg-zinc-500"
              }`}
            />
            <span className="font-mono text-[10px] font-black uppercase tracking-wider text-zinc-400">
              TinyML Perception
            </span>
          </div>

          <span
            className={`rounded-md border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${
              connected
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-white/10 bg-white/5 text-zinc-400"
            }`}
          >
            {connected ? "ACTIVE" : "OFFLINE"}
          </span>
        </div>

        {/* Clearance Metric */}
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
              Obstacle Clearance
            </div>
            <div className="flex items-baseline gap-1.5 pt-0.5">
              <span className={`font-mono text-4xl font-black ${distColor}`}>
                {isClear ? "> 80" : closestObstacleM.toFixed(1)}
              </span>
              <span className="font-mono text-xs font-bold text-zinc-400 uppercase">
                Meters
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <span className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
              Time to Collision
            </span>
            <span
              className={`font-mono text-base font-black ${
                !connected || speedKmh < 1 || ttcSeconds > 25
                  ? "text-zinc-400"
                  : ttcSeconds < 3
                  ? "text-red-400 animate-pulse"
                  : ttcSeconds < 6
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {!connected || speedKmh < 1 || ttcSeconds > 25
                ? "--"
                : `${ttcSeconds.toFixed(1)}s`}
            </span>
          </div>
        </div>

        {/* Proximity Track Bar (0m to 80m) */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              closestObstacleM < 15
                ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                : closestObstacleM < 30
                ? "bg-amber-400 shadow-[0_0_8px_#f59e0b]"
                : "bg-emerald-400"
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, (closestObstacleM / 80) * 100))}%`,
            }}
          />
        </div>

        {/* Steering Path Guidance */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <div className="text-[9px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
            Trajectory Guidance
          </div>
          <div
            className={`flex items-center justify-center rounded-xl border py-2 font-mono text-xs font-black tracking-wider uppercase transition-all ${steerBanner.cls}`}
          >
            {steerBanner.text}
          </div>
        </div>

        {/* Offline Notice if Python is not streaming */}
        {!connected && (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-2 text-center font-mono text-[9px] text-zinc-400">
            Waiting for TinyML WebSocket (localhost:8765)...
          </div>
        )}
      </div>
    </aside>
  );
}
