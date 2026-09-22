"use client";

import { useEffect, useState } from "react";
import { useSim } from "@/lib/simStore";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore, hwClient } from "@/lib/hardwareClient";
import { Icon } from "@/components/ui/Icon";

export function Header() {
  const camMode = useSim((s) => s.camMode);
  const headlights = useSim((s) => s.headlights);
  const fogMode = useSim((s) => s.fogMode);
  const rainMode = useSim((s) => s.rainMode);
  const toggleCam = useSim((s) => s.toggleCam);
  const toggleHeadlights = useSim((s) => s.toggleHeadlights);
  const toggleFog = useSim((s) => s.toggleFog);
  const toggleRain = useSim((s) => s.toggleRain);
  const resetSim = useSim((s) => s.resetSim);

  const adasConnected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);

  const hwConnected = useHardwareStore((s) => s.connected);
  const portInfo = useHardwareStore((s) => s.portInfo);

  const isCritical = adasConnected && (risk === "CRITICAL" || emergencyBrake);
  const isCaution = adasConnected && risk === "CAUTION" && !isCritical;

  const [serialSupported, setSerialSupported] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setSerialSupported(hwClient.isSupported()));
    return () => cancelAnimationFrame(id);
  }, []);

  const bannerIcon = !adasConnected ? "gauge" : isCritical ? "alert" : isCaution ? "alert" : "check";
  const bannerText = !adasConnected
    ? "SYSTEM STANDBY — PYTHON OFFLINE"
    : isCritical
      ? "CRITICAL: EMERGENCY BRAKE ENGAGED"
      : isCaution
        ? "CAUTION: OBSTACLE PROXIMITY ALERT"
        : "HAUL ROAD CLEAR";

  const bannerCls = !adasConnected
    ? "border-surface-4/60 bg-surface-2 text-fg-3"
    : isCritical
      ? "border-danger/60 bg-danger/15 text-danger"
      : isCaution
        ? "border-caution/50 bg-caution/10 text-caution"
        : "border-ok/40 bg-ok/10 text-ok";

  const rainActive = rainMode !== "none";
  const rainCls = rainActive ? "bg-info/15 text-info border-info/30" : "text-fg-2 hover:bg-surface-3 hover:text-fg";
  const rainLabel = rainMode === "none" ? "Rain" : rainMode === "medium" ? "Medium" : "Heavy";

  return (
    <header className="relative z-30 flex h-14 w-full select-none items-center justify-between gap-3 border-b border-surface-4/50 bg-ink/95 px-4 shadow-lg backdrop-blur-md">
      {/* ── Branding ────────────────────────────────────────────────────── */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border border-brand/30 bg-surface-2">
          <span className="font-mono text-sm font-black tracking-tighter text-brand">W</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-[13px] font-bold uppercase tracking-wider text-fg">WeBuildZ</h1>
            <span className="pill hidden md:inline-flex border-brand/25 bg-brand/10 text-brand">
              HEMM 797F
            </span>
          </div>
          <p className="hidden truncate text-[11px] font-medium text-fg-3 md:block">
            Autonomous Safety &amp; Digital Twin
          </p>
        </div>
      </div>

      {/* ── System status banner ────────────────────────────────────────── */}
      <div className="hidden md:flex min-w-0 flex-1 justify-center px-2">
        <div className={`pill border px-3 py-1.5 text-[11px] uppercase tracking-wider ${bannerCls}`}>
          <Icon name={bannerIcon} className={`h-3.5 w-3.5 ${isCritical ? "animate-pulse" : ""}`} />
          <span className="hidden truncate xl:inline">{bannerText}</span>
          <span className="truncate xl:hidden">
            {!adasConnected ? "STANDBY" : isCritical ? "CRITICAL" : isCaution ? "CAUTION" : "CLEAR"}
          </span>
        </div>
      </div>

      {/* ── Toolbar + telemetry status ──────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5 rounded-lg border border-surface-4/60 bg-surface-1 p-0.5">
          <button
            type="button"
            onClick={resetSim}
            title="Reset Simulation (R)"
            className="icon-btn"
          >
            <Icon name="reset" className="h-4 w-4" />
            <span className="hidden lg:inline">Reset</span>
          </button>

          <button
            type="button"
            onClick={toggleCam}
            title="Cycle Camera: Chase -> Cockpit -> Top (C)"
            className="icon-btn capitalize"
          >
            <Icon name="camera" className="h-4 w-4" />
            <span className="hidden lg:inline">{camMode}</span>
          </button>

          <button
            type="button"
            onClick={toggleHeadlights}
            title="Toggle Headlights (H)"
            className={`icon-btn ${
              headlights ? "border-brand/30 bg-brand/10 text-brand" : ""
            }`}
          >
            <Icon name="headlight" className="h-4 w-4" />
            <span className="hidden lg:inline">{headlights ? "On" : "Off"}</span>
          </button>

          <button
            type="button"
            onClick={toggleFog}
            title="Cycle Fog Density (F)"
            className="icon-btn capitalize"
          >
            <Icon name="fog" className="h-4 w-4" />
            <span className="hidden lg:inline">{fogMode}</span>
          </button>

          <button
            type="button"
            onClick={toggleRain}
            title="Cycle Rain Intensity (T)"
            className={`icon-btn capitalize ${rainCls}`}
          >
            <Icon name="rain" className="h-4 w-4" />
            <span className="hidden lg:inline">{rainLabel}</span>
          </button>
        </div>

        <div className="hidden h-6 w-px bg-surface-4/60 sm:block" />

        <div className="flex items-center gap-2">
          {hwConnected ? (
            <>
              <div
                className="pill hidden border-ok/40 bg-ok/10 text-ok md:inline-flex"
                title={`Controller connected via USB Serial\n${portInfo}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                <span>Controller Live</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  hwClient.calibrate();
                  window.alert("MPU6050 tared ✓ — current orientation zeroed.");
                }}
                title="Tare MPU6050: Zero Pitch & Roll"
                className="icon-btn border-brand/25 bg-brand/10 text-brand"
              >
                <Icon name="crosshair" className="h-4 w-4" />
                <span className="hidden md:inline">Tare</span>
              </button>

              <button
                type="button"
                onClick={() => hwClient.disconnect()}
                title="Disconnect USB Serial Controller"
                className="icon-btn border-danger/30 bg-danger/10 text-danger"
              >
                <Icon name="power" className="h-4 w-4" />
                <span className="hidden md:inline">Off</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => hwClient.connect()}
              disabled={!serialSupported}
              title={
                serialSupported
                  ? "Connect ESP32 controller via USB cable"
                  : "Web Serial API not supported — use Chrome or Edge"
              }
              className={`icon-btn uppercase ${
                serialSupported
                  ? "border-info/40 bg-info/10 text-info hover:bg-info/15"
                  : "cursor-not-allowed border-surface-4/60 bg-surface-1 text-fg-3"
              }`}
            >
              <Icon name="plug" className="h-4 w-4" />
              <span className="hidden md:inline">Connect</span>
            </button>
          )}

          <div
            className={`pill uppercase ${
              adasConnected
                ? "border-ok/40 bg-ok/10 text-ok"
                : "border-surface-4/60 bg-surface-1 text-fg-3"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${adasConnected ? "bg-ok" : "bg-fg-3"}`} />
            <span className="hidden md:inline">{adasConnected ? "AI Live" : "AI Offline"}</span>
            <span className="md:hidden">{adasConnected ? "AI" : "ML"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}