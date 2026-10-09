// Centralized Safety & Dynamics Engine for WEBUILDZ Fleet Dashboard
// Strictly calibrated to Bailadila mine satellite haul road geometry
// Provides dynamic status calculation, point-in-polygon restricted zone detection,
// and physics-based vehicle-to-vehicle proximity & Time-to-Collision (TTC) alerts.

import { HEMMVehicle, VehicleStatus } from "./fleetData";
import { ROAD_NETWORKS, RoadWaypoint } from "./roadNetwork";

// =========================================================================
// 1. RESTRICTED ZONE GEOFENCE POLYGON
// Matches exactly the SVG polygon displayed in FleetMap.tsx:
// viewBox="0 0 1000 600", points="685,90 740,90 805,110 815,165 750,165 685,115"
// Normalized coordinates: (x / 10, y / 6) %
// =========================================================================
export const RESTRICTED_ZONE_POLYGON: RoadWaypoint[] = [
  { x: 68.5, y: 15.0 },     // 685, 90
  { x: 74.0, y: 15.0 },     // 740, 90
  { x: 80.5, y: 18.333 },   // 805, 110
  { x: 81.5, y: 27.5 },     // 815, 165
  { x: 75.0, y: 27.5 },     // 750, 165
  { x: 68.5, y: 19.167 },   // 685, 115
];

export const MAP_ASPECT_RATIO = 1024 / 572; // ~1.7902
export const SCALE_METERS = 32.0;

// Configurable Prototype Safety Thresholds
export const SAFETY_CONFIG = {
  // Restricted Zone
  ZONE_APPROACH_WARNING_METERS: 60.0, // Distance to boundary triggering WARNING
  ZONE_SAFE_HYSTERESIS_METERS: 75.0,   // Clearance required to exit WARNING
  
  // Vehicle-to-Vehicle Proximity
  PROXIMITY_NORMAL_METERS: 30.0,      // Separation > 30m: Normal
  PROXIMITY_WARNING_METERS: 30.0,     // Separation 15-30m: Warning
  PROXIMITY_CRITICAL_METERS: 15.0,    // Separation < 15m: Critical
  PROXIMITY_SAFE_HYSTERESIS_METERS: 35.0, // Clearance required to exit Warning/Critical
  
  // Time-to-Collision (TTC)
  TTC_CRITICAL_SECONDS: 6.0,          // Closing with TTC < 6s triggers Critical
  TTC_WARNING_SECONDS: 12.0,          // Closing with TTC < 12s triggers Warning

  // Offline Simulation
  OFFLINE_ROTATION_INTERVAL_SEC: 75,  // Configurable 60-120 seconds cycle
  OFFLINE_VEHICLE_COUNT: 2,           // 2 vehicles offline per cycle
};

// =========================================================================
// 2. GEOMETRIC FUNCTIONS
// =========================================================================

/**
 * Standard ray-casting point-in-polygon algorithm
 * Determines if a truck's (mapX, mapY) is strictly inside the restricted zone
 */
export function isPointInPolygon(
  px: number,
  py: number,
  poly: RoadWaypoint[] = RESTRICTED_ZONE_POLYGON
): boolean {
  let inside = false;
  const n = poly.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates distance from point (px, py) to nearest segment of polygon in calibrated meters
 */
export function distanceToPolygonBoundary(
  px: number,
  py: number,
  poly: RoadWaypoint[] = RESTRICTED_ZONE_POLYGON
): number {
  let minDist = Infinity;
  const n = poly.length;

  for (let i = 0; i < n; i++) {
    const p1 = poly[i];
    const p2 = poly[(i + 1) % n];

    const dx = (p2.x - p1.x) * MAP_ASPECT_RATIO;
    const dy = p2.y - p1.y;
    const segLenSq = dx * dx + dy * dy;

    let t = 0;
    if (segLenSq > 0) {
      const dpx = (px - p1.x) * MAP_ASPECT_RATIO;
      const dpy = py - p1.y;
      t = Math.max(0, Math.min(1, (dpx * dx + dpy * dy) / segLenSq));
    }

    const projX = p1.x + t * (p2.x - p1.x);
    const projY = p1.y + t * (p2.y - p1.y);

    const diffX = (px - projX) * MAP_ASPECT_RATIO;
    const diffY = py - projY;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY);

    if (dist < minDist) minDist = dist;
  }

  return minDist * SCALE_METERS;
}

/**
 * Calculates physical separation distance in meters between two map coordinates
 */
export function calculateSeparationMeters(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const dx = (p2.x - p1.x) * MAP_ASPECT_RATIO;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy) * SCALE_METERS;
}

/**
 * Calculates distance from point (px, py) to a route in calibrated meters
 */
export function distanceToRoute(
  px: number,
  py: number,
  waypoints: RoadWaypoint[]
): number {
  let minDist = Infinity;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const p1 = waypoints[i];
    const p2 = waypoints[i + 1];

    const dx = (p2.x - p1.x) * MAP_ASPECT_RATIO;
    const dy = p2.y - p1.y;
    const segLenSq = dx * dx + dy * dy;

    let t = 0;
    if (segLenSq > 0) {
      const dpx = (px - p1.x) * MAP_ASPECT_RATIO;
      const dpy = py - p1.y;
      t = Math.max(0, Math.min(1, (dpx * dx + dpy * dy) / segLenSq));
    }

    const projX = p1.x + t * (p2.x - p1.x);
    const projY = p1.y + t * (p2.y - p1.y);

    const diffX = (px - projX) * MAP_ASPECT_RATIO;
    const diffY = py - projY;
    const dist = Math.sqrt(diffX * diffX + diffY * diffY) * SCALE_METERS;

    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

/**
 * Checks whether two trucks are on the same haul road or connected road corridor
 * Prevents false alerts across different terraces/elevations that may visually appear nearby
 */
export function areVehiclesOnSameOrConnectedCorridor(
  vA: HEMMVehicle,
  vB: HEMMVehicle
): boolean {
  if (!vA.routeId || !vB.routeId) return false;

  // Exact same route: definitely on the same road
  if (vA.routeId === vB.routeId) return true;

  const routeA = ROAD_NETWORKS[vA.routeId];
  const routeB = ROAD_NETWORKS[vB.routeId];
  if (!routeA || !routeB) return false;

  // Check if Truck B is on Route A's path (within 14m road width corridor)
  const distBToRouteA = distanceToRoute(vB.mapX, vB.mapY, routeA.waypoints);
  // Check if Truck A is on Route B's path
  const distAToRouteB = distanceToRoute(vA.mapX, vA.mapY, routeB.waypoints);

  // If both vehicles lie along the shared road section, they share the corridor
  if (distBToRouteA < 16.0 && distAToRouteB < 16.0) {
    return true;
  }

  // Connected road junctions: if separation is close (< 24m) and both are near an intersection
  const directSep = calculateSeparationMeters(
    { x: vA.mapX, y: vA.mapY },
    { x: vB.mapX, y: vB.mapY }
  );
  if (directSep < 24.0 && (distBToRouteA < 20.0 || distAToRouteB < 20.0)) {
    return true;
  }

  return false;
}

/**
 * Physics-based Closing Speed and Time-to-Collision (TTC) calculator
 * Accounts for vehicle velocity vectors, heading angle, and separation
 */
export function calculateClosingSpeedAndTTC(
  vA: HEMMVehicle,
  vB: HEMMVehicle
): {
  distance: number;
  closingSpeedMs: number;
  closingSpeedKmh: number;
  ttcSec: number;
  isClosing: boolean;
} {
  const rx = (vB.mapX - vA.mapX) * MAP_ASPECT_RATIO * SCALE_METERS;
  const ry = (vB.mapY - vA.mapY) * SCALE_METERS;
  const distance = Math.sqrt(rx * rx + ry * ry);

  if (distance < 0.001) {
    return {
      distance: 0,
      closingSpeedMs: 0,
      closingSpeedKmh: 0,
      ttcSec: 0,
      isClosing: true,
    };
  }

  // Heading angles in radians (0 = North, 90 = East, 180 = South, 270 = West)
  const radA = (vA.heading * Math.PI) / 180;
  const radB = (vB.heading * Math.PI) / 180;

  // Speed in meters per second
  const speedMsA = ((vA.speed || 0) * 5) / 18;
  const speedMsB = ((vB.speed || 0) * 5) / 18;

  const vAx = speedMsA * Math.sin(radA);
  const vAy = -speedMsA * Math.cos(radA);
  const vBx = speedMsB * Math.sin(radB);
  const vBy = -speedMsB * Math.cos(radB);

  // Relative velocity vector of B relative to A
  const vRelX = vBx - vAx;
  const vRelY = vBy - vAy;

  // Closing speed is negative derivative of distance
  const closingSpeedMs = -(rx * vRelX + ry * vRelY) / distance;
  const closingSpeedKmh = closingSpeedMs * 3.6;

  // Closing if speed rate is positive (vehicles getting closer)
  const isClosing = closingSpeedMs > 0.1; // > ~0.36 km/h
  const ttcSec = isClosing ? distance / closingSpeedMs : 99.9;

  return {
    distance: +distance.toFixed(1),
    closingSpeedMs: +closingSpeedMs.toFixed(2),
    closingSpeedKmh: +closingSpeedKmh.toFixed(1),
    ttcSec: +Math.min(99.9, Math.max(0.1, ttcSec)).toFixed(1),
    isClosing,
  };
}

// =========================================================================
// 3. CENTRALIZED VEHICLE STATUS RESOLVER
// Priority order:
// 1. OFFLINE (connectivity lost)
// 2. CRITICAL (restricted zone violation OR immediate collision risk)
// 3. WARNING (approaching restricted zone OR developing proximity risk)
// 4. ONLINE / NORMAL (no active hazard)
// =========================================================================

export interface SafetyEvaluation {
  status: VehicleStatus;
  alertMessage?: string;
  alertType?: "Geofence" | "Proximity" | "Sensor";
  severity?: "Critical" | "Warning" | "Info";
  otherVehicleId?: string;
  clearance: number;
  ttc: number;
}

export function evaluateVehicleSafety(
  vehicle: HEMMVehicle,
  allVehicles: HEMMVehicle[]
): SafetyEvaluation {
  // 1. Offline connectivity state is authoritative for offline status
  if (!vehicle.online) {
    return {
      status: "offline",
      alertMessage: undefined,
      alertType: "Sensor",
      severity: "Warning",
      clearance: 0,
      ttc: 0,
    };
  }

  // 2. Restricted Zone Evaluation
  let zoneStatus: "critical" | "warning" | "online" = "online";
  let zoneMessage: string | undefined = undefined;
  let zoneClearance = 50.0;

  const insideZone = isPointInPolygon(vehicle.mapX, vehicle.mapY);
  const distToZone = distanceToPolygonBoundary(vehicle.mapX, vehicle.mapY);

  if (insideZone) {
    zoneStatus = "critical";
    zoneMessage = "Entered Restricted Blasting Zone (Sector A-3)!";
    zoneClearance = 3.5;
  } else if (distToZone <= SAFETY_CONFIG.ZONE_APPROACH_WARNING_METERS) {
    zoneStatus = "warning";
    zoneMessage = `Approaching Restricted Zone (${Math.round(distToZone)} m)`;
    zoneClearance = +Math.max(5.0, distToZone / 5).toFixed(1);
  }

  // 3. Vehicle-to-Vehicle Proximity Evaluation
  let proxStatus: "critical" | "warning" | "online" = "online";
  let proxMessage: string | undefined = undefined;
  let proxOtherId: string | undefined = undefined;
  let minProximityClearance = 25.0;
  let minProximityTtc = 18.0;

  const onlineOtherVehicles = allVehicles.filter(
    (v) => v.id !== vehicle.id && v.online
  );

  for (const other of onlineOtherVehicles) {
    const { distance, isClosing, ttcSec, closingSpeedKmh } =
      calculateClosingSpeedAndTTC(vehicle, other);

    // Track minimum physical clearance for telemetry
    if (distance < minProximityClearance) {
      minProximityClearance = distance;
      minProximityTtc = ttcSec;
    }

    // Check same-road or connected-corridor constraint
    const onSameRoad = areVehiclesOnSameOrConnectedCorridor(vehicle, other);
    if (!onSameRoad) continue;

    // Critical Collision Risk
    if (distance < SAFETY_CONFIG.PROXIMITY_CRITICAL_METERS) {
      if (
        isClosing ||
        ttcSec < SAFETY_CONFIG.TTC_CRITICAL_SECONDS ||
        distance < 10.0
      ) {
        proxStatus = "critical";
        proxMessage = `Collision Risk — ${other.id} (${distance} m, TTC: ${ttcSec}s)`;
        proxOtherId = other.id;
        break; // Highest danger found
      } else {
        // Very close but pulling away
        proxStatus = "warning";
        proxMessage = `Vehicle Proximity — ${other.id} (${distance} m, separating)`;
        proxOtherId = other.id;
      }
    }
    // Proximity Warning
    else if (distance <= SAFETY_CONFIG.PROXIMITY_WARNING_METERS) {
      if (isClosing || distance <= 22.0) {
        proxStatus = "warning";
        proxMessage = `Vehicle Proximity — ${other.id} (${distance} m${
          isClosing ? ", closing" : ""
        })`;
        proxOtherId = other.id;
      }
    }
  }

  // 4. Resolve Overall Status Priority: CRITICAL > WARNING > ONLINE
  if (zoneStatus === "critical" || proxStatus === "critical") {
    const isZoneCrit = zoneStatus === "critical";
    return {
      status: "critical",
      alertMessage: isZoneCrit ? zoneMessage : proxMessage,
      alertType: isZoneCrit ? "Geofence" : "Proximity",
      severity: "Critical",
      otherVehicleId: isZoneCrit ? undefined : proxOtherId,
      clearance: Math.min(zoneClearance, minProximityClearance),
      ttc: isZoneCrit ? 2.5 : minProximityTtc,
    };
  }

  if (zoneStatus === "warning" || proxStatus === "warning") {
    const isZoneWarn = zoneStatus === "warning";
    return {
      status: "warning",
      alertMessage: isZoneWarn ? zoneMessage : proxMessage,
      alertType: isZoneWarn ? "Geofence" : "Proximity",
      severity: "Warning",
      otherVehicleId: isZoneWarn ? undefined : proxOtherId,
      clearance: Math.min(zoneClearance, minProximityClearance),
      ttc: isZoneWarn ? 6.5 : minProximityTtc,
    };
  }

  // Normal safe operation
  return {
    status: "online",
    alertMessage: undefined,
    clearance: +Math.max(12.0, minProximityClearance).toFixed(1),
    ttc: +Math.max(14.0, minProximityTtc).toFixed(1),
  };
}
