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
  arenaRadius: 120,
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
  { r: 125, h: 6, color: "#3d2216", topColor: "#4e2b1c" },
  { r: 140, h: 12, color: "#361e13", topColor: "#452618" },
  { r: 156, h: 18, color: "#2f1a10", topColor: "#3d2216" },
  { r: 172, h: 24, color: "#29170e", topColor: "#361e13" },
] as const;

export const ROCK_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-24, -98, 1.8],
  [24, -96, 2.0],
  [-17, -64, 1.4],
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

export const BLOCKERS: ReadonlyArray<readonly [number, number, number]> = [
  ...STOCKPILES.map(([x, z, r]) => [x, z, r + 1] as const),
  [52, -62, 12.5],
  [-55, 35, 11.5],
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