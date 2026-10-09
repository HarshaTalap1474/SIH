"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useFleetStore } from "@/lib/fleetStore";
import FleetDashboardPage from "../../page";

export default function VehicleSelectedPage() {
  const params = useParams();
  const vehicleId = params?.vehicleId as string;
  const selectVehicle = useFleetStore((s) => s.selectVehicle);

  useEffect(() => {
    if (vehicleId) {
      selectVehicle(vehicleId);
    }
  }, [vehicleId, selectVehicle]);

  return <FleetDashboardPage />;
}
