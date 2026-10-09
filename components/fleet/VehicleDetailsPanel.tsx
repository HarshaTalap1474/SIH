"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  X,
  ArrowLeft,
  Video,
  ShieldAlert,
  Compass,
  User,
  History,
  Navigation,
} from "lucide-react";
import { HEMMVehicle } from "@/lib/fleetData";

interface VehicleDetailsPanelProps {
  vehicle: HEMMVehicle | null;
  onClose: () => void;
}

export function VehicleDetailsPanel({ vehicle, onClose }: VehicleDetailsPanelProps) {
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const thermalVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [vehicle?.id]);

  // Autoplay control
  useEffect(() => {
    const video = thermalVideoRef.current;
    if (!video) return;

    video.muted = true;
    video.play().catch(() => {});
  }, [vehicle?.id]);

  // Strict 3.0s looping enforcement
  useEffect(() => {
    const video = thermalVideoRef.current;
    if (!video) return;

    let animId: number;
    const checkLoop = () => {
      if (video && video.currentTime >= 3.0) {
        video.currentTime = 0;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
      animId = requestAnimationFrame(checkLoop);
    };

    animId = requestAnimationFrame(checkLoop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  if (!vehicle) return null;

  const isCritical = vehicle.status === "critical";
  const isWarning = vehicle.status === "warning";

  return (
    <aside
      data-tour="vehicle-details-panel"
      className="w-full lg:w-[410px] xl:w-[440px] shrink-0 flex flex-col rounded-lg border border-slate-800 bg-[#0a0f18] shadow-xl overflow-hidden transition-all duration-200"
      aria-label="Vehicle Details Drawer"
    >
      {/* ========================================================================= */}
      {/* 1. TOP DRAWER HEADER                                                      */}
      {/* ========================================================================= */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3.5 py-2.5 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition group cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Fleet</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded border border-slate-800 bg-slate-950 px-2 py-0.5 text-[10px] text-slate-400">
            <User className="h-3 w-3 text-slate-400" />
            <span className="font-medium text-slate-300">Mine Control Room</span>
          </div>

          <button
            onClick={onClose}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCROLLABLE DRAWER BODY                                                    */}
      {/* ========================================================================= */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Unit Identity & Status */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold tracking-tight text-white font-mono">
                HEMM {vehicle.id}
              </h2>
              <span className="text-[11px] text-slate-400">
                ({vehicle.model})
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isCritical ? (
                <span className="rounded bg-rose-950/80 border border-rose-500/50 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                  Critical
                </span>
              ) : isWarning ? (
                <span className="rounded bg-amber-950/80 border border-amber-500/50 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  Warning
                </span>
              ) : null}

              {vehicle.online ? (
                <span className="rounded bg-emerald-950/80 border border-emerald-500/50 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  Online
                </span>
              ) : (
                <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  Offline
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Operator: <strong className="text-slate-200">{vehicle.operator}</strong></span>
            <span className="font-mono text-[10px]">
              Last updated: {vehicle.lastUpdated}
            </span>
          </div>

          {/* Active Hazard Warning Banner */}
          {vehicle.alertMessage && (
            <div className="mt-2 flex items-start gap-2 rounded border border-rose-500/50 bg-rose-950/40 p-2 text-xs text-rose-200">
              <ShieldAlert className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-rose-300 text-[11px] block">Active Collision Alert</span>
                <span className="text-[10px] text-rose-200/90 leading-tight block">
                  {vehicle.alertMessage}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. VEHICLE IMAGE                                                         */}
        {/* ========================================================================= */}
        <div className="relative h-36 w-full rounded border border-slate-800 overflow-hidden bg-slate-950">
          <Image
            src={vehicle.image || "/images/hemm_dumper_truck.jpg"}
            alt={vehicle.name}
            fill
            sizes="440px"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f18] via-transparent to-transparent opacity-70" />

          <div className="absolute bottom-2 left-2.5 flex items-center gap-1.5">
            <span className="rounded bg-black/80 border border-white/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-400">
              UNIT: {vehicle.id}
            </span>
            <span className="rounded bg-black/80 border border-white/20 px-1.5 py-0.5 text-[9px] text-slate-300">
              CAT 797F 400-TON
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. VEHICLE TELEMETRY (Clean two-column tabular layout)                   */}
        {/* ========================================================================= */}
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Telemetry
            </span>
            <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Stream
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
            {/* Speed & Current Zone */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Speed</span>
              <span className="font-bold text-white text-[12px]">{vehicle.speed} km/h</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Current Zone</span>
              <span className="font-semibold text-amber-400 text-[11px] truncate max-w-[100px]" title={vehicle.zone}>
                {vehicle.zone}
              </span>
            </div>

            {/* Gear & Location */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Gear</span>
              <span className="font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded text-[11px]">
                {vehicle.gear}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Location</span>
              <span className="text-[10px] text-slate-300">
                {vehicle.latitude}°N, {vehicle.longitude}°E
              </span>
            </div>

            {/* Obstacle Clearance & Payload */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Clearance</span>
              <span className={`font-bold text-[12px] ${vehicle.clearance < 6 ? "text-rose-400" : "text-emerald-400"}`}>
                {vehicle.clearance} m
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Payload</span>
              <span className="text-slate-200 text-[11px]">{vehicle.payload} tons</span>
            </div>

            {/* TTC & Battery/Power */}
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">TTC</span>
              <span className={`font-bold text-[12px] ${vehicle.ttc < 3 ? "text-rose-400" : "text-slate-200"}`}>
                {vehicle.ttc} s
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1">
              <span className="text-slate-400 font-sans text-[11px]">Battery / Power</span>
              <span className="font-bold text-emerald-400 text-[11px]">{vehicle.power}%</span>
            </div>

            {/* Heading & Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans text-[11px]">Heading</span>
              <span className="text-slate-200 text-[11px] flex items-center gap-1">
                <Compass className="h-3 w-3 text-slate-400" />
                {vehicle.heading}°
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-sans text-[11px]">Status</span>
              <span className={`font-semibold text-[11px] ${
                isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
              }`}>
                {isCritical ? "Critical" : isWarning ? "Warning" : "Normal"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. SENSOR STATUS (Compact list with small status dots)                    */}
        {/* ========================================================================= */}
        <div data-tour="sensor-status" className="rounded border border-slate-800/80 bg-slate-900/40 p-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            Sensor Status
          </span>

          <div className="grid grid-cols-3 gap-2 text-xs">
            {/* Camera */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">Camera</span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> OK
              </span>
            </div>

            {/* LiDAR */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">LiDAR</span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> OK
              </span>
            </div>

            {/* Radar */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">Radar</span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> OK
              </span>
            </div>

            {/* GPS */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">GPS</span>
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> OK
              </span>
            </div>

            {/* ESP32 */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">ESP32</span>
              <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Link
              </span>
            </div>

            {/* AI Model */}
            <div className="flex items-center justify-between py-1 px-1.5 rounded bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] text-slate-400">AI Model</span>
              <span className="text-[10px] font-bold text-purple-400 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400" /> Active
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. LIVE CABIN PREVIEW (Interactive image itself — NO PERMANENT BUTTON)   */}
        {/* ========================================================================= */}
        <div data-tour="cabin-preview">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Live Cabin Preview
            </span>
            <span className="flex items-center gap-1 rounded bg-emerald-950/80 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-bold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>

          {/* Interactive Cabin Preview Container: opens running Live Cabin application */}
          <a
            href={`${process.env.NEXT_PUBLIC_CABIN_URL || "http://localhost:3001"}?vehicle=${vehicle.id}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open live cabin for HEMM ${vehicle.id}`}
            className="group relative block h-32 w-full rounded border border-slate-800 overflow-hidden bg-slate-950 cursor-pointer shadow-md"
          >
            <Image
              src="/images/cabin_live_preview.jpg"
              alt="3D Cabin Live Simulation"
              fill
              sizes="440px"
              className="object-cover object-center group-hover:scale-102 transition-transform duration-200"
            />

            {/* Default Subtle Bottom Badge */}
            <div className="absolute bottom-1.5 left-2 flex items-center gap-1.5 pointer-events-none group-hover:opacity-0 transition-opacity">
              <span className="rounded bg-black/80 border border-white/15 px-1.5 py-0.5 text-[9px] font-mono text-slate-300">
                3D TELEMETRY SIMULATOR
              </span>
            </div>

            {/* Smooth Hover Overlay: Centered Open Live Cabin Action */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-150 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg transition-transform group-hover:scale-105">
                <Video className="h-3.5 w-3.5" />
                <span>Open Live Cabin →</span>
              </div>
            </div>
          </a>

          {/* Compact Secondary Utility Actions */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={() => {
                const elem = document.querySelector("#restricted-zone-group");
                elem?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center justify-center gap-1.5 rounded border border-slate-800 bg-slate-900/80 py-1.5 px-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <Navigation className="h-3 w-3 text-slate-400" />
              <span>View on Map</span>
            </button>

            <button
              onClick={() => setShowHistoryModal(!showHistoryModal)}
              className="flex items-center justify-center gap-1.5 rounded border border-slate-800 bg-slate-900/80 py-1.5 px-2 text-[11px] font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition cursor-pointer"
            >
              <History className="h-3 w-3 text-slate-400" />
              <span>Trip History</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. SENSOR FEEDS & PERCEPTION                                             */}
        {/* ========================================================================= */}
        <div className="rounded border border-slate-800/80 bg-slate-900/40 p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sensor Feeds & Perception
            </span>
            <div className="flex gap-1">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500 text-black">
                Thermal
              </span>
            </div>
          </div>

          <div className="relative h-24 w-full rounded border border-slate-800 overflow-hidden bg-slate-950">
            <video
              ref={thermalVideoRef}
              src="/videos/thermal_feed.mp4"
              autoPlay
              muted
              playsInline
              disablePictureInPicture
              controls={false}
              preload="auto"
              style={{
                maxWidth: "none",
                width: "200%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "left center",
              }}
              className="absolute left-0 top-0 pointer-events-none select-none"
              onTimeUpdate={(e) => {
                if (e.currentTarget.currentTime >= 3.0) {
                  e.currentTarget.currentTime = 0;
                }
              }}
            />
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded bg-black/85 px-1.5 py-0.5 font-mono text-[8px] text-amber-400 border border-amber-500/30">
              <span className="h-1 w-1 rounded-full bg-amber-400 animate-ping" />
              <span>YOLOv8-TINYML: TRUCK DETECTED (8.2m)</span>
            </div>
          </div>
        </div>

        {/* Collapsible Trip History */}
        {showHistoryModal && (
          <div className="rounded border border-slate-800 bg-slate-950 p-2.5 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-300 font-bold border-b border-slate-800 pb-1">
              <span className="text-[11px]">Today&apos;s Haul Cycles</span>
              <span className="text-amber-400 font-mono text-[10px]">6 Completed</span>
            </div>
            <div className="space-y-1 text-[10px] text-slate-400 font-mono">
              <div className="flex justify-between">
                <span>Cycle #1 (07:15)</span>
                <span>North Pit → Crusher A (4.2 km)</span>
              </div>
              <div className="flex justify-between">
                <span>Cycle #2 (08:40)</span>
                <span>Bench 4 → Crusher B (4.6 km)</span>
              </div>
              <div className="flex justify-between">
                <span>Cycle #3 (10:10)</span>
                <span>East Pit → Waste Dump 1 (5.1 km)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
