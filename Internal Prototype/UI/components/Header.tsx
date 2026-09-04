"use client";

import { useSim } from "@/lib/simStore";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore, hwClient } from "@/lib/hardwareClient";

export function Header() {
  // Sim Store
  const camMode = useSim((s) => s.camMode);
  const headlights = useSim((s) => s.headlights);
  const fogMode = useSim((s) => s.fogMode);
  const toggleCam = useSim((s) => s.toggleCam);
  const toggleHeadlights = useSim((s) => s.toggleHeadlights);
  const toggleFog = useSim((s) => s.toggleFog);
  const resetSim = useSim((s) => s.resetSim);

  // ADAS Store
  const adasConnected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);

  // Hardware Store
  const hwConnected = useHardwareStore((s) => s.connected);
  const hwConnecting = useHardwareStore((s) => s.connecting);
  const esp32Ip = useHardwareStore((s) => s.esp32Ip);
  const usingCustomUrl = useHardwareStore((s) => s.usingCustomUrl);

  const isCritical = adasConnected && (risk === "CRITICAL" || emergencyBrake);
  const isCaution = adasConnected && risk === "CAUTION" && !isCritical;

  return (
    <header className="relative z-30 flex h-14 w-full select-none items-center justify-between border-b border-white/10 bg-zinc-950/95 px-5 shadow-2xl backdrop-blur-2xl">
      {/* ========================================================================= */}
      {/* 1. BRANDING & TEAM IDENTITY                                              */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent shadow-[0_0_15px_rgba(245,158,11,0.2)]">
          <span className="font-mono text-base font-black tracking-tighter text-amber-400">
            W
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400 bg-clip-text text-sm font-black tracking-wider text-transparent uppercase">
              WeBuildZ
            </h1>
            <span className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-zinc-400 tracking-wider">
              HEMM 797F
            </span>
          </div>
          <p className="text-[10px] font-medium tracking-tight text-zinc-400">
            Autonomous Safety & Digital Twin
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC THREAT ALERT BANNER (CENTER)                                  */}
      {/* ========================================================================= */}
      <div className="flex items-center">
        <div
          className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] font-black uppercase tracking-wider transition-all duration-200 border ${
            !adasConnected
              ? "border-white/5 bg-zinc-900/60 text-zinc-400"
              : isCritical
              ? "border-red-500/60 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse"
              : isCaution
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
          }`}
        >
          <span className="text-xs">
            {!adasConnected ? "⚪" : isCritical ? "🛑" : isCaution ? "⚠" : "✔"}
          </span>
          <span>
            {!adasConnected
              ? "SYSTEM STANDBY (PYTHON OFFLINE)"
              : isCritical
              ? "CRITICAL: EMERGENCY BRAKE ENGAGED"
              : isCaution
              ? "CAUTION: OBSTACLE PROXIMITY ALERT"
              : "HAUL ROAD CLEAR"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUICK ACTIONS TOOLBAR & INDUSTRIAL TELEMETRY HUB                      */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3">
        {/* Quick Controls Toolbar */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={resetSim}
            title="Reset Simulation (R)"
            className="cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-95"
          >
            ↺ Reset
          </button>

          <button
            type="button"
            onClick={toggleCam}
            title="Cycle Camera: Chase -> Cockpit -> Top (C)"
            className="cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold text-amber-400 transition-all hover:bg-white/10 active:scale-95 capitalize"
          >
            📷 {camMode}
          </button>

          <button
            type="button"
            onClick={toggleHeadlights}
            title="Toggle Headlights (H)"
            className={`cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold transition-all active:scale-95 ${
              headlights
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.25)]"
                : "text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            💡 {headlights ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={toggleFog}
            title="Cycle Fog Density (F)"
            className="cursor-pointer rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold text-zinc-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 capitalize"
          >
            🌫 {fogMode}
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-6 w-px bg-white/10" />

        {/* Industrial Telemetry Hub */}
        <div className="flex items-center gap-2">
          {/* ESP32 Hardware Status */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                const current = useHardwareStore.getState().esp32Ip;
                const next = window.prompt("ESP32 WebSocket URL:", current);
                if (next && next.trim()) {
                  hwClient.setCustomUrl(next.trim());
                }
              }}
              className={`cursor-pointer flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-all ${
                hwConnected
                  ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                  : hwConnecting
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300/90 shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                  : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/20"
              }`}
              title={`ESP32 mDNS Link\nAddress: ${esp32Ip}\nStatus: ${
                hwConnected ? "Connected (50Hz)" : hwConnecting ? "Listening & Reconnecting (mDNS)..." : "Disconnected"
              }\nClick to change URL`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  hwConnected
                    ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"
                    : hwConnecting
                    ? "bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse"
                    : "bg-zinc-500"
                }`}
              />
              <span>{hwConnected ? "ESP32 50Hz" : hwConnecting ? "ESP32 LISTENING" : "ESP32 OFF"}</span>
            </button>
          </div>

          {/* ESP32 Auto / Cal Buttons if connected */}
          {hwConnected && (
            <div className="flex items-center gap-1">
              {usingCustomUrl && (
                <button
                  type="button"
                  onClick={() => hwClient.clearCustomUrl()}
                  title="Reset to Auto Endpoint Detection"
                  className="cursor-pointer rounded-md border border-sky-500/30 bg-sky-500/10 px-1.5 py-1 font-mono text-[8px] font-bold text-sky-300 hover:bg-sky-500/20"
                >
                  AUTO
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  hwClient.calibrate();
                  window.alert("MPU6050 tared ✓ — current orientation zeroed.");
                }}
                title="Tare MPU6050: Zero Pitch & Roll"
                className="cursor-pointer rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-1 font-mono text-[8px] font-bold text-amber-300 hover:bg-amber-500/20"
              >
                CAL
              </button>
            </div>
          )}

          {/* TinyML Python Inference Link */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-[10px] font-bold tracking-wider uppercase transition-all ${
              adasConnected
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                : "border-white/10 bg-zinc-900 text-zinc-500"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                adasConnected
                  ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"
                  : "bg-zinc-500"
              }`}
            />
            <span>{adasConnected ? "AI LIVE" : "AI OFFLINE"}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
