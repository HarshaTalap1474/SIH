"use client";

import { create } from "zustand";
import {
  HEMMVehicle,
  FleetAlert,
  FleetKPIs,
  INITIAL_VEHICLES,
  RECENT_ALERTS,
  INITIAL_KPIS,
} from "./fleetData";
import { ROAD_NETWORKS, getRoutePositionAndHeading } from "./roadNetwork";
import {
  evaluateVehicleSafety,
  SAFETY_CONFIG,
} from "./safetyEngine";

interface FleetState {
  vehicles: HEMMVehicle[];
  alerts: FleetAlert[];
  kpis: FleetKPIs;
  selectedVehicleId: string | null;
  searchQuery: string;
  filterVehicleId: string; // "all" or specific vehicle ID
  activeNav: string;
  isDetailsOpen: boolean;
  offlineVehicleIds: string[];
  offlineCycleTimer: number;
  activeHazards: Record<string, string>; // vehicleId -> hazardKey

  // Actions
  selectVehicle: (id: string | null) => void;
  closeDetails: () => void;
  setSearchQuery: (query: string) => void;
  setFilterVehicleId: (id: string) => void;
  setActiveNav: (nav: string) => void;
  tickMovement: (deltaSec: number) => void;
  tickSimulation: () => void;
  setOfflineVehicles: (ids: string[]) => void;
}

// Initial offline vehicle selection (cycle 1: D-02 and D-07 are offline, D-11 and D-12 are online)
const INITIAL_OFFLINE_IDS = ["D-02", "D-07"];

// Prepare initial vehicles with offline status applied
const INITIAL_SETUP_VEHICLES: HEMMVehicle[] = INITIAL_VEHICLES.map((v) => {
  if (INITIAL_OFFLINE_IDS.includes(v.id)) {
    return {
      ...v,
      online: false,
      status: "offline",
      speed: 0,
      gear: "P",
      clearance: 0,
      ttc: 0,
      lastUpdated: "Connection lost",
      sensors: {
        ...v.sensors,
        esp32: "Disconnected",
        aiModel: "Idle",
      },
    };
  }
  return {
    ...v,
    online: true,
    gear: "D",
    lastUpdated: "Just now",
  };
});

export const useFleetStore = create<FleetState>((set, get) => ({
  vehicles: INITIAL_SETUP_VEHICLES,
  alerts: RECENT_ALERTS,
  kpis: {
    ...INITIAL_KPIS,
    totalDumpers: INITIAL_SETUP_VEHICLES.length,
    onlineDumpers: INITIAL_SETUP_VEHICLES.filter((v) => v.online).length,
    offlineDumpers: INITIAL_SETUP_VEHICLES.filter((v) => !v.online).length,
    criticalAlerts: 0,
    warningAlerts: 0,
    activeAlerts: 0,
  },
  selectedVehicleId: null,
  searchQuery: "",
  filterVehicleId: "all",
  activeNav: "Dashboard",
  isDetailsOpen: false,
  offlineVehicleIds: INITIAL_OFFLINE_IDS,
  offlineCycleTimer: 0,
  activeHazards: {
    "D-02": "Connection:Lost",
    "D-07": "Connection:Lost",
  },

  selectVehicle: (id: string | null) => {
    set({
      selectedVehicleId: id,
      isDetailsOpen: id !== null,
    });
  },

  closeDetails: () => {
    set({
      selectedVehicleId: null,
      isDetailsOpen: false,
    });
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setFilterVehicleId: (id: string) => {
    set({ filterVehicleId: id });
    if (id !== "all") {
      set({ selectedVehicleId: id, isDetailsOpen: true });
    }
  },
  setActiveNav: (nav: string) => set({ activeNav: nav }),

  setOfflineVehicles: (ids: string[]) => {
    set({ offlineVehicleIds: ids, offlineCycleTimer: 0 });
  },

  // Continuous frame-independent road network movement loop with realistic HEMM speed & curve slowdown
  // Evaluates dynamic vehicle safety, restricted-zone approach/entry, and vehicle proximity/TTC
  tickMovement: (deltaSec: number) => {
    const state = get();
    let { offlineVehicleIds, offlineCycleTimer, activeHazards, alerts } = state;
    const { vehicles } = state;
    let alertsUpdated = false;
    let newAlerts = [...alerts];
    const newActiveHazards = { ...activeHazards };

    // 1. OFFLINE SIMULATION CYCLE ROTATION (Configurable 60 - 120s interval, stable throughout)
    offlineCycleTimer += deltaSec;
    if (offlineCycleTimer >= SAFETY_CONFIG.OFFLINE_ROTATION_INTERVAL_SEC) {
      offlineCycleTimer = 0;

      // Randomly select 2 eligible vehicles from D-01 .. D-12 to become offline
      const allIds = vehicles.map((v) => v.id);
      const shuffled = [...allIds].sort(() => Math.random() - 0.5);
      const newlyOfflineIds = shuffled.slice(0, SAFETY_CONFIG.OFFLINE_VEHICLE_COUNT);

      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];

      // Add alert for newly offline vehicles
      newlyOfflineIds.forEach((id) => {
        if (!offlineVehicleIds.includes(id)) {
          const v = vehicles.find((veh) => veh.id === id);
          newAlerts.unshift({
            id: `alt-${Date.now()}-${id}`,
            time: timeStr,
            vehicleId: id,
            alertType: "Sensor",
            message: "Connection Lost — Telemetry link disconnected",
            severity: "Warning",
            zone: v?.zone || "Mine Haul Road",
          });
          newActiveHazards[id] = "Connection:Lost";
          alertsUpdated = true;
        }
      });

      // Clear connection hazard key for reconnected vehicles
      offlineVehicleIds.forEach((id) => {
        if (!newlyOfflineIds.includes(id)) {
          if (newActiveHazards[id] === "Connection:Lost") {
            delete newActiveHazards[id];
          }
        }
      });

      offlineVehicleIds = newlyOfflineIds;
    }

    // 2. POSITION & ROAD MOVEMENT UPDATE (Online vehicles follow roads; offline vehicles stay stationary)
    const SPEED_SCALE = 0.055;

    const movedVehicles: HEMMVehicle[] = vehicles.map((v) => {
      const isOffline = offlineVehicleIds.includes(v.id);

      if (isOffline) {
        // Truck is offline: freeze movement, preserve last known position, zero speed
        return {
          ...v,
          online: false,
          status: "offline" as const,
          speed: 0,
          gear: "P" as const,
          clearance: 0,
          ttc: 0,
          alertMessage: undefined,
          lastUpdated: "Connection lost",
          sensors: {
            ...v.sensors,
            esp32: "Disconnected" as const,
            aiModel: "Idle" as const,
          },
        };
      }

      // Truck is online: progress along its route
      if (!v.routeId) {
        return {
          ...v,
          online: true,
          gear: "D" as const,
        };
      }

      const route = ROAD_NETWORKS[v.routeId];
      if (!route || route.totalLength === 0) return { ...v, online: true };

      // Progress along route using current modulated speed
      const effectiveSpeed = v.speed || v.baseSpeed || 8.0;
      const progressDelta = (effectiveSpeed * deltaSec * SPEED_SCALE) / route.totalLength;
      const newProgress = (((v.routeProgress ?? 0) + progressDelta) % 1.0 + 1.0) % 1.0;

      // Calculate new position, smooth heading, and curve-dependent speed modulation
      const nextPos = getRoutePositionAndHeading(
        v.routeId,
        newProgress,
        v.heading,
        v.speed,
        v.baseSpeed || 8.0,
        v.status,
        deltaSec
      );

      // Realistic GPS latitude and longitude mapped to Bailadila mine geography
      const newLat = +(18.6200 + (100 - nextPos.y) * 0.00015).toFixed(4);
      const newLon = +(73.8000 + nextPos.x * 0.00018).toFixed(4);

      // Distance accumulation (speed in km/h * time in hours)
      const distIncr = (nextPos.speed * deltaSec) / 3600;
      const newDist = +(v.distanceToday + distIncr).toFixed(3);

      return {
        ...v,
        online: true,
        gear: "D" as const,
        speed: nextPos.speed,
        mapX: nextPos.x,
        mapY: nextPos.y,
        heading: nextPos.heading,
        latitude: newLat,
        longitude: newLon,
        routeProgress: newProgress,
        currentSegment: nextPos.segmentIndex,
        progressAlongSegment: nextPos.progressAlongSegment,
        distanceToday: newDist,
        lastUpdated: "Just now",
        sensors: {
          ...v.sensors,
          esp32: "Connected" as const,
          aiModel: "Running" as const,
        },
      };
    });

    // 3. DYNAMIC STATUS & SAFETY EVALUATION
    // Restricted zone polygon checking and vehicle-to-vehicle proximity detection
    const fullyResolvedVehicles: HEMMVehicle[] = movedVehicles.map((v) => {
      if (!v.online || v.status === "offline") return v;

      const safety = evaluateVehicleSafety(v, movedVehicles);
      const hazardKey =
        safety.status !== "online" && safety.alertType && safety.severity
          ? `${safety.alertType}:${safety.severity}`
          : "Normal";

      // Detect transition to new or meaningfully changed hazard
      const prevHazard = newActiveHazards[v.id];
      if (hazardKey !== "Normal" && hazardKey !== prevHazard) {
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];

        newAlerts.unshift({
          id: `alt-${Date.now()}-${v.id}`,
          time: timeStr,
          vehicleId: v.id,
          alertType: safety.alertType || "Proximity",
          message: safety.alertMessage || "Hazard condition active",
          severity: safety.severity || "Warning",
          zone: v.zone,
        });
        newActiveHazards[v.id] = hazardKey;
        alertsUpdated = true;
      } else if (hazardKey === "Normal" && prevHazard && prevHazard !== "Connection:Lost") {
        // Hazard cleared: remove active hazard key so future hazard can trigger alert
        delete newActiveHazards[v.id];
      }

      return {
        ...v,
        status: safety.status,
        alertMessage: safety.alertMessage,
        clearance: safety.clearance,
        ttc: safety.ttc,
      };
    });

    // Retain reasonable alert history length
    if (newAlerts.length > 25) {
      newAlerts = newAlerts.slice(0, 25);
    }

    // 4. DYNAMIC FLEET KPI CALCULATION
    const onlineCount = fullyResolvedVehicles.filter((v) => v.online).length;
    const offlineCount = fullyResolvedVehicles.filter((v) => !v.online).length;
    const criticalCount = fullyResolvedVehicles.filter(
      (v) => v.online && v.status === "critical"
    ).length;
    const warningCount = fullyResolvedVehicles.filter(
      (v) => v.online && v.status === "warning"
    ).length;
    const activeAlertsCount = criticalCount + warningCount;

    const totalDist = +fullyResolvedVehicles
      .reduce((acc, v) => acc + v.distanceToday, 0)
      .toFixed(1);
    const movingVehicles = fullyResolvedVehicles.filter((v) => v.online && v.speed > 0);
    const avgSpeed = +(
      movingVehicles.reduce((acc, v) => acc + v.speed, 0) / (movingVehicles.length || 1)
    ).toFixed(1);

    const speedLimitStatus: FleetKPIs["speedLimitStatus"] =
      avgSpeed > 22 ? "Exceeded" : avgSpeed > 16 ? "Approaching Limit" : "Within Limit";

    set({
      vehicles: fullyResolvedVehicles,
      alerts: alertsUpdated ? newAlerts : state.alerts,
      activeHazards: newActiveHazards,
      offlineVehicleIds,
      offlineCycleTimer,
      kpis: {
        ...state.kpis,
        totalDumpers: fullyResolvedVehicles.length,
        onlineDumpers: onlineCount,
        offlineDumpers: offlineCount,
        criticalAlerts: criticalCount,
        warningAlerts: warningCount,
        activeAlerts: activeAlertsCount,
        totalDistanceToday: totalDist,
        avgSpeed: avgSpeed,
        speedLimitStatus: speedLimitStatus,
      },
    });
  },

  // Periodic subtle telemetry fluctuation loop (every 3.5s)
  tickSimulation: () => {
    // Dynamic values are already continuously computed with physics accuracy in tickMovement.
    // tickSimulation ensures timestamp freshness.
    const { vehicles } = get();
    const updated = vehicles.map((v) => {
      if (!v.online || v.status === "offline") return v;
      return {
        ...v,
        lastUpdated: "Just now",
      };
    });
    set({ vehicles: updated });
  },
}));
