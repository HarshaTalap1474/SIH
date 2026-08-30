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
  chaseHeight:11 ,
  orbitHeight: 10,
  idleAngleDeg: -90,
  topHeight: 38,
  topOffsetZ: 8,
  lookHeight: 2.3,
  dampLambda: 2.7,
} as const;

export const SCENE = {
  background: "#d8ceb6",
  fogColor: "#d8ceb6",
  fogNear: 70,
  fogFar: 240,
  groundColor: "#413b32",
  roadColor: "#7d705a",
  roadLineColor: "#c9bda0",
  boundaryColor: "#8a7a5c",
  rockColor: "#8f8a80",
  coneColor: "#e8562d",
  moundColor: "#6f624c",
  patchColor: "#4a4234",
  pondColor: "#2e4142",
  plateColor: "#6b5d42",
  cameraStart: { x: 0, y: 6, z: 8 },
} as const;

export const LOOP = { x: 0, z: -80, radius: 26, width: 7 } as const;

export const PIT_BENCHES = [
  { r: 128, h: 8, color: "#473f33" },
  { r: 144, h: 12, color: "#4d4436" },
  { r: 160, h: 16, color: "#52493a" },
  { r: 176, h: 20, color: "#574e3e" },
] as const;

export const ROCK_SPOTS: ReadonlyArray<readonly [number, number, number]> = [
  [-24, -98, 1.6],
  [24, -96, 1.9],
  [-17, -64, 1.3],
  [58, -92, 2.1],
  [45, 10, 1.5],
  [-40, 42, 2.2],
  [-98, -58, 2.6],
  [-100, 22, 2.3],
  [96, 32, 2.4],
  [98, -42, 2.5],
  [-62, 82, 1.8],
  [88, -86, 1.7],
];

export const CONE_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [0, -2],
  [2.6, -12],
  [-2.8, -24],
  [1.4, -36],
  [-1.6, -48],
  [2.2, -58],
  [0, 6],
  [-30, -90],
  [30, -92],
  [-34, -66],
  [20, -78],
  [38, -56],
];

export const STOCKPILES: ReadonlyArray<readonly [number, number, number, number]> = [
  [78, -78, 16, 10],
  [-80, -70, 14, 9],
  [72, 64, 18, 11],
  [-70, 72, 13, 8],
  [-96, -10, 15, 9],
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
  ...CONE_SPOTS.map(([x, z]) => [x, z, 0.5] as const),
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
    body: "#f5a800",
    bodyDark: "#d98c00",
    chassis: "#23211d",
    tire: "#0f1013",
    rim: "#3a3d42",
    window: "#1f2b36",
    bin: "#f7b733",
  },
} as const;