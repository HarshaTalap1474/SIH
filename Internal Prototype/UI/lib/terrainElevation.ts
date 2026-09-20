/**
 * High-Precision 3D Open-Pit Mining Haul Road & Topography Engine
 * Generates an authentic 3D curved and elevated haul road with:
 * - Centerline X/Y/Z variation (sweeping curves and true vertical elevations)
 * - Challenging mining grades: up to 10.5% incline and authentic canyon cuts
 * - Dynamic road width: 18m standard, tapering to 15.8m in narrow mountain passes
 * - Continuous, seamless mountain massifs, highwalls, and terraced quarry benches
 * - ZERO floating geometry: all terrain is part of a single unified heightfield
 */

export interface RoadPoint3D {
  z: number;
  x: number;
  y: number;
  bank?: number;
}

// Key 3D Road Spline Control Nodes along Z in [-200, 200]
// Vehicle spawn is at Z = -32, X = 0, Y = 0 (Level, straight baseline)
const ROAD_NODES: RoadPoint3D[] = [
  { z: -200, x: 5.0, y: 6.5, bank: 0.0 },      // North Portal gate
  { z: -160, x: 13.5, y: 11.2, bank: 0.05 },  // North highwall mountain crest (Steep uphill summit!)
  { z: -125, x: 5.0, y: 5.8, bank: -0.03 },   // Sweeping turn left through canyon cut
  { z: -95, x: -7.0, y: 1.2, bank: -0.04 },   // Downhill descent through narrow rock cut
  { z: -70, x: -15.0, y: -3.8, bank: 0.02 },  // Deep pit cut basin floor (Lowest excavation point)
  { z: -48, x: -6.0, y: -1.2, bank: 0.01 },   // Climbing out of pit basin
  { z: -32, x: 0.0, y: 0.0, bank: 0.0 },       // Vehicle spawn position (Level & straight)
  { z: -15, x: 3.5, y: 1.6, bank: 0.02 },      // Gentle climb
  { z: 15, x: 9.5, y: 4.2, bank: 0.04 },       // Central saddle crest (Sweeping right around spur)
  { z: 45, x: 11.0, y: -1.8, bank: -0.03 },   // Downhill dip into blasted rock cut
  { z: 85, x: -4.0, y: 5.2, bank: -0.05 },    // Major uphill haul ramp (Steep heavy climb!)
  { z: 125, x: -17.0, y: 12.5, bank: 0.05 },  // South mountain summit crest (Towering peak bench)
  { z: 160, x: -12.0, y: 9.5, bank: 0.02 },   // Upper haul bench plateau
  { z: 200, x: -5.0, y: 7.2, bank: 0.0 },     // South portal gate
];

// Smooth Catmull-Rom cubic interpolation between 4 points at parameter t in [0, 1]
function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function catmullRomDerivative(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const t2 = t * t;
  return (
    0.5 *
    (-p0 + p2 + (4 * p0 - 10 * p1 + 8 * p2 - 2 * p3) * t + (-3 * p0 + 9 * p1 - 9 * p2 + 3 * p3) * t2)
  );
}

/**
 * Returns the exact (x, y, heading, bank, dx, dy) of the road centerline at coordinate z.
 */
export function getRoadCenterline(z: number): {
  x: number;
  y: number;
  heading: number;
  bank: number;
  dx: number;
  dy: number;
} {
  const nodes = ROAD_NODES;
  const n = nodes.length;

  // Clamp z within node range
  const clampedZ = Math.max(nodes[0].z, Math.min(nodes[n - 1].z, z));

  let idx = 0;
  for (let i = 0; i < n - 1; i++) {
    if (clampedZ >= nodes[i].z && clampedZ <= nodes[i + 1].z) {
      idx = i;
      break;
    }
  }

  const p1 = nodes[idx];
  const p2 = nodes[idx + 1];
  const p0 =
    idx > 0
      ? nodes[idx - 1]
      : { z: p1.z - (p2.z - p1.z), x: p1.x - (p2.x - p1.x), y: p1.y - (p2.y - p1.y), bank: p1.bank };
  const p3 =
    idx < n - 2
      ? nodes[idx + 2]
      : { z: p2.z + (p2.z - p1.z), x: p2.x + (p2.x - p1.x), y: p2.y + (p2.y - p1.y), bank: p2.bank };

  const spanZ = p2.z - p1.z;
  const t = spanZ > 1e-5 ? (clampedZ - p1.z) / spanZ : 0;

  const x = catmullRom(p0.x, p1.x, p2.x, p3.x, t);
  const y = catmullRom(p0.y, p1.y, p2.y, p3.y, t);
  const bank = catmullRom(p0.bank ?? 0, p1.bank ?? 0, p2.bank ?? 0, p3.bank ?? 0, t);

  const dtDz = 1 / (spanZ > 1e-5 ? spanZ : 1);
  const dx = catmullRomDerivative(p0.x, p1.x, p2.x, p3.x, t) * dtDz;
  const dy = catmullRomDerivative(p0.y, p1.y, p2.y, p3.y, t) * dtDz;

  const heading = Math.atan2(dx, 1);

  return { x, y, heading, bank, dx, dy };
}

export function getRoadCenterX(z: number): number {
  return getRoadCenterline(z).x;
}

export function getRoadCenterY(z: number): number {
  return getRoadCenterline(z).y;
}

export const getHaulRoadCenterlineY = getRoadCenterY;

/**
 * Returns the drivable road width at station z.
 * Standard haul road is 18m wide; tapers to 15.8m in narrow mountain passes and canyon cuts.
 */
export function getRoadWidth(z: number): number {
  // Canyon cut at z = [-105, -75] descending into the pit basin
  if (z >= -105 && z <= -75) {
    const t = Math.sin(((z - (-105)) / 30) * Math.PI);
    return 18.0 - 2.2 * t; // 15.8m narrow pass
  }
  // Blasted rock gorge at z = [38, 68]
  if (z >= 38 && z <= 68) {
    const t = Math.sin(((z - 38) / 30) * Math.PI);
    return 18.0 - 2.0 * t; // 16.0m narrow cut
  }
  return 18.0;
}

/**
 * Calculates the lateral offset `u` of any world point (x, z) relative to the curved road centerline.
 * u > 0 means to the right of the road; u < 0 means to the left.
 */
export function getRoadLateralOffset(
  x: number,
  z: number
): { u: number; center: { x: number; y: number; heading: number; bank: number; dx: number; dy: number } } {
  const center = getRoadCenterline(z);
  const cosH = Math.cos(center.heading);
  const u = (x - center.x) * cosH;
  return { u, center };
}

/**
 * Computes world 2D point (x, z) for a given road station z and lateral offset u.
 */
export function getRoadEdgePoint(z: number, u: number): { x: number; z: number } {
  const { x: cx, heading } = getRoadCenterline(z);
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);
  return {
    x: cx + u * cosH,
    z: z - u * sinH,
  };
}

/**
 * Full 3D haul road elevation at any (x, z).
 * Includes road crown (+15cm at center, tapering parabolically to shoulders) and tire ruts.
 */
export function getRoadElevation(x: number, z: number): number {
  const { u, center } = getRoadLateralOffset(x, z);
  const width = getRoadWidth(z);
  const roadHalfWidth = width * 0.5;

  // Crown peaks at centerline, tapering parabolically to shoulders
  const normU = Math.max(-1, Math.min(1, u / roadHalfWidth));
  const crown = 0.15 * (1 - normU * normU);

  // Banking (superelevation) on curved road sections
  const banking = u * Math.sin(center.bank);

  // Dual compacted tire ruts at u = ±(width * 0.2)
  const rutPos = roadHalfWidth * 0.4;
  const rutDist = Math.abs(Math.abs(u) - rutPos);
  const rutIndent = rutDist < 1.3 ? -0.04 * (1 - rutDist / 1.3) : 0;

  return center.y + crown + banking + rutIndent;
}

/**
 * Computes road surface pitch and roll orientation at (x, z).
 */
export function getRoadOrientation(x: number, z: number): { pitch: number; roll: number } {
  const delta = 1.0;
  const yForward = getRoadElevation(x, z - delta);
  const yBackward = getRoadElevation(x, z + delta);
  const yLeft = getRoadElevation(x - delta, z);
  const yRight = getRoadElevation(x + delta, z);

  // Pitch: climbing forward (-Z) means yForward > yBackward, so pitch is positive
  const slopeZ = (yForward - yBackward) / (2 * delta);
  const pitch = Math.atan(slopeZ);

  // Roll: tilting right (+X)
  const slopeX = (yRight - yLeft) / (2 * delta);
  const roll = -Math.atan(slopeX);

  return { pitch, roll };
}

/**
 * Analytical Continuous Open-Pit Mining Topography Engine
 * Generates an authentic, seamlessly connected 3D open-pit landscape:
 * - Drivable road deck (|u| <= halfW)
 * - Drainage ditch & shoulder (halfW < |u| <= halfW + 2.5m)
 * - Highwall rock cut faces rising directly from the roadside ditch on cliff sides
 * - Terraced quarry catch benches stepping down toward the open pit floor
 * - Continuous organic mountain massifs rising up to +45m around the mine perimeter
 * - ZERO floating geometry, zero gaps, zero black voids
 */
export function getTerrainElevation(x: number, z: number): number {
  const { u, center } = getRoadLateralOffset(x, z);
  const absU = Math.abs(u);
  const width = getRoadWidth(z);
  const roadHalfWidth = width * 0.5;

  // 1. Drivable Road Deck (|u| <= roadHalfWidth)
  if (absU <= roadHalfWidth) {
    return getRoadElevation(x, z);
  }

  // 2. Road Shoulder & Drainage Swale (halfW < |u| <= halfW + 2.5m)
  // Slopes gently down 25cm from the road edge into the safety ditch
  const edgeY = center.y + u * Math.sin(center.bank);
  const shoulderWidth = 2.5;
  if (absU <= roadHalfWidth + shoulderWidth) {
    const t = (absU - roadHalfWidth) / shoulderWidth;
    return edgeY - 0.25 * t;
  }

  // 3. Surrounding Quarry Terrain & Mountain Formations (|u| > roadHalfWidth + shoulderWidth)
  const distFromDitch = absU - (roadHalfWidth + shoulderWidth);
  const ditchY = edgeY - 0.25;

  // Determine whether this side of the road is a highwall cut face or a bench drop-off:
  // Is this section a canyon cut where BOTH sides rise steeply?
  const isCanyonCut = (z >= -115 && z <= -70) || (z >= 32 && z <= 72);

  // For other sections, determine cliff vs drop based on road curvature and pit center:
  // When road center is to the east (x > 0), east (u > 0) is the mountain highwall, west (u < 0) drops into the pit.
  // When road center is to the west (x < 0), west (u < 0) is the mountain highwall, east (u > 0) drops into the pit.
  const isHighwallSide = isCanyonCut || (center.x >= 0 ? u > 0 : u < 0);

  let localRelief = 0;

  if (isHighwallSide) {
    // HIGHWALL ROCK CUT (Carved mountain face rising directly from roadside ditch)
    // 1st cut face: steep blasted rock wall rising +4.5m over 5.5m distance (slope ~55°)
    const s1 = Math.min(1, distFromDitch / 5.5);
    const cut1 = Math.pow(s1, 1.25) * 4.8;

    // 1st catch bench: 5m wide flat safety shelf
    const bench1Dist = Math.max(0, distFromDitch - 5.5);

    // 2nd cut face: highwall rising +8.5m over 9.0m distance
    const s2 = Math.min(1, Math.max(0, (bench1Dist - 4.5) / 9.0));
    const cut2 = Math.pow(s2, 1.3) * 8.5;

    // 3rd upper bench & mountain base: rising +14.0m
    const bench2Dist = Math.max(0, bench1Dist - 13.5);
    const s3 = Math.min(1, Math.max(0, (bench2Dist - 5.0) / 14.0));
    const cut3 = Math.pow(s3, 1.4) * 14.0;

    localRelief = cut1 + cut2 + cut3;
  } else {
    // OPEN PIT BASIN DROP-OFF (Terraced mine benches stepping down toward pit floor)
    // 1st bench drop: slopes down -3.5m over 5.0m to the lower catch bench
    const s1 = Math.min(1, distFromDitch / 5.0);
    const drop1 = -Math.pow(s1, 1.2) * 3.5;

    // Wide lower working bench (20m flat shelf)
    const benchDist = Math.max(0, distFromDitch - 5.0);

    // 2nd drop toward pit bottom or recovery to valley floor
    const s2 = Math.min(1, Math.max(0, (benchDist - 18.0) / 12.0));
    const drop2 = -Math.pow(s2, 1.3) * 3.0;

    // Beyond the pit floor (at large distances), terrain rises up into the outer valley ridges
    const outerRiseDist = Math.max(0, distFromDitch - 50.0);
    const sOuter = Math.min(1, outerRiseDist / 35.0);
    const outerRise = Math.pow(sOuter, 1.4) * 18.0;

    localRelief = drop1 + drop2 + outerRise;
  }

  // 4. Large Continuous Mountain Massifs (Seamless 3D peaks enclosing the mine perimeter)
  // Evaluated analytically across world coordinates (x, z) so they are 100% physically connected to the ground:
  // North Mountain Massif (peaks at (35, -205) and (-65, -195))
  const northPeak1 = Math.exp(-(Math.pow(x - 35, 2) + Math.pow(z - (-205), 2)) / 3200) * 34.0;
  const northPeak2 = Math.exp(-(Math.pow(x - (-65), 2) + Math.pow(z - (-195), 2)) / 2800) * 30.0;

  // East Mountain Highwall Ridge (peaks at (135, -85) and (145, 55))
  const eastRidge1 = Math.exp(-(Math.pow(x - 135, 2) + Math.pow(z - (-85), 2)) / 3600) * 32.0;
  const eastRidge2 = Math.exp(-(Math.pow(x - 145, 2) + Math.pow(z - 55, 2)) / 3400) * 28.0;

  // South Mountain Summit (peaks at (-65, 175) and (35, 195))
  const southPeak1 = Math.exp(-(Math.pow(x - (-65), 2) + Math.pow(z - 175, 2)) / 3200) * 36.0;
  const southPeak2 = Math.exp(-(Math.pow(x - 35, 2) + Math.pow(z - 195, 2)) / 3000) * 32.0;

  // West Mountain Highwall Range (peaks at (-135, -65) and (-145, 75))
  const westRidge1 = Math.exp(-(Math.pow(x - (-135), 2) + Math.pow(z - (-65), 2)) / 3400) * 30.0;
  const westRidge2 = Math.exp(-(Math.pow(x - (-145), 2) + Math.pow(z - 75, 2)) / 3200) * 28.0;

  // Central Mountain Spur at (26, 8) that the road dramatically wraps around
  const centralSpur = Math.exp(-(Math.pow(x - 26, 2) + Math.pow(z - 8, 2)) / 550) * 9.5;

  const mountainMassifs = northPeak1 + northPeak2 + eastRidge1 + eastRidge2 + southPeak1 + southPeak2 + westRidge1 + westRidge2 + centralSpur;

  // Geological rock strata noise (fine fractured mineral ridges)
  const rockStrata =
    (Math.sin(x * 0.09 + z * 0.07) * 0.7 + Math.cos(x * 0.14 - z * 0.11) * 0.45) *
    Math.min(1, distFromDitch / 6.0);

  // Smooth gate ensuring 0 perturbation at the roadside ditch edge
  const ditchGate = Math.min(1, Math.max(0, distFromDitch / 4.0));

  let y = ditchY + (localRelief + mountainMassifs * 0.85 + rockStrata) * ditchGate;

  // Special feature blends:
  // Primary Crusher Platform at (52, -62)
  const crusherDist = Math.hypot(x - 52, z - (-62));
  if (crusherDist < 24 && ditchGate > 0) {
    const ct = Math.max(0, Math.min(1, (24 - crusherDist) / 10.0)) * ditchGate;
    y = y * (1 - ct) + (center.y + 3.2) * ct;
  }

  // Sump Drainage Pond at (-55, 35)
  const sumpDist = Math.hypot(x - (-55), z - 35);
  if (sumpDist < 20 && ditchGate > 0) {
    const st = Math.max(0, Math.min(1, (20 - sumpDist) / 10.0)) * ditchGate;
    y = y * (1 - st) + (center.y - 2.2) * st;
  }

  // Smooth downward horizon skirt beyond r = 210m so the terrain meets the mist seamlessly
  const radialDist = Math.hypot(x, z);
  if (radialDist > 200) {
    const skirtT = Math.min(1, (radialDist - 200) / 35.0);
    y -= skirtT * skirtT * 12.0;
  }

  return y;
}
