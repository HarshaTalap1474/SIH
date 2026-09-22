"use client";

import type { ReactNode } from "react";
import { useSim } from "@/lib/simStore";
import { useSensor } from "@/lib/virtualSensor";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore } from "@/lib/hardwareClient";
import { Icon } from "@/components/ui/Icon";

const GEAR_LABELS: Record<string, string> = { P: "P", R: "R", N: "N", D: "D", B: "BST" };

const GEAR_ACTIVE_CLS: Record<string, string> = {
  P: "border-fg-3/60 bg-surface-3 text-fg",
  N: "border-fg-3/60 bg-surface-3 text-fg",
  R: "border-danger/60 bg-danger/15 text-danger",
  D: "border-ok/60 bg-ok/15 text-ok",
  B: "border-info/60 bg-info/15 text-info",
};

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-3 p-3.5">
      <div className="card-header">
        <span className="card-title">{title}</span>
        {right}
      </div>
      {children}
    </div>
  );
}

function StatusDot({ tone }: { tone: "ok" | "danger" | "caution" | "muted" }) {
  const cls =
    tone === "ok"
      ? "bg-ok"
      : tone === "danger"
        ? "bg-danger"
        : tone === "caution"
          ? "bg-caution"
          : "bg-fg-3";
  return <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${cls}`} />;
}

export function DashboardPanel() {
  // ── Sim ───────────────────────────────────────────────────────────────────
  const speedKmh = useSim((s) => s.speedKmh);
  const boost = useSim((s) => s.boost);
  const gear = useSim((s) => s.gear);

  // ── Sensor ────────────────────────────────────────────────────────────────
  const roadAnomaly = useSensor((s) => s.roadAnomaly);

  // ── Hardware ──────────────────────────────────────────────────────────────
  const estopActive = useHardwareStore((s) => s.estopActive);

  // ── ADAS ──────────────────────────────────────────────────────────────────
  const connected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);
  const closestObstacleM = useAdasStore((s) => s.closestObstacleM);
  const ttcSeconds = useAdasStore((s) => s.ttcSeconds);
  const steeringGuidance = useAdasStore((s) => s.steeringGuidance);
  const threatDirection = useAdasStore((s) => s.threatDirection);

  const isCritical = connected && (risk === "CRITICAL" || emergencyBrake);
  const isCaution = connected && risk === "CAUTION" && !isCritical;

  const riskLabel = !connected ? "STANDBY" : isCritical ? "CRITICAL" : isCaution ? "CAUTION" : "SAFE";
  const riskCls = !connected
    ? "border-surface-4/60 bg-surface-1 text-fg-3"
    : isCritical
      ? "border-danger/50 bg-danger/15 text-danger animate-pulse"
      : isCaution
        ? "border-caution/50 bg-caution/15 text-caution"
        : "border-ok/40 bg-ok/10 text-ok";

  // ── Clearance colouring + thresholds (unchanged logic) ───────────────────
  const isClear = closestObstacleM >= 79;
  const distTone =
    closestObstacleM < 12 ? "text-danger" : closestObstacleM < 25 ? "text-caution" : "text-ok";

  // ── Steering recommendation ───────────────────────────────────────────────
  let steerText = "PATH CLEAR";
  let steerIcon: "steerUp" | "steerLeft" | "steerRight" = "steerUp";
  let steerCls = "border-ok/30 bg-ok/10 text-ok";
  if (steeringGuidance < -0.1) {
    steerText = `STEER LEFT ${Math.round(Math.abs(steeringGuidance) * 100)}%`;
    steerIcon = "steerLeft";
    steerCls = "border-caution/40 bg-caution/15 text-caution";
  } else if (steeringGuidance > 0.1) {
    steerText = `STEER RIGHT ${Math.round(steeringGuidance * 100)}%`;
    steerIcon = "steerRight";
    steerCls = "border-caution/40 bg-caution/15 text-caution";
  }

  const speedPct = Math.min(100, Math.max(0, (speedKmh / 50) * 100));

  const ttcText =
    !connected || speedKmh < 1 || ttcSeconds > 25 ? "--" : `${ttcSeconds.toFixed(1)}s`;
  const ttcTone =
    !connected || speedKmh < 1 || ttcSeconds > 25
      ? "text-fg-3"
      : ttcSeconds < 3
        ? "text-danger"
        : ttcSeconds < 6
          ? "text-caution"
          : "text-ok";

  return (
    <aside className="relative z-20 flex h-full w-[320px] flex-shrink-0 select-none flex-col gap-3 overflow-y-auto overscroll-contain border-r border-surface-4/50 bg-ink/95 p-3.5 backdrop-blur-md">
      {/* ══ DRIVE ═══════════════════════════════════════════════════════════ */}
      <Section
        title="Drive"
        right={<span className="pill border-brand/25 bg-brand/10 text-brand">CAT&nbsp;797F</span>}
      >
        {/* Speed readout */}
        <div className="flex items-start justify-between">
          <div className="flex h-12 items-baseline gap-2">
            <span className="font-mono text-5xl font-bold leading-none tracking-tight text-fg tabular-nums">
              {speedKmh}
            </span>
            <span className="font-mono text-xs font-semibold uppercase text-fg-3">km/h</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`pill uppercase ${
                boost
                  ? "border-info/40 bg-info/10 text-info"
                  : "border-surface-4/60 bg-surface-1 text-fg-3"
              }`}
            >
              {boost && <Icon name="bolt" className="h-3 w-3" />}
              {boost ? "Boost" : "Normal"}
            </span>
            <span className="max-w-full truncate font-mono text-[10px] font-medium text-fg-3">
              MAX 50 KM/H
            </span>
          </div>
        </div>

        {/* Linear speed gauge */}
        <div className="flex flex-col gap-1">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className={`h-full rounded-full transition-all duration-150 ${
                boost ? "bg-info" : "bg-brand"
              }`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
        </div>

        {/* Gear selector */}
        <div className="grid grid-cols-5 gap-1.5">
          {(["P", "R", "N", "D", "B"] as const).map((g) => (
            <div
              key={g}
              className={`flex h-8 items-center justify-center rounded-lg border font-mono text-[11px] font-bold transition-colors ${
                gear === g ? GEAR_ACTIVE_CLS[g] : "border-surface-4/40 bg-surface-1 text-fg-3"
              }`}
            >
              {GEAR_LABELS[g]}
            </div>
          ))}
        </div>

        {/* Alerts strip — only when active */}
        {(estopActive || roadAnomaly) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {estopActive && (
              <span className="pill border-danger/50 bg-danger/15 text-danger animate-pulse">
                <Icon name="alert" className="h-3 w-3" /> E-Stop Active
              </span>
            )}
            {roadAnomaly && (
              <span className="pill border-caution/50 bg-caution/15 text-caution">
                <Icon name="bolt" className="h-3 w-3" /> Road Anomaly
              </span>
            )}
          </div>
        )}
      </Section>

      {/* ══ TINYML PERCEPTION ══════════════════════════════════════════════ */}
      <Section
        title="TinyML Perception"
        right={
          <span
            className={`pill uppercase ${
              connected ? "border-ok/40 bg-ok/10 text-ok" : "border-surface-4/60 bg-surface-1 text-fg-3"
            }`}
          >
            <StatusDot tone={connected ? "ok" : "muted"} />
            {connected ? "Active" : "Offline"}
          </span>
        }
      >
        {/* Clearance + TTC */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="kpi-label">Obstacle Clearance</div>
            <div className="flex h-9 items-baseline gap-1.5 pt-1">
              <span className={`font-mono text-3xl font-bold leading-none tabular-nums ${distTone}`}>
                {isClear ? "> 80" : closestObstacleM.toFixed(1)}
              </span>
              <span className="font-mono text-[10px] font-semibold uppercase text-fg-3">m</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="kpi-label">Time to Collision</div>
            <div className="flex h-9 items-end pt-1">
              <span className={`font-mono text-xl font-bold leading-none tabular-nums ${ttcTone}`}>
                {ttcText}
              </span>
            </div>
          </div>
        </div>

        {/* Proximity track (0–80 m) */}
        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
          <div
            className={`h-full rounded-full transition-all duration-150 ${
              closestObstacleM < 15 ? "bg-danger" : closestObstacleM < 30 ? "bg-caution" : "bg-ok"
            }`}
            style={{
              width: `${Math.min(100, Math.max(0, (closestObstacleM / 80) * 100))}%`,
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="kpi-label">Risk Level</span>
          <span className={`pill uppercase ${riskCls}`}>{riskLabel}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="kpi-label">Threat Direction</span>
          <span
            className={`pill uppercase ${
              threatDirection === "FRONT"
                ? "border-danger/50 bg-danger/15 text-danger"
                : threatDirection === "REAR"
                  ? "border-caution/50 bg-caution/15 text-caution"
                  : "border-surface-4/60 bg-surface-1 text-fg-3"
            }`}
          >
            {threatDirection === "NONE" ? "None" : threatDirection.toLowerCase()}
          </span>
        </div>

        {!connected && (
          <div className="rounded-lg border border-dashed border-surface-4/60 bg-surface-1/50 px-2 py-1.5 text-center font-mono text-[10px] leading-relaxed text-fg-3">
            Waiting for TinyML WebSocket (localhost:8765)...
          </div>
        )}
      </Section>

      {/* ══ TRAJECTORY GUIDANCE ═════════════════════════════════════════════ */}
      <Section title="Trajectory Guidance">
        <div
          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-mono text-xs font-bold uppercase tracking-wider ${steerCls}`}
        >
          <Icon name={steerIcon} className="h-4 w-4" />
          {steerText}
        </div>
      </Section>
    </aside>
  );
}