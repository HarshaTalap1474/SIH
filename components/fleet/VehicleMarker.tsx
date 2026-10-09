"use client";

import { useState } from "react";
import { Truck } from "lucide-react";
import { HEMMVehicle } from "@/lib/fleetData";

interface VehicleMarkerProps {
  vehicle: HEMMVehicle;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function VehicleMarker({ vehicle, isSelected, onSelect }: VehicleMarkerProps) {
  const [hovered, setHovered] = useState(false);

  // Restrained status colors for industrial map
  const colorMap = {
    online: {
      markerBg: "bg-emerald-600 border-emerald-400 text-white",
      dot: "bg-emerald-400",
      badge: "border-emerald-500/40 text-emerald-300",
      pulse: "bg-emerald-400",
    },
    warning: {
      markerBg: "bg-amber-600 border-amber-400 text-white",
      dot: "bg-amber-400",
      badge: "border-amber-500/40 text-amber-300",
      pulse: "bg-amber-400",
    },
    critical: {
      markerBg: "bg-rose-600 border-rose-400 text-white",
      dot: "bg-rose-400",
      badge: "border-rose-500/40 text-rose-300",
      pulse: "bg-rose-400",
    },
    offline: {
      markerBg: "bg-slate-700 border-slate-500 text-slate-300",
      dot: "bg-slate-500",
      badge: "border-slate-600 text-slate-400",
      pulse: "bg-transparent",
    },
  };

  const style = colorMap[vehicle.status] || colorMap.online;

  return (
    <div
      data-tour={vehicle.id === "D-03" ? "vehicle-marker-d03" : undefined}
      data-vehicle-id={vehicle.id}
      style={{
        left: `${vehicle.mapX}%`,
        top: `${vehicle.mapY}%`,
      }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer select-none group"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(vehicle.id);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Select ${vehicle.name} - Status: ${vehicle.status}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(vehicle.id);
        }
      }}
    >
      {/* Selected Vehicle Emphasis Ring */}
      {isSelected && (
        <span className="absolute -inset-1.5 rounded-full border-2 border-white/80 animate-pulse pointer-events-none" />
      )}

      {/* Main Circular Marker Puck */}
      <div
        className={`relative flex items-center justify-center h-7 w-7 rounded-full border shadow-md transition-transform duration-150 ${
          style.markerBg
        } ${isSelected ? "scale-115 ring-2 ring-white" : "hover:scale-110"}`}
      >
        {/* Dynamic Truck Icon rotated towards travel heading */}
        <Truck
          className="h-3.5 w-3.5 transition-transform duration-100 ease-out"
          style={{
            transform: vehicle.online && vehicle.speed > 0
              ? `rotate(${vehicle.heading - 90}deg)`
              : undefined,
          }}
        />

        {/* Directional Heading Pointer Triangle on Rim */}
        {vehicle.online && vehicle.speed > 0 && (
          <div
            className="absolute inset-0 pointer-events-none flex items-start justify-center transition-transform duration-100 ease-out"
            style={{
              transform: `rotate(${vehicle.heading}deg)`,
            }}
          >
            <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-white -mt-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]" />
          </div>
        )}
      </div>

      {/* Unit ID Badge */}
      <div
        className={`mt-1 px-1.5 py-0.2 rounded bg-slate-950/90 border text-[9px] font-mono font-bold text-center transition-all whitespace-nowrap shadow ${
          style.badge
        } ${isSelected ? "ring-1 ring-white" : ""}`}
      >
        {vehicle.id}
      </div>

      {/* Hover / Selected Tooltip */}
      {(hovered || isSelected) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded border border-slate-700 bg-slate-950/95 p-2 text-xs shadow-xl pointer-events-none z-40">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1 mb-1">
            <span className="font-bold text-white text-[11px]">{vehicle.name}</span>
            <span className="flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
              <span className="capitalize text-[10px] text-slate-300 font-semibold">
                {vehicle.status}
              </span>
            </span>
          </div>
          <div className="space-y-0.5 text-[10px] text-slate-300 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Speed:</span>
              <span className="text-white">{vehicle.speed} km/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Clearance:</span>
              <span className="text-white">{vehicle.clearance} m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zone:</span>
              <span className="text-amber-300 truncate max-w-[90px]">{vehicle.zone}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
