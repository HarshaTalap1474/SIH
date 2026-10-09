"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import {
  ZoomIn,
  ZoomOut,
  Crosshair,
  Layers,
  Maximize2,
  Minimize2,
  ChevronDown,
  AlertOctagon,
  Search,
} from "lucide-react";
import { useFleetStore } from "@/lib/fleetStore";
import { VehicleMarker } from "./VehicleMarker";

export function FleetMap() {
  const {
    vehicles,
    selectedVehicleId,
    selectVehicle,
    filterVehicleId,
    setFilterVehicleId,
    searchQuery,
    setSearchQuery,
  } = useFleetStore();

  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showRoadsOverlay, setShowRoadsOverlay] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // High-performance continuous animation loop (60 FPS, frame-independent via deltaSec)
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const frame = (now: number) => {
      const deltaSec = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update positions along road network
      useFleetStore.getState().tickMovement(deltaSec);

      animId = requestAnimationFrame(frame);
    };

    animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, []);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.0));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.9));
  };

  const handleCenter = () => {
    setZoomLevel(1);
  };

  // Exit fullscreen on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Filter vehicles based on dropdown or search
  const filteredVehicles = vehicles.filter((v) => {
    if (filterVehicleId !== "all" && v.id !== filterVehicleId) return false;
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        v.id.toLowerCase().includes(q) ||
        v.name.toLowerCase().includes(q) ||
        v.zone.toLowerCase().includes(q) ||
        v.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <>
      {/* Dark backdrop behind fullscreen map */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/75 z-50 backdrop-blur-[1px] animate-in fade-in duration-150"
          onClick={() => setIsFullscreen(false)}
          aria-hidden="true"
        />
      )}
      <div
        ref={mapContainerRef}
        data-tour="fleet-map"
        className={`rounded-lg border border-slate-800 bg-[#070b12] overflow-hidden shadow-lg transition-all duration-200 ${
          isFullscreen
            ? "fixed inset-2 sm:inset-3.5 z-[55] shadow-2xl flex flex-col"
            : "relative w-full h-[440px] sm:h-[480px] lg:h-[540px] xl:h-[600px] 2xl:h-[650px]"
        }`}
      >
      {/* ========================================================================= */}
      {/* 1. TOP OVERLAY BAR: Search Input + All Dumpers Dropdown + North Compass  */}
      {/* ========================================================================= */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between gap-2.5 pointer-events-none">
        {/* Search bar over map */}
        <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-slate-700/80 bg-slate-900/95 px-3 py-1.5 shadow-md w-64 sm:w-72">
          <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search dumper, location, alert..."
            className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-slate-400 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>

        {/* Top Right Controls: All Dumpers Dropdown & North Indicator */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Dropdown */}
          <div className="relative">
            <select
              value={filterVehicleId}
              onChange={(e) => setFilterVehicleId(e.target.value)}
              className="appearance-none rounded-md border border-slate-700/80 bg-slate-900/95 py-1.5 pl-3 pr-7 text-xs font-semibold text-white shadow hover:border-slate-600 focus:outline-none cursor-pointer"
            >
              <option value="all">All Dumpers</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} — {v.status.toUpperCase()}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          {/* North Indicator */}
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-700/80 bg-slate-900/95 text-slate-300 shadow"
            title="Grid North"
          >
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-rose-500 leading-none">▲</span>
              <span className="text-[9px] font-mono font-bold leading-none text-slate-200">N</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LEFT TOOLBAR: Zoom +, Zoom -, Center, Layer, Fullscreen               */}
      {/* ========================================================================= */}
      <div className="absolute left-2.5 top-14 z-30 flex flex-col gap-1 rounded-md border border-slate-800 bg-slate-900/90 p-1 shadow">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <div className="h-[1px] bg-slate-800 my-0.5" />
        <button
          onClick={handleCenter}
          title="Center / Reset Map"
          className="flex h-7 w-7 items-center justify-center rounded text-slate-300 hover:bg-slate-800 hover:text-white transition"
        >
          <Crosshair className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setShowRoadsOverlay(!showRoadsOverlay)}
          title={showRoadsOverlay ? "Hide Haul Road Overlay" : "Show Haul Road Overlay"}
          className={`flex h-7 w-7 items-center justify-center rounded transition ${
            showRoadsOverlay ? "text-amber-400 bg-amber-500/15" : "text-slate-400 hover:bg-slate-800"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          className={`flex h-7 w-7 items-center justify-center rounded transition cursor-pointer ${
            isFullscreen
              ? "text-amber-400 bg-amber-500/20 hover:bg-amber-500/30"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. INTERACTIVE MAP VIEWPORT (Pan / Zoomable)                             */}
      {/* ========================================================================= */}
      <div className="relative h-full w-full overflow-hidden select-none">
        <div
          className="relative h-full w-full transition-transform duration-200 ease-out origin-center"
          style={{
            transform: `scale(${zoomLevel})`,
          }}
        >
          {/* Base Aerial Satellite Texture: High-Resolution Bailadila Mine Imagery */}
          <div className="absolute inset-0">
            <Image
              src="/images/bailadila_satellite_map.jpg"
              alt="Bailadila Iron Ore Mine Aerial Satellite Topography"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="w-full h-full object-fill brightness-100 contrast-105"
            />
            {/* Subtle dark vignette overlay */}
            <div className="absolute inset-0 bg-radial from-transparent via-[#090d16]/10 to-[#090d16]/60 pointer-events-none" />
          </div>

          {/* SVG Vector Overlays: Restricted Zone Geofence */}
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
          >
            {/* RESTRICTED ZONE GEOFENCE POLYGON (Deposit 5 Blasting / Hazard Zone around D-03) */}
            {showRoadsOverlay && (
              <g id="restricted-zone-group">
                <polygon
                  points="685,90 740,90 805,110 815,165 750,165 685,115"
                  fill="rgba(239, 68, 68, 0.18)"
                  stroke="#ef4444"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <line x1="695" y1="105" x2="805" y2="155" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.25" />
                <line x1="715" y1="92" x2="795" y2="165" stroke="#ef4444" strokeWidth="1" strokeOpacity="0.25" />
              </g>
            )}
          </svg>

          {/* Restricted Zone Callout Tag on Map */}
          <div
            className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-1/2"
            style={{ left: "75%", top: "15%" }}
          >
            <div className="flex items-center gap-1 rounded border border-red-500/50 bg-red-950/90 px-2 py-0.5 text-[9px] font-bold text-red-300 shadow tracking-wider uppercase">
              <AlertOctagon className="h-2.5 w-2.5 text-red-400" />
              <span>RESTRICTED ZONE</span>
            </div>
          </div>

          {/* VEHICLE MARKERS */}
          {filteredVehicles.map((vehicle) => (
            <VehicleMarker
              key={vehicle.id}
              vehicle={vehicle}
              isSelected={selectedVehicleId === vehicle.id}
              onSelect={(id) => selectVehicle(id)}
            />
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. BOTTOM BAR: Scale Bar + Map Status Legend                             */}
      {/* ========================================================================= */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 z-30 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none">
        {/* Scale Indicator */}
        <div className="pointer-events-auto flex items-center gap-2 rounded border border-slate-800 bg-slate-950/85 px-2.5 py-1 text-[10px] font-mono text-slate-300 shadow">
          <div className="flex flex-col items-center">
            <div className="flex items-center w-20 h-0.5 border-x border-b border-slate-300">
              <div className="w-10 h-0.5 border-r border-slate-400" />
            </div>
            <div className="flex justify-between w-20 text-[8px] text-slate-400 mt-0.5">
              <span>0</span>
              <span>500 m</span>
              <span>1 km</span>
            </div>
          </div>
        </div>

        {/* Status Legend (Online, Warning, Critical, Offline) */}
        <div className="pointer-events-auto flex items-center gap-3 rounded border border-slate-800 bg-slate-950/85 px-3 py-1 text-[11px] font-medium text-slate-300 shadow">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span>Warning</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-slate-500" />
            <span>Offline</span>
          </div>
        </div>
      </div>
    </div>
  </>
);
}
