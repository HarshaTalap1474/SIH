"use client";

import {
  CONE_SPOTS,
  LOOP,
  PATCHES,
  PIT_BENCHES,
  PHYSICS,
  ROCK_SPOTS,
  SCENE,
  STOCKPILES,
} from "@/lib/constants";

function Patch({ x, z, sx, sz }: { x: number; z: number; sx: number; sz: number }) {
  return (
    <mesh position={[x, 0.004, z]} scale={[sx, 1, sz]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial color={SCENE.patchColor} roughness={1} />
    </mesh>
  );
}

function Rock({ x, z, s, i }: { x: number; z: number; s: number; i: number }) {
  return (
    <mesh
      position={[x, s * 0.4, z]}
      scale={s}
      castShadow
      receiveShadow
      rotation={[0, i * 1.7, 0]}
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={SCENE.rockColor} roughness={0.95} flatShading />
    </mesh>
  );
}

function Cone({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.45, 0]} castShadow>
        <coneGeometry args={[0.28, 0.9, 12]} />
        <meshStandardMaterial color={SCENE.coneColor} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.34, 0.36, 0.06, 12]} />
        <meshStandardMaterial color={SCENE.coneColor} roughness={0.9} />
      </mesh>
    </group>
  );
}

function Mound({ x, z, r, h }: { x: number; z: number; r: number; h: number }) {
  return (
    <mesh position={[x, h / 2, z]} castShadow receiveShadow>
      <coneGeometry args={[r, h, 24, 1]} />
      <meshStandardMaterial color={SCENE.moundColor} roughness={1} />
    </mesh>
  );
}

function Bench({ r, h, color }: { r: number; h: number; color: string }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, h / 2, 0]} receiveShadow>
      <torusGeometry args={[r, 8, 16, 96]} />
      <meshStandardMaterial color={color} roughness={1} />
    </mesh>
  );
}

function Loader({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[-0.2, 1.05, 0.2]} castShadow>
        <boxGeometry args={[3.2, 1.5, 4.6]} />
        <meshStandardMaterial color="#e0a52e" roughness={0.6} />
      </mesh>
      <mesh position={[0, 2.1, -1.1]} castShadow>
        <boxGeometry args={[2.3, 1.1, 1.5]} />
        <meshStandardMaterial color="#c48a1e" roughness={0.6} />
      </mesh>
      <mesh position={[0.4, 1.7, 2.6]} castShadow>
        <boxGeometry args={[2.9, 1.3, 1.6]} />
        <meshStandardMaterial color="#2b2621" roughness={0.9} />
      </mesh>
      <mesh position={[0.4, 2.0, 1.7]}>
        <boxGeometry args={[0.4, 0.6, 0.9]} />
        <meshStandardMaterial color="#9a6b1a" roughness={0.7} />
      </mesh>
      {[1.55, -1.55].map((wx) =>
        [1.7, -1.7].map((wz, idx) => (
          <mesh key={`${wx}-${idx}`} position={[wx, 0.95, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.75, 0.75, 0.7, 16]} />
            <meshStandardMaterial color="#121114" roughness={0.95} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Excavator({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, 0.7, 0.4]} castShadow>
        <boxGeometry args={[4.6, 1.2, 3.4]} />
        <meshStandardMaterial color="#c8a32e" roughness={0.6} />
      </mesh>
      <mesh position={[-1.7, 0.5, 0.4]} castShadow>
        <boxGeometry args={[0.9, 0.9, 3.8]} />
        <meshStandardMaterial color="#13110f" roughness={0.95} />
      </mesh>
      <mesh position={[1.7, 0.5, 0.4]} castShadow>
        <boxGeometry args={[0.9, 0.9, 3.8]} />
        <meshStandardMaterial color="#13110f" roughness={0.95} />
      </mesh>
      <mesh position={[1.4, 2.1, 0.8]} castShadow>
        <boxGeometry args={[1.7, 1.4, 1.9]} />
        <meshStandardMaterial color="#a8781c" roughness={0.6} />
      </mesh>
      <mesh position={[2.1, 2.6, 0.8]} castShadow>
        <boxGeometry args={[0.6, 0.5, 1.6]} />
        <meshStandardMaterial color="#1e2a33" roughness={0.4} metalness={0.4} />
      </mesh>
      <mesh position={[-1.8, 3.0, 0.8]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 4.6]} />
        <meshStandardMaterial color="#7d5b14" roughness={0.7} />
      </mesh>
      <mesh position={[-3.2, 2.2, 0.6]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 2.2]} />
        <meshStandardMaterial color="#7d5b14" roughness={0.7} />
      </mesh>
      <mesh position={[-3.9, 1.7, 0.6]} rotation={[-0.6, 0, 0]} castShadow>
        <boxGeometry args={[1.4, 1.1, 1.5]} />
        <meshStandardMaterial color="#2b2621" roughness={0.9} />
      </mesh>
    </group>
  );
}

const RAMP_TILT = Math.atan(5 / 16);

export function Terrain() {
  const loopR = LOOP.radius;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <circleGeometry args={[340, 96]} />
        <meshStandardMaterial color={SCENE.groundColor} roughness={1} />
      </mesh>

      {PATCHES.map(([x, z, sx, sz], i) => (
        <Patch key={`p${i}`} x={x} z={z} sx={sx} sz={sz} />
      ))}

      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[18, 0.1, 380]} />
        <meshStandardMaterial color={SCENE.roadColor} roughness={0.95} />
      </mesh>
      <mesh position={[-8.55, 0.115, 0]}>
        <boxGeometry args={[0.5, 0.03, 380]} />
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.9} />
      </mesh>
      <mesh position={[8.55, 0.115, 0]}>
        <boxGeometry args={[0.5, 0.03, 380]} />
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOOP.x, 0.03, LOOP.z]}>
        <ringGeometry args={[loopR - LOOP.width / 2, loopR + LOOP.width / 2, 96]} />
        <meshStandardMaterial color={SCENE.roadColor} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[LOOP.x, 0.05, LOOP.z]}>
        <ringGeometry args={[loopR + LOOP.width / 2, loopR + LOOP.width / 2 + 0.3, 96]} />
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.9} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <ringGeometry args={[PHYSICS.arenaRadius - 0.5, PHYSICS.arenaRadius, 128]} />
        <meshStandardMaterial color={SCENE.boundaryColor} />
      </mesh>

      <mesh position={[-55, 0.045, 35]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[11, 32]} />
        <meshStandardMaterial color={SCENE.pondColor} roughness={0.5} />
      </mesh>
      <mesh position={[-55, 0.02, 35]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[11, 12.4, 32]} />
        <meshStandardMaterial color={SCENE.patchColor} roughness={1} />
      </mesh>

      <mesh position={[52, 2.55, -62]} castShadow receiveShadow>
        <cylinderGeometry args={[12, 12, 5, 28]} />
        <meshStandardMaterial color={SCENE.plateColor} roughness={1} />
      </mesh>
      <group position={[36, 0.5, -62]} rotation={[0, 0, RAMP_TILT]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[16, 1, 8]} />
          <meshStandardMaterial color={SCENE.roadColor} roughness={0.95} />
        </mesh>
      </group>
      <Mound x={55} z={-67} r={5} h={3.2} />
      <Mound x={48} z={-56} r={4.5} h={2.8} />
      <Loader x={47} z={-62} rot={-Math.PI / 2 + 0.5} />
      <Excavator x={-70} z={-30} rot={0.8} />

      {STOCKPILES.map(([x, z, r, h], i) => (
        <Mound key={`s${i}`} x={x} z={z} r={r} h={h} />
      ))}

      {ROCK_SPOTS.map(([x, z, s], i) => (
        <Rock key={`r${i}`} x={x} z={z} s={s} i={i} />
      ))}
      {CONE_SPOTS.map(([x, z], i) => (
        <Cone key={`c${i}`} x={x} z={z} />
      ))}

      {PIT_BENCHES.map((b, i) => (
        <Bench key={`b${i}`} r={b.r} h={b.h} color={b.color} />
      ))}

      <Mound x={135} z={-60} r={30} h={16} />
      <Mound x={150} z={55} r={24} h={14} />
      <Mound x={-140} z={50} r={26} h={15} />
      <Mound x={-150} z={-30} r={28} h={16} />
      <Mound x={12} z={150} r={26} h={14} />
      <Mound x={10} z={-150} r={30} h={16} />
    </group>
  );
}