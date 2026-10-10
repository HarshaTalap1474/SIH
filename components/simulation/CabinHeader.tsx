"use client";

import Link from "next/link";
import { ArrowLeft, LayoutDashboard, Truck, User } from "lucide-react";
import { useSim } from "@/lib/simStore";
import { useAdasStore } from "@/lib/mlClient";
import { useHardwareStore } from "@/lib/hardwareClient";

interface CabinHeaderProps {
  vehicleId: string;
}

export function CabinHeader({ vehicleId }: CabinHeaderProps) {
  // Sim Store
  const camMode = useSim((s) => s.camMode);
  const headlights = useSim((s) => s.headlights);
  const fogMode = useSim((s) => s.fogMode);
  const rainMode = useSim((s) => s.rainMode);
  const toggleCam = useSim((s) => s.toggleCam);
  const toggleHeadlights = useSim((s) => s.toggleHeadlights);
  const toggleFog = useSim((s) => s.toggleFog);
  const toggleRain = useSim((s) => s.toggleRain);
  const resetSim = useSim((s) => s.resetSim);

  // ADAS Store
  const adasConnected = useAdasStore((s) => s.connected);
  const risk = useAdasStore((s) => s.collisionRisk);
  const emergencyBrake = useAdasStore((s) => s.emergencyBrake);

  // Hardware Store
  const hwConnected = useHardwareStore((s) => s.connected);
  const hwConnecting = useHardwareStore((s) => s.connecting);
  const esp32Ip = useHardwareStore((s) => s.esp32Ip);

  const isCritical = adasConnected && (risk === "CRITICAL" || emergencyBrake);
  const isCaution = adasConnected && risk === "CAUTION" && !isCritical;

  return (
    <header className="relative z-30 flex h-14 w-full select-none items-center justify-between border-b border-white/10 bg-[#090d16] px-4 shadow-2xl backdrop-blur-xl">
      {/* ========================================================================= */}
      {/* 1. BACK NAVIGATION & VEHICLE IDENTITY                                    */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-3">
        {/* Back to Fleet */}
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition"
          title="Back to Fleet Dashboard"
        >
          <LayoutDashboard className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Fleet</span>
        </Link>

        {/* Back to Selected Vehicle */}
        <Link
          href={`/fleet/${vehicleId}`}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition"
          title={`Back to HEMM ${vehicleId}`}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to {vehicleId}</span>
        </Link>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-800 hidden sm:block" />

        {/* Vehicle Title & Live Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Truck className="h-4 w-4 text-amber-400" />
            <span className="font-mono text-sm font-black text-white">
              HEMM {vehicleId}
            </span>
            <span className="text-xs text-slate-400">| Live Cabin</span>
          </div>

          <span className="flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. DYNAMIC THREAT ALERT BANNER (CENTER)                                  */}
      {/* ========================================================================= */}
      <div className="hidden md:flex items-center">
        <div
          className={`flex items-center gap-2 rounded-full px-3.5 py-1 font-mono text-[10px] font-black uppercase tracking-wider transition-all duration-200 border ${
            !adasConnected
              ? "border-white/5 bg-zinc-900/60 text-zinc-400"
              : isCritical
              ? "border-red-500/60 bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse"
              : isCaution
              ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
              : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
          }`}
        >
          <span>
            {!adasConnected
              ? "⚪ STANDBY"
              : isCritical
              ? "🛑 AUTO BRAKING ACTIVE"
              : isCaution
              ? "⚠ OBSTACLE PROXIMITY"
              : "✔ ROAD CLEAR"}
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SIMULATION CONTROLS & HARDWARE LINK                                   */}
      {/* ========================================================================= */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Controls Toolbar */}
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-[10px] font-mono">
          <button
            type="button"
            onClick={resetSim}
            title="Reset Simulation (R)"
            className="cursor-pointer rounded-lg px-2 py-1 font-bold text-zinc-300 hover:bg-white/10 hover:text-white transition"
          >
            ↺ Reset
          </button>

          <button
            type="button"
            onClick={toggleCam}
            title="Cycle Camera (C)"
            className="cursor-pointer rounded-lg px-2 py-1 font-bold text-amber-400 hover:bg-white/10 capitalize"
          >
            📷 {camMode}
          </button>

          <button
            type="button"
            onClick={toggleHeadlights}
            title="Toggle Headlights (H)"
            className={`cursor-pointer rounded-lg px-2 py-1 font-bold ${
              headlights
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                : "text-zinc-400 hover:bg-white/10"
            }`}
          >
            💡 {headlights ? "ON" : "OFF"}
          </button>

          <button
            type="button"
            onClick={toggleFog}
            title="Cycle Fog (F)"
            className="cursor-pointer rounded-lg px-2 py-1 font-bold text-zinc-300 hover:bg-white/10 capitalize hidden lg:block"
          >
            🌫 {fogMode}
          </button>

          <button
            type="button"
            onClick={toggleRain}
            title="Cycle Rain (T)"
            className={`cursor-pointer rounded-lg px-2 py-1 font-bold uppercase hidden lg:block ${
              rainMode === "high"
                ? "bg-cyan-500/20 text-cyan-300"
                : rainMode === "medium"
                ? "bg-blue-500/20 text-blue-300"
                : "text-zinc-300 hover:bg-white/10"
            }`}
          >
            🌧 {rainMode === "none" ? "NO RAIN" : rainMode}
          </button>
        </div>

        {/* ESP32 Status Pill */}
        <div
          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 font-mono text-[10px] font-bold uppercase ${
            hwConnected
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
              : hwConnecting
              ? "border-amber-500/40 bg-amber-500/10 text-amber-300/90"
              : "border-white/10 bg-zinc-900 text-zinc-400"
          }`}
          title={`ESP32 Link: ${esp32Ip}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              hwConnected
                ? "bg-emerald-400 animate-pulse"
                : hwConnecting
                ? "bg-amber-400 animate-pulse"
                : "bg-zinc-500"
            }`}
          />
          <span className="hidden sm:inline">
            {hwConnected ? "ESP32 50Hz" : hwConnecting ? "ESP32 LISTENING" : "ESP32 OFF"}
          </span>
        </div>

        {/* Profile Pill */}
        <div className="hidden xl:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 py-1 px-2 text-xs">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-slate-300">
            <User className="h-3 w-3" />
          </div>
          <span className="text-[11px] font-medium text-slate-300">Admin</span>
        </div>
      </div>
    </header>
  );
}
