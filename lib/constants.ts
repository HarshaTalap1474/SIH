export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const damp = (current: number, target: number, lambda: number, dt: number) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const angleDeltaDeg = (a: number, b: number) => {
  let d = (a - b) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
};

export const START_POS = { x: 0, z: -32 };

export const PHYSICS = {
  normalMaxSpeed: 11,
  reverseMaxSpeed: 6,
  boostMaxSpeed: 22,
  accel: 7,
  brake: 13,
  coastDecel: 4,
  yawRate: 1.35,
  wheelRadius: 1.0,
  maxSteerAngle: 0.55,
  kphPerUnit: 3.4,
  throttleDeadzone: 0.06,
  pitchFromAccel: 0.02,
  pitchClamp: 0.05,
  rollFromSteer: 0.07,
  bobAmount: 0.04,
  arenaRadius: 215,
  truckRadius: 3.0,
} as const;

export const SENSOR = {
  maxRollDeg: 30,
  maxPitchDeg: 30,
  padRadiusPx: 75,
  smooth: 8,
  deadzoneK: 0.06,
  impactDecay: 5.5,
  clickImpact: 2.5,
  velocityImpact: 2.5,
  velocityThresholdPx: 45,
  anomalyThresholdG: 0.4,
} as const;

export const CAMERA = {
  chaseDist: 11.5,
  chaseHeight: 10,
  orbitHeight: 9,
  idleAngleDeg: -90,
  topHeight: 42,
  topOffsetZ: 8,
  lookHeight: 2.2,
  dampLambda: 3.2,
} as const;

export const SCENE = {
  background: "#1c1917",
  fogColor: "#292524",
  fogNear: 25,
  fogFar: 140,
  groundColor: "#43281c",
  groundDark: "#2c1810",
  roadColor: "#332c27",
  roadBermColor: "#573422",
  roadLineColor: "#e69500",
  boundaryColor: "#78350f",
  rockColor: "#44403c",
  rockHighGrade: "#6b2118",
  coneColor: "#ea580c",
  moundColor: "#582f1d",
  patchColor: "#38231a",
  pondColor: "#132a29",
  plateColor: "#453224",
  cameraStart: { x: 0, y: 6, z: 8 },
} as const;

export const PIT_BENCHES = [
  { r: 125, h: 6, color: "#362118", topColor: "#2c1a13" },
  { r: 140, h: 12, color: "#2d1b13", topColor: "#251610" },
  { r: 156, h: 18, color: "#241610", topColor: "#1e110c" },
  { r: 172, h: 24, color: "#1c120a", topColor: "#170e08" },
] as const;

// Natural mountain ridges and hills enclosing the quarry perimeter into atmospheric haze
export const OUTER_RIDGES = [
  { x: 0, z: -235, r: 48, h: 32 },
  { x: -55, z: -215, r: 46, h: 28 },
  { x: 55, z: -215, r: 46, h: 28 },
  { x: -110, z: -170, r: 44, h: 25 },
  { x: 110, z: -170, r: 44, h: 25 },
  { x: 165, z: -95, r: 44, h: 24 },
  { x: 180, z: -5, r: 46, h: 25 },
  { x: 165, z: 85, r: 44, h: 24 },
  { x: 110, z: 170, r: 44, h: 25 },
  { x: 55, z: 215, r: 46, h: 28 },
  { x: 0, z: 235, r: 48, h: 32 },
  { x: -55, z: 215, r: 46, h: 28 },
  { x: -110, z: 170, r: 44, h: 25 },
  { x: -165, z: 85, r: 44, h: 24 },
  { x: -180, z: -5, r: 46, h: 25 },
  { x: -165, z: -95, r: 44, h: 24 },
] as const;

export const ROCK_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-28, -98, 1.8],
  [28, -96, 2.0],
  [-29, -64, 1.4],
  [58, -92, 2.3],
  [45, 10, 1.7],
  [-40, 42, 2.4],
  [-98, -58, 2.8],
  [-100, 22, 2.5],
  [96, 32, 2.6],
  [98, -42, 2.7],
  [-62, 82, 1.9],
  [88, -86, 1.8],
];

export const STOCKPILES: ReadonlyArray<readonly [number, number, number, number]> = [
  [78, -78, 16, 11],
  [-80, -70, 15, 10],
  [72, 64, 19, 12],
  [-70, 72, 14, 9],
  [-96, -10, 16, 10],
];

export const PATCHES: ReadonlyArray<readonly [number, number, number, number]> = [
  [0, -95, 42, 52],
  [0, -25, 34, 26],
  [55, -60, 26, 22],
  [70, 70, 36, 30],
  [-65, 35, 32, 26],
  [-40, -40, 30, 26],
];

// Roadside Safety Warning & Speed Sign Boards along haul road
export const ROAD_SIGNS = [
  { x: -11, z: -15, text: "BLAST ZONE 500M", rot: 0.12, radius: 1.4 },
  { x: 11, z: -65, text: "SPEED 20", rot: -0.18, radius: 1.4 },
  { x: -11, z: -115, text: "CAUTION FOG", rot: 0.15, radius: 1.4 },
  { x: 11, z: 45, text: "BLIND CORNER", rot: -0.15, radius: 1.4 },
  { x: -11, z: 110, text: "HAUL PRIORITY", rot: 0.2, radius: 1.4 },
  { x: 11, z: 170, text: "PIT END", rot: -0.15, radius: 1.4 },
] as const;

// High-Mast Floodlight Towers (12m steel lattice with concrete foundation base)
export const LIGHT_TOWERS = [
  { x: 17, z: -50, rot: -0.3, radius: 1.8 },
  { x: -18, z: -120, rot: 0.4, radius: 1.8 },
  { x: 17, z: 65, rot: -0.35, radius: 1.8 },
  { x: -18, z: 135, rot: 0.3, radius: 1.8 },
] as const;

// Industrial Power Utility Poles with ceramic insulators
export const UTILITY_POLES = [
  { x: 110, z: -90, rot: -0.4, radius: 0.8 },
  { x: -110, z: -80, rot: 0.3, radius: 0.8 },
  { x: 120, z: 40, rot: -0.6, radius: 0.8 },
  { x: -115, z: 60, rot: 0.5, radius: 0.8 },
  { x: 25, z: 145, rot: 0.1, radius: 0.8 },
] as const;

// Scattered Roadside Gravel Clusters & Micro-Boulders
export const GRAVEL_CLUSTERS: ReadonlyArray<readonly [number, number, number]> = [
  [-11.5, -20, 1.2],
  [11.5, -55, 1.4],
  [-11.2, -75, 1.1],
  [11.4, -110, 1.5],
  [-11.6, -145, 1.3],
  [11.5, 20, 1.2],
  [-11.3, 75, 1.4],
  [11.6, 125, 1.3],
];

// Heavy Mining Equipment & Cranes
export const HEAVY_EQUIPMENT = [
  { x: 47, z: -62, rot: -Math.PI / 2 + 0.5, radius: 3.5, category: "big" as const, name: "Construction Loader" },
  { x: -70, z: -30, rot: 0.8, radius: 4.8, category: "big" as const, name: "Construction Crane / Excavator" },
] as const;

// Continuous Earthen Safety Barriers along Haul Road
export interface BarrierBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const ROAD_BARRIERS: ReadonlyArray<BarrierBox> = [
  // Left haul road safety berm (with opening at z=[-38, -22] for quarry excavator access)
  { minX: -10.4, maxX: -9.2, minZ: -190, maxZ: -38 },
  { minX: -10.4, maxX: -9.2, minZ: -22, maxZ: 190 },
  // Right haul road safety berm (with opening at z=[-72, -52] for crusher loading ramp access)
  { minX: 9.2, maxX: 10.4, minZ: -190, maxZ: -72 },
  { minX: 9.2, maxX: 10.4, minZ: -52, maxZ: 190 },
];

export const BLOCKERS: ReadonlyArray<readonly [number, number, number]> = [
  // 1. Stockpiles & Pit Structures
  ...STOCKPILES.map(([x, z, r]) => [x, z, r + 1] as const),
  [55, -67, 6.5],
  [48, -56, 5.5],
  [52, -62, 12.5],
  [-55, 35, 11.5],
  [36, -62, 4.5],

  // 2. Heavy mining machinery & crane (Excavator, Crane, Loader)
  ...HEAVY_EQUIPMENT.map((e) => [e.x, e.z, e.radius] as const),

  // 3. Designated rock obstacles
  ...ROCK_SPOTS.map(([x, z, s]) => [x, z, s * 1.5] as const),
];

export const DUMPER = {
  wheelRadius: 1.0,
  wheelWidth: 0.85,
  frontX: 2.0,
  frontZ: -2.3,
  rearX: 2.1,
  rearZ1: 0.8,
  rearZ2: 2.6,
  chassis: { len: 6.2, width: 4.5, height: 0.9, y: 1.55 },
  cabin: { x: 0.0, y: 2.45, z: -1.7, w: 2.3, h: 1.05, d: 1.25 },
  glass: { x: 0.0, y: 2.65, z: -2.3, w: 2.35, h: 0.5, d: 0.08 },
  bin: { x: 0.0, y: 2.55, z: 1.3, w: 4.7, h: 1.7, d: 3.7 },
  binWall: { h: 3.0 },
  colors: {
    body: "#e5a100",
    bodyDark: "#b87c00",
    chassis: "#1c1917",
    tire: "#0c0a09",
    rim: "#57534e",
    window: "#1e293b",
    bin: "#d97706",
  },
} as const;

export {
  getHaulRoadCenterlineY,
  getRoadElevation,
  getRoadOrientation,
  getTerrainElevation,
  getRoadCenterline,
  getRoadCenterX,
  getRoadCenterY,
  getRoadEdgePoint,
  getRoadLateralOffset,
  getRoadWidth,
} from "./terrainElevation";