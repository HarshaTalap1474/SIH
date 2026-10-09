"use client";

import { useEffect } from "react";
import { FleetHeader } from "@/components/fleet/FleetHeader";
import { FleetSidebar } from "@/components/fleet/FleetSidebar";
import { KpiCard } from "@/components/fleet/KpiCard";
import { FleetMap } from "@/components/fleet/FleetMap";
import { VehicleDetailsPanel } from "@/components/fleet/VehicleDetailsPanel";
import { RecentAlerts } from "@/components/fleet/RecentAlerts";
import { FleetUtilization } from "@/components/fleet/FleetUtilization";
import { ProductivityChart } from "@/components/fleet/ProductivityChart";
import { ModulePlaceholder } from "@/components/fleet/ModulePlaceholder";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useFleetStore } from "@/lib/fleetStore";

export default function FleetDashboardPage() {
  const selectedVehicle = useFleetStore((s) =>
    s.selectedVehicleId ? s.vehicles.find((v) => v.id === s.selectedVehicleId) || null : null
  );
  const isDetailsOpen = useFleetStore((s) => s.isDetailsOpen);
  const closeDetails = useFleetStore((s) => s.closeDetails);
  const activeNav = useFleetStore((s) => s.activeNav);
  const tickSimulation = useFleetStore((s) => s.tickSimulation);

  // Real-time data simulation loop (subtle updates every 3.5s)
  useEffect(() => {
    const interval = setInterval(() => {
      tickSimulation();
    }, 3500);
    return () => clearInterval(interval);
  }, [tickSimulation]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#070b12] text-slate-100 font-sans select-none">
      {/* 1. TOP HEADER */}
      <FleetHeader />

      {/* 2. MAIN LAYOUT SPLIT: Sidebar + Content */}
      <div className="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Left Navigation Sidebar */}
        <FleetSidebar />

        {/* Dynamic View Container */}
        {activeNav !== "Dashboard" ? (
          <main className="flex-1 overflow-y-auto bg-[#070b12]">
            <ModulePlaceholder />
          </main>
        ) : (
          <main className="flex-1 flex overflow-hidden bg-[#070b12] relative">
            {/* Dashboard Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-2.5 sm:p-3 lg:p-3.5 space-y-2.5">
              {/* TOP: COMPACT 5 KPI CARDS (Single row on desktop) */}
              <KpiCard />

              {/* HERO: LIVE MINE MAP */}
              <FleetMap />

              {/* LOWER DASHBOARD: Recent Alerts (Left) + Utilization & Productivity (Right) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5 pb-4">
                {/* Recent Alerts Table (7 cols on XL) */}
                <div className="xl:col-span-7">
                  <RecentAlerts />
                </div>

                {/* Charts Column (5 cols on XL) */}
                <div className="xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2.5">
                  <FleetUtilization />
                  <ProductivityChart />
                </div>
              </div>
            </div>

            {/* RIGHT SIDE VEHICLE DETAILS DRAWER */}
            {isDetailsOpen && selectedVehicle && (
              <>
                {/* Backdrop on tablet / mobile */}
                <div
                  className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                  onClick={closeDetails}
                  aria-hidden="true"
                />
                <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[410px] lg:relative lg:inset-auto lg:z-auto lg:w-auto p-2 lg:p-3 lg:pl-0 h-full flex shrink-0">
                  <VehicleDetailsPanel
                    vehicle={selectedVehicle}
                    onClose={closeDetails}
                  />
                </div>
              </>
            )}
          </main>
        )}
      </div>

      {/* 3. PRODUCT TOUR & ONBOARDING OVERLAY */}
      <OnboardingTour />
    </div>
  );
}