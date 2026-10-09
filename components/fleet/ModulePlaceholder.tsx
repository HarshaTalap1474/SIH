"use client";

import { useFleetStore } from "@/lib/fleetStore";
import {
  ArrowLeft,
  Clock,
  ShieldAlert,
  Cpu,
  BarChart3,
  MapPin,
  FileText,
  Settings,
  Users,
  Radio,
  Truck,
} from "lucide-react";

export function ModulePlaceholder() {
  const { activeNav, setActiveNav } = useFleetStore();

  const renderModuleIcon = (nav: string) => {
    const iconClass = "h-8 w-8 text-amber-400";
    switch (nav) {
      case "Fleet":
        return <Truck className={iconClass} />;
      case "Live Tracking":
        return <Radio className={iconClass} />;
      case "Alerts":
        return <ShieldAlert className={iconClass} />;
      case "Analytics":
        return <BarChart3 className={iconClass} />;
      case "Geofencing":
        return <MapPin className={iconClass} />;
      case "Reports":
        return <FileText className={iconClass} />;
      case "Device Management":
        return <Cpu className={iconClass} />;
      case "User Management":
        return <Users className={iconClass} />;
      case "Settings":
        return <Settings className={iconClass} />;
      default:
        return <Clock className={iconClass} />;
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[480px]">
      <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/80 mb-4">
        {renderModuleIcon(activeNav)}
      </div>

      <span className="rounded bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2">
        Operational Module Under Deployment
      </span>

      <h2 className="text-xl font-bold text-white tracking-tight mb-2">
        {activeNav} Module
      </h2>

      <p className="max-w-md text-xs text-slate-400 leading-relaxed mb-5">
        The <strong className="text-slate-200">{activeNav}</strong> service is being linked to the central HEMM telemetry bus. Real-time fleet tracking and safety metrics are live on the primary Dashboard.
      </p>

      <button
        onClick={() => setActiveNav("Dashboard")}
        className="flex items-center gap-2 rounded-md bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition border border-slate-700 cursor-pointer"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Return to Fleet Dashboard</span>
      </button>
    </div>
  );
}
