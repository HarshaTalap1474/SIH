"use client";

import {
  LayoutDashboard,
  Truck,
  Radio,
  AlertTriangle,
  BarChart3,
  MapPin,
  FileText,
  Cpu,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useFleetStore } from "@/lib/fleetStore";
import { useState } from "react";

export const NAV_ITEMS = [
  { id: "Dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "Fleet", label: "Fleet", icon: Truck },
  { id: "Live Tracking", label: "Live Tracking", icon: Radio },
  { id: "Alerts", label: "Alerts", icon: AlertTriangle, badge: "3" },
  { id: "Analytics", label: "Analytics", icon: BarChart3 },
  { id: "Geofencing", label: "Geofencing", icon: MapPin },
  { id: "Reports", label: "Reports", icon: FileText },
  { id: "Device Management", label: "Device Management", icon: Cpu },
  { id: "User Management", label: "User Management", icon: Users },
  { id: "Settings", label: "Settings", icon: Settings },
];

export function FleetSidebar() {
  const { activeNav, setActiveNav } = useFleetStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      data-tour="fleet-sidebar"
      className={`relative flex flex-col border-r border-slate-800 bg-[#090d16] transition-all duration-200 z-30 shrink-0 ${
        collapsed ? "w-14" : "w-52"
      }`}
    >
      {/* Navigation Links */}
      <div className="flex-1 py-3 px-1.5 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-slate-900 text-amber-400 border-l-2 border-amber-500 font-semibold"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-l-2 border-transparent"
              } ${collapsed ? "justify-center px-1" : ""}`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? "text-amber-400" : "text-slate-400"
                }`}
              />
              {!collapsed && (
                <span className="flex-1 text-left truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="rounded bg-rose-950/80 border border-rose-500/40 px-1.5 py-0.2 text-[9px] font-bold text-rose-300">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mine Location Info */}
      {!collapsed && (
        <div className="p-2.5 mx-1.5 mb-2 rounded border border-slate-800 bg-slate-950 text-[11px]">
          <div className="flex items-center justify-between text-slate-400 mb-0.5">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500">
              Mine Sector
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <p className="font-semibold text-slate-200 truncate">Western Pit 4</p>
          <p className="text-[10px] text-slate-500 font-mono">18.6274°N, 73.8061°E</p>
        </div>
      )}

      {/* Collapse Toggle */}
      <div className="p-1.5 border-t border-slate-800 flex items-center justify-end">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-full items-center justify-center rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
  );
}
