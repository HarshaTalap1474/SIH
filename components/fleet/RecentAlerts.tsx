"use client";

import { AlertTriangle, ShieldAlert, AlertCircle, Info, ChevronRight } from "lucide-react";
import { useFleetStore } from "@/lib/fleetStore";
import { FleetAlert } from "@/lib/fleetData";

export function RecentAlerts() {
  const { alerts, selectVehicle, selectedVehicleId } = useFleetStore();

  const getSeverityBadge = (severity: FleetAlert["severity"]) => {
    switch (severity) {
      case "Critical":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.2 text-[10px] font-bold text-rose-300">
            <ShieldAlert className="h-3 w-3 text-rose-400" />
            Critical
          </span>
        );
      case "Warning":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            Warning
          </span>
        );
      case "Info":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-950/80 border border-blue-500/40 px-1.5 py-0.2 text-[10px] font-bold text-blue-300">
            <Info className="h-3 w-3 text-blue-400" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0a0f18] p-3.5 shadow-md">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Recent Alerts
          </h3>
        </div>
        <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
          {alerts.length} Events
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="py-2 px-2.5">Time</th>
              <th className="py-2 px-2.5">Dumper</th>
              <th className="py-2 px-2.5">Alert Type</th>
              <th className="py-2 px-2.5">Message</th>
              <th className="py-2 px-2.5">Severity</th>
              <th className="py-2 px-2.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {alerts.map((alert) => {
              const isSelected = selectedVehicleId === alert.vehicleId;
              return (
                <tr
                  key={alert.id}
                  onClick={() => selectVehicle(alert.vehicleId)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-amber-500/10"
                      : "hover:bg-slate-900/60"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") selectVehicle(alert.vehicleId);
                  }}
                >
                  <td className="py-2 px-2.5 text-slate-400 whitespace-nowrap">
                    {alert.time}
                  </td>
                  <td className="py-2 px-2.5">
                    <span className="rounded bg-slate-900 border border-slate-800 px-1.5 py-0.5 font-bold text-white">
                      {alert.vehicleId}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 font-sans font-medium text-slate-200 whitespace-nowrap">
                    {alert.alertType}
                  </td>
                  <td className="py-2 px-2.5 font-sans text-slate-300 max-w-xs truncate">
                    {alert.message}
                  </td>
                  <td className="py-2 px-2.5 whitespace-nowrap">
                    {getSeverityBadge(alert.severity)}
                  </td>
                  <td className="py-2 px-2.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectVehicle(alert.vehicleId);
                      }}
                      className="inline-flex items-center gap-1 text-[10px] font-sans font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                    >
                      <span>Inspect</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
