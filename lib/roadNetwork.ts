// Road Network & Waypoint Geometry for Bailadila Iron Ore Mine
// Calibrated strictly to the authoritative blue-highlighted road network
// Normalized Map Coordinates: x (0 to 100%), y (0 to 100%)
// Aspect ratio: 1024 x 572 (~1.7902)

export interface RoadWaypoint {
  x: number; // 0 - 100% of map width
  y: number; // 0 - 100% of map height
}

export interface RouteDefinition {
  id: string;
  name: string;
  zone: string;
  waypoints: RoadWaypoint[];
  isClosedLoop: boolean;
  totalLength: number;
  segmentLengths: number[];
  cumulativeDistances: number[];
  segmentHeadings: number[];
  segmentCurvatures: number[]; // Angle change in degrees at end of each segment (0 to 180)
}

const MAP_ASPECT_RATIO = 1024 / 572; // ~1.7902

function calculateSegmentDistance(p1: RoadWaypoint, p2: RoadWaypoint): number {
  const dx = (p2.x - p1.x) * MAP_ASPECT_RATIO;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function calculateHeading(p1: RoadWaypoint, p2: RoadWaypoint): number {
  const dx = (p2.x - p1.x) * MAP_ASPECT_RATIO;
  const dy = p2.y - p1.y;
  return ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
}

function buildRouteDefinition(
  id: string,
  name: string,
  zone: string,
  waypoints: RoadWaypoint[],
  isClosedLoop: boolean = true
): RouteDefinition {
  const segmentLengths: number[] = [];
  const cumulativeDistances: number[] = [0];
  const segmentHeadings: number[] = [];
  let totalLength = 0;

  const numSegments = waypoints.length - 1;
  for (let i = 0; i < numSegments; i++) {
    const len = calculateSegmentDistance(waypoints[i], waypoints[i + 1]);
    const heading = calculateHeading(waypoints[i], waypoints[i + 1]);
    segmentLengths.push(len);
    segmentHeadings.push(heading);
    totalLength += len;
    cumulativeDistances.push(totalLength);
  }

  // Precalculate curvature (turn angle to next segment)
  const segmentCurvatures: number[] = [];
  for (let i = 0; i < numSegments; i++) {
    const nextIdx = (i + 1) % numSegments;
    const h1 = segmentHeadings[i];
    const h2 = segmentHeadings[nextIdx];
    const turnAngle = Math.abs(((h2 - h1 + 540) % 360) - 180);
    segmentCurvatures.push(turnAngle);
  }

  return {
    id,
    name,
    zone,
    waypoints,
    isClosedLoop,
    totalLength,
    segmentLengths,
    cumulativeDistances,
    segmentHeadings,
    segmentCurvatures,
  };
}

// =========================================================================
// AUTHORITATIVE ROAD NETWORK WAYPOINTS (TRACED STRICTLY FROM BLUE HIGHLIGHTS)
// =========================================================================

// 1. D-04: Southwest Pit Floor along the Main Diagonal Haul Highway to Deposit 5 & return
export const WAYPOINTS_SW_MAIN_D04: RoadWaypoint[] = [
  { x: 17.5, y: 81.0 },
  { x: 19.5, y: 78.5 },
  { x: 22.0, y: 75.0 },
  { x: 24.5, y: 72.0 },
  { x: 27.5, y: 68.5 }, // SW Main Junction
  { x: 31.0, y: 67.5 },
  { x: 36.0, y: 63.5 },
  { x: 41.5, y: 57.5 },
  { x: 47.0, y: 52.0 },
  { x: 53.0, y: 46.0 },
  { x: 59.5, y: 38.0 },
  { x: 63.0, y: 38.5 },
  { x: 66.0, y: 38.0 }, // Deposit 5 Central Hub
  // In-line reverse return along actual road
  { x: 63.0, y: 38.5 },
  { x: 59.5, y: 38.0 },
  { x: 53.0, y: 46.0 },
  { x: 47.0, y: 52.0 },
  { x: 41.5, y: 57.5 },
  { x: 36.0, y: 63.5 },
  { x: 31.0, y: 67.5 },
  { x: 27.5, y: 68.5 },
  { x: 24.5, y: 72.0 },
  { x: 22.0, y: 75.0 },
  { x: 19.5, y: 78.5 },
  { x: 17.5, y: 81.0 },
];

// 2. D-10: SW South Excavation Spur (Deep quarry haul track)
export const WAYPOINTS_SW_SPUR_D10: RoadWaypoint[] = [
  { x: 27.5, y: 68.5 },
  { x: 27.5, y: 75.0 },
  { x: 28.5, y: 78.0 },
  { x: 31.5, y: 78.0 },
  { x: 31.5, y: 83.5 },
  { x: 33.0, y: 88.0 },
  { x: 31.0, y: 94.0 },
  { x: 31.5, y: 99.0 },
  // return along same spur
  { x: 31.0, y: 94.0 },
  { x: 33.0, y: 88.0 },
  { x: 31.5, y: 83.5 },
  { x: 31.5, y: 78.0 },
  { x: 28.5, y: 78.0 },
  { x: 27.5, y: 75.0 },
  { x: 27.5, y: 68.5 },
];

// 3. D-06: Southwest Upper Approach & Triangle Junction
export const WAYPOINTS_SW_UPPER_D06: RoadWaypoint[] = [
  { x: 27.5, y: 68.5 },
  { x: 29.5, y: 62.0 },
  { x: 32.5, y: 57.0 },
  { x: 36.5, y: 54.0 },
  { x: 41.5, y: 53.0 },
  { x: 46.5, y: 52.0 },
  { x: 41.5, y: 57.5 },
  { x: 36.0, y: 63.5 },
  { x: 31.0, y: 67.5 },
  { x: 27.5, y: 68.5 },
];

// 4. D-01: Northern Mountain Ridge Switchback Pass (Connecting SW to Deposit 5)
export const WAYPOINTS_WEST_SWITCHBACK_D01: RoadWaypoint[] = [
  { x: 41.5, y: 53.0 },
  { x: 44.5, y: 45.0 },
  { x: 47.0, y: 40.0 },
  { x: 50.5, y: 36.0 },
  { x: 53.0, y: 33.5 },
  { x: 54.0, y: 29.0 },
  { x: 56.5, y: 25.5 },
  { x: 60.5, y: 25.5 }, // D-01 mountain ridge checkpoint
  { x: 63.5, y: 28.5 },
  { x: 66.5, y: 35.0 },
  { x: 66.0, y: 38.0 }, // Deposit 5 Central Hub
  // Return back across mountain ridge
  { x: 66.5, y: 35.0 },
  { x: 63.5, y: 28.5 },
  { x: 60.5, y: 25.5 },
  { x: 56.5, y: 25.5 },
  { x: 54.0, y: 29.0 },
  { x: 53.0, y: 33.5 },
  { x: 50.5, y: 36.0 },
  { x: 47.0, y: 40.0 },
  { x: 44.5, y: 45.0 },
  { x: 41.5, y: 53.0 },
];

// 5. D-05: Deposit 5 Central Arterial Spine & North Haul Cut
export const WAYPOINTS_CENTRAL_HAUL_D05: RoadWaypoint[] = [
  { x: 66.0, y: 38.0 },
  { x: 66.5, y: 33.0 },
  { x: 66.8, y: 26.0 },
  { x: 66.5, y: 18.0 },
  { x: 65.5, y: 11.5 },
  { x: 66.0, y: 6.5 },
  { x: 66.8, y: 4.5 }, // North Crest Top (near D-05/D-09)
  { x: 66.0, y: 6.5 },
  { x: 65.5, y: 11.5 },
  { x: 66.5, y: 18.0 },
  { x: 66.8, y: 26.0 },
  { x: 66.5, y: 33.0 },
  { x: 66.0, y: 38.0 },
];

// 6. D-09: Deposit 5 North Crest Cut Loop
export const WAYPOINTS_NORTH_PIT_D09: RoadWaypoint[] = [
  { x: 66.8, y: 24.0 },
  { x: 66.0, y: 15.0 },
  { x: 65.5, y: 10.0 },
  { x: 66.5, y: 4.5 },
  { x: 68.2, y: 6.5 },
  { x: 69.2, y: 12.0 },
  { x: 68.0, y: 17.5 },
  { x: 66.8, y: 24.0 },
];

// 7. D-03: Deposit 5 Blast Hazard Corridor / Restricted Zone Loop
export const WAYPOINTS_HAZARD_D03: RoadWaypoint[] = [
  { x: 66.8, y: 24.0 },
  { x: 68.0, y: 17.5 },
  { x: 69.2, y: 12.0 }, // D-03 blast hazard post
  { x: 68.0, y: 17.5 },
  { x: 66.8, y: 24.0 },
  { x: 66.5, y: 32.0 },
  { x: 66.0, y: 38.0 },
  { x: 66.5, y: 32.0 },
  { x: 66.8, y: 24.0 },
];

// 8. D-07: Deposit 5 South Terraces Loop
export const WAYPOINTS_SOUTH_ARTERY_D07: RoadWaypoint[] = [
  { x: 66.0, y: 38.0 },
  { x: 66.0, y: 46.0 },
  { x: 67.0, y: 53.0 },
  { x: 70.0, y: 55.0 },
  { x: 72.5, y: 63.0 },
  { x: 73.0, y: 71.0 }, // Southernmost terrace hairpin
  { x: 72.0, y: 63.0 },
  { x: 70.0, y: 55.0 },
  { x: 67.0, y: 53.0 },
  { x: 66.0, y: 46.0 },
  { x: 66.0, y: 38.0 },
];

// 9. D-02: Deposit 5 Eastern Hairpin Terraces
export const WAYPOINTS_EAST_SWITCHBACK_D02: RoadWaypoint[] = [
  { x: 66.0, y: 38.0 },
  { x: 68.5, y: 38.0 },
  { x: 71.5, y: 39.0 },
  { x: 74.5, y: 40.5 },
  { x: 76.5, y: 42.5 },
  { x: 75.0, y: 45.5 },
  { x: 71.5, y: 45.0 },
  { x: 71.0, y: 53.0 },
  { x: 71.5, y: 45.0 },
  { x: 75.0, y: 45.5 },
  { x: 76.5, y: 42.5 },
  { x: 74.5, y: 40.5 },
  { x: 71.5, y: 39.0 },
  { x: 68.5, y: 38.0 },
  { x: 66.0, y: 38.0 },
];

// 10. D-08: CONNECTING ROAD FROM MAIN MINE TO GREEN-CIRCLED AREA (CRITICAL REQUIREMENT)
// Follows the actual visible hillside road all the way into the Green-Circled East Pit floor
export const WAYPOINTS_GREEN_AREA_D08: RoadWaypoint[] = [
  { x: 66.0, y: 38.0 }, // Deposit 5 Central Main Road
  { x: 68.5, y: 38.0 },
  { x: 71.5, y: 39.0 },
  { x: 74.5, y: 40.5 }, // Eastern Road Fork
  { x: 77.0, y: 37.5 }, // Connecting road past workshop
  { x: 79.5, y: 36.5 },
  { x: 82.5, y: 37.5 },
  { x: 85.0, y: 39.5 },
  { x: 87.0, y: 43.0 },
  { x: 88.5, y: 47.0 },
  { x: 90.0, y: 51.5 },
  { x: 91.2, y: 56.5 },
  { x: 91.5, y: 62.0 },
  { x: 90.8, y: 67.5 },
  { x: 90.2, y: 72.0 }, // Deep inside Green-Circled Area Pit Floor!
  // Return trip along connecting road
  { x: 90.8, y: 67.5 },
  { x: 91.5, y: 62.0 },
  { x: 91.2, y: 56.5 },
  { x: 90.0, y: 51.5 },
  { x: 88.5, y: 47.0 },
  { x: 87.0, y: 43.0 },
  { x: 85.0, y: 39.5 },
  { x: 82.5, y: 37.5 },
  { x: 79.5, y: 36.5 },
  { x: 77.0, y: 37.5 },
  { x: 74.5, y: 40.5 },
  { x: 71.5, y: 39.0 },
  { x: 68.5, y: 38.0 },
  { x: 66.0, y: 38.0 },
];

// 11. D-11: Heavy Maintenance Bay 3 Spur connecting into East Arterial
export const WAYPOINTS_WORKSHOP_D11: RoadWaypoint[] = [
  { x: 77.0, y: 26.8 },
  { x: 77.0, y: 32.0 },
  { x: 77.0, y: 37.5 },
  { x: 74.5, y: 40.5 },
  { x: 71.5, y: 39.0 },
  { x: 68.5, y: 38.0 },
  { x: 66.0, y: 38.0 },
  { x: 68.5, y: 38.0 },
  { x: 71.5, y: 39.0 },
  { x: 74.5, y: 40.5 },
  { x: 77.0, y: 37.5 },
  { x: 77.0, y: 32.0 },
  { x: 77.0, y: 26.8 },
];

// 12. D-12: Heavy Maintenance Bay 4 Spur connecting into East Ridge
export const WAYPOINTS_WORKSHOP_D12: RoadWaypoint[] = [
  { x: 78.5, y: 28.5 },
  { x: 78.0, y: 33.5 },
  { x: 77.0, y: 37.5 },
  { x: 79.5, y: 36.5 },
  { x: 82.5, y: 37.5 },
  { x: 85.0, y: 39.5 },
  { x: 82.5, y: 37.5 },
  { x: 79.5, y: 36.5 },
  { x: 77.0, y: 37.5 },
  { x: 78.0, y: 33.5 },
  { x: 78.5, y: 28.5 },
];

export const ROAD_NETWORKS: Record<string, RouteDefinition> = {
  sw_pit_d04: buildRouteDefinition("sw_pit_d04", "Kirandul Pit Haul Highway", "Central Pit Cut B", WAYPOINTS_SW_MAIN_D04),
  sw_upper_d06: buildRouteDefinition("sw_upper_d06", "Upper Approach Corridor", "South Incline Bench", WAYPOINTS_SW_UPPER_D06),
  sw_spur_d10: buildRouteDefinition("sw_spur_d10", "Southwest Quarry Spur", "Pit Floor Loading", WAYPOINTS_SW_SPUR_D10),
  west_switchback_d01: buildRouteDefinition("west_switchback_d01", "West Mountain Switchback Pass", "North Bench Ramp", WAYPOINTS_WEST_SWITCHBACK_D01),
  central_haul_d05: buildRouteDefinition("central_haul_d05", "Deposit 5 Central Arterial", "Upper Crusher Road", WAYPOINTS_CENTRAL_HAUL_D05),
  north_pit_d09: buildRouteDefinition("north_pit_d09", "North Pit Cut Bench", "North Pit Access", WAYPOINTS_NORTH_PIT_D09),
  east_switchback_d02: buildRouteDefinition("east_switchback_d02", "East Hairpin Terraces", "East Transfer Spur", WAYPOINTS_EAST_SWITCHBACK_D02),
  east_switchback_d08: buildRouteDefinition("east_switchback_d08", "East Ridge to Green Pit Valley", "Green Pit Valley Corridor", WAYPOINTS_GREEN_AREA_D08),
  south_artery_d07: buildRouteDefinition("south_artery_d07", "Deposit 5 South Terraces Loop", "South Terraces #2", WAYPOINTS_SOUTH_ARTERY_D07),
  hazard_d03: buildRouteDefinition("hazard_d03", "Haul Road A Blast Perimeter", "Haul Road A", WAYPOINTS_HAZARD_D03),
  workshop_bay_d11: buildRouteDefinition("workshop_bay_d11", "East Workshop Spur D-11", "Heavy Maintenance Bay 3", WAYPOINTS_WORKSHOP_D11),
  workshop_bay_d12: buildRouteDefinition("workshop_bay_d12", "East Workshop Spur D-12", "Heavy Maintenance Bay 4", WAYPOINTS_WORKSHOP_D12),
};

// Stationary workshop bays for offline vehicles (located right beside the road)
export const WORKSHOP_BAYS: Record<string, RoadWaypoint> = {
  "D-11": { x: 77.0, y: 26.8 }, // Heavy Maintenance Bay 3
  "D-12": { x: 78.5, y: 28.5 }, // Heavy Maintenance Bay 4
};

// Calculate interpolated position, bearing, and dynamic speed (with curve slowdown & smooth acceleration)
export function getRoutePositionAndHeading(
  routeId: string,
  progress: number,
  currentHeading: number | undefined,
  currentSpeed: number,
  baseSpeed: number,
  status: string,
  deltaSec: number
): {
  x: number;
  y: number;
  heading: number;
  segmentIndex: number;
  progressAlongSegment: number;
  speed: number;
} {
  const route = ROAD_NETWORKS[routeId];
  if (!route || route.waypoints.length === 0) {
    return { x: 50, y: 50, heading: 0, segmentIndex: 0, progressAlongSegment: 0, speed: 0 };
  }

  // Wrap progress into [0, 1)
  const normProgress = ((progress % 1.0) + 1.0) % 1.0;
  const targetDistance = normProgress * route.totalLength;

  // Find active segment
  let segIdx = 0;
  for (let i = 0; i < route.segmentLengths.length; i++) {
    const segStart = route.cumulativeDistances[i];
    const segEnd = route.cumulativeDistances[i + 1];
    if (targetDistance >= segStart && targetDistance <= segEnd) {
      segIdx = i;
      break;
    }
  }

  const p1 = route.waypoints[segIdx];
  const p2 = route.waypoints[segIdx + 1] || route.waypoints[0];
  const segLen = route.segmentLengths[segIdx] || 0.001;
  const segStartDist = route.cumulativeDistances[segIdx];
  const progressAlongSegment = Math.max(0, Math.min(1, (targetDistance - segStartDist) / segLen));

  // Linear interpolation along road segment (stays 100% on the visible road)
  const x = +(p1.x + (p2.x - p1.x) * progressAlongSegment).toFixed(2);
  const y = +(p1.y + (p2.y - p1.y) * progressAlongSegment).toFixed(2);

  // Road heading
  const segHeading = route.segmentHeadings[segIdx] || 0;
  const nextSegHeading = route.segmentHeadings[(segIdx + 1) % route.segmentHeadings.length] || segHeading;

  // Heading interpolation across segment to smooth turns
  const turnDiff = ((nextSegHeading - segHeading + 540) % 360) - 180;
  const targetHeading = ((segHeading + turnDiff * progressAlongSegment + 360) % 360);

  let heading = Math.round(targetHeading);
  if (currentHeading !== undefined) {
    const headingDiff = ((targetHeading - currentHeading + 540) % 360) - 180;
    // Smooth heading rotation
    heading = Math.round((currentHeading + headingDiff * 0.15 + 360) % 360);
  }

  // =========================================================================
  // DYNAMIC SPEED MODULATION (Slows down for sharp curves, accelerates on straights)
  // =========================================================================
  const currTurnAngle = route.segmentCurvatures[segIdx] || 0;
  const prevTurnAngle = route.segmentCurvatures[(segIdx - 1 + route.segmentCurvatures.length) % route.segmentCurvatures.length] || 0;

  // Curvature intensity at current position: peaks near segment transitions
  const curveIntensity = Math.min(1.0, Math.max(
    (currTurnAngle / 100) * progressAlongSegment,
    (prevTurnAngle / 100) * (1 - progressAlongSegment)
  ));

  // Determine cruise speed by operational status
  let cruiseSpeed = baseSpeed;
  if (status === "critical") {
    // Critical alert (e.g. human detected within 8m): safety crawl 1–3 km/h
    cruiseSpeed = Math.min(baseSpeed, 2.5);
  } else if (status === "warning") {
    // Warning status caps at safe descent grade: 4–7 km/h
    cruiseSpeed = Math.min(baseSpeed, 6.5);
  }

  // Curve reduction: slows up to 55% during sharp turns/hairpins
  const targetSpeed = Math.max(
    status === "critical" ? 1.0 : 4.0,
    cruiseSpeed * (1.0 - 0.50 * curveIntensity)
  );

  // Smooth acceleration / deceleration toward target speed
  const smoothFactor = 1 - Math.exp(-2.5 * deltaSec);
  const updatedSpeed = +(currentSpeed + (targetSpeed - currentSpeed) * smoothFactor).toFixed(1);

  return {
    x,
    y,
    heading,
    segmentIndex: segIdx,
    progressAlongSegment: +progressAlongSegment.toFixed(3),
    speed: updatedSpeed,
  };
}
