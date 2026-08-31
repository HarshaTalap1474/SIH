"use client";

import * as THREE from "three";
import {
  PATCHES,
  PIT_BENCHES,
  PHYSICS,
  ROCK_SPOTS,
  SCENE,
  STOCKPILES,
} from "@/lib/constants";

// Safety berms along the main haul road to prevent falling into the pit
function RoadBerms() {
  return (
    <group>
      {/* Left Berm */}
      <mesh position={[-9.6, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 1.3, 380, 8]} />
        <meshStandardMaterial color={SCENE.roadBermColor} roughness={0.95} />
      </mesh>
      {/* Right Berm */}
      <mesh position={[9.6, 0.45, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.5, 1.3, 380, 8]} />
        <meshStandardMaterial color={SCENE.roadBermColor} roughness={0.95} />
      </mesh>
    </group>
  );
}

// Mining Road Signs
function MineSign({ x, z, text, rot = 0 }: { x: number; z: number; text: string; rot?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      {/* Steel Post */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 3.0, 8]} />
        <meshStandardMaterial color="#78716c" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Sign Board */}
      <mesh position={[0, 2.5, 0.05]} castShadow>
        <boxGeometry args={[1.6, 0.9, 0.08]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} />
      </mesh>
      {/* Sign Border Accent */}
      <mesh position={[0, 2.5, 0.1]}>
        <boxGeometry args={[1.45, 0.75, 0.02]} />
        <meshStandardMaterial color="#09090b" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Patch({ x, z, sx, sz }: { x: number; z: number; sx: number; sz: number }) {
  return (
    <mesh position={[x, 0.015, z]} scale={[sx, 1, sz]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[1, 24]} />
      <meshStandardMaterial
        color={SCENE.patchColor}
        roughness={1}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
}

function Rock({ x, z, s, i }: { x: number; z: number; s: number; i: number }) {
  const isHighGrade = i % 3 === 0;
  return (
    <group position={[x, s * 0.45, z]} scale={s} rotation={[0.2 * (i % 3), i * 1.7, 0.1 * (i % 2)]}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial
          color={isHighGrade ? SCENE.rockHighGrade : SCENE.rockColor}
          roughness={0.9}
          metalness={isHighGrade ? 0.3 : 0.05}
          flatShading
        />
      </mesh>
    </group>
  );
}


function Mound({ x, z, r, h, isHighGrade = false }: { x: number; z: number; r: number; h: number; isHighGrade?: boolean }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h * 0.48, 0]} castShadow receiveShadow>
        <coneGeometry args={[r, h, 28, 2]} />
        <meshStandardMaterial
          color={isHighGrade ? SCENE.rockHighGrade : SCENE.moundColor}
          roughness={0.98}
          metalness={isHighGrade ? 0.25 : 0.05}
          flatShading
        />
      </mesh>
    </group>
  );
}

function BenchTerrace({ r, h, color, topColor }: { r: number; h: number; color: string; topColor: string }) {
  return (
    <group position={[0, 0, 0]}>
      <mesh position={[0, h / 2, 0]} receiveShadow>
        <cylinderGeometry args={[r + 8, r, h, 64, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, h, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[r, r + 16, 64]} />
        <meshStandardMaterial color={topColor} roughness={1} />
      </mesh>
    </group>
  );
}

function Loader({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[-0.2, 1.25, 0.2]} castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.6, 4.8]} />
        <meshStandardMaterial color="#d97706" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.45, -1.1]} castShadow>
        <boxGeometry args={[2.3, 1.3, 1.6]} />
        <meshStandardMaterial color="#b45309" roughness={0.5} />
      </mesh>
      <mesh position={[0, 2.5, -1.91]}>
        <boxGeometry args={[2.0, 0.9, 0.1]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[0, 1.8, 2.2]} rotation={[-0.3, 0, 0]} castShadow>
        <boxGeometry args={[2.2, 0.4, 3.2]} />
        <meshStandardMaterial color="#78350f" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.1, 3.6]} rotation={[0.1, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 1.4, 1.8]} />
        <meshStandardMaterial color="#292524" roughness={0.85} metalness={0.4} />
      </mesh>
      {[1.65, -1.65].map((wx) =>
        [1.8, -1.8].map((wz, idx) => (
          <mesh key={`${wx}-${idx}`} position={[wx, 1.0, wz]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[1.0, 1.0, 0.85, 20]} />
            <meshStandardMaterial color="#0c0a09" roughness={0.95} />
          </mesh>
        ))
      )}
    </group>
  );
}

function Excavator({ x, z, rot }: { x: number; z: number; rot: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rot, 0]}>
      <mesh position={[-1.8, 0.65, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.2, 4.8]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
      <mesh position={[1.8, 0.65, 0.4]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.2, 4.8]} />
        <meshStandardMaterial color="#1c1917" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.9, 0.4]} castShadow>
        <boxGeometry args={[2.6, 0.6, 3.8]} />
        <meshStandardMaterial color="#292524" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.1, 0.3]} castShadow>
        <boxGeometry args={[3.8, 1.8, 4.0]} />
        <meshStandardMaterial color="#d97706" roughness={0.5} metalness={0.2} />
      </mesh>
      <mesh position={[0, 2.2, -1.8]} castShadow>
        <boxGeometry args={[3.6, 1.6, 1.2]} />
        <meshStandardMaterial color="#78350f" roughness={0.7} />
      </mesh>
      <mesh position={[1.4, 2.9, 1.1]} castShadow>
        <boxGeometry args={[1.4, 1.5, 1.8]} />
        <meshStandardMaterial color="#b45309" roughness={0.5} />
      </mesh>
      <mesh position={[1.4, 3.0, 2.01]}>
        <boxGeometry args={[1.2, 1.1, 0.05]} />
        <meshStandardMaterial color="#0f172a" roughness={0.2} metalness={0.8} />
      </mesh>
      <mesh position={[-0.8, 3.8, 2.4]} rotation={[0.45, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.8, 6.2]} />
        <meshStandardMaterial color="#92400e" roughness={0.6} />
      </mesh>
      <mesh position={[-0.8, 4.5, 5.8]} rotation={[-0.8, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 4.4]} />
        <meshStandardMaterial color="#92400e" roughness={0.6} />
      </mesh>
      <mesh position={[-0.8, 2.3, 6.8]} rotation={[-0.3, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.8, 1.5, 1.8]} />
        <meshStandardMaterial color="#1c1917" roughness={0.85} metalness={0.4} />
      </mesh>
    </group>
  );
}

const RAMP_TILT = Math.atan(5 / 16);

export function Terrain() {
  return (
    <group>
      {/* Base Quarry Pit Floor — Solid 3D Base */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[340, 340, 0.4, 64]} />
        <meshStandardMaterial color={SCENE.groundColor} roughness={0.98} />
      </mesh>

      {/* Iron-Ore Mineral Color Variations (patches) */}
      {PATCHES.map(([x, z, sx, sz], i) => (
        <Patch key={`p${i}`} x={x} z={z} sx={sx} sz={sz} />
      ))}

      {/* Main 18m Wide Unpaved Haul Road */}
      <mesh position={[0, 0.04, 0]} receiveShadow>
        <boxGeometry args={[18, 0.08, 380]} />
        <meshStandardMaterial color={SCENE.roadColor} roughness={0.92} />
      </mesh>

      {/* Compacted Heavy Tire Track Ruts on Haul Road */}
      <mesh position={[-3.6, 0.042, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.082, 380]} />
        <meshStandardMaterial color="#261f1a" roughness={0.96} />
      </mesh>
      <mesh position={[3.6, 0.042, 0]} receiveShadow>
        <boxGeometry args={[2.4, 0.082, 380]} />
        <meshStandardMaterial color="#261f1a" roughness={0.96} />
      </mesh>

      {/* Safety Edge Berms along Haul Road */}
      <RoadBerms />

      {/* High-Visibility Road Edge Guides */}
      <mesh position={[-8.4, 0.085, 0]}>
        <boxGeometry args={[0.4, 0.02, 380]} />
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.8} />
      </mesh>
      <mesh position={[8.4, 0.085, 0]}>
        <boxGeometry args={[0.4, 0.02, 380]} />
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.8} />
      </mesh>

      {/* Mine Perimeter Boundary Berm */}
      <mesh position={[0, 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[PHYSICS.arenaRadius, 1.2, 8, 96]} />
        <meshStandardMaterial color={SCENE.boundaryColor} roughness={0.95} />
      </mesh>

      {/* Mine Drainage Sump / Silt Pond */}
      <group position={[-55, 0, 35]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[11, 9, 0.3, 32]} />
          <meshStandardMaterial color={SCENE.pondColor} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[11.2, 0.6, 8, 32]} />
          <meshStandardMaterial color={SCENE.rockColor} roughness={0.95} />
        </mesh>
      </group>

      {/* Elevated Primary Crusher / Dump Platform */}
      <mesh position={[52, 2.5, -62]} castShadow receiveShadow>
        <cylinderGeometry args={[13, 14, 5, 32]} />
        <meshStandardMaterial color={SCENE.plateColor} roughness={0.95} />
      </mesh>
      {/* Loading Ramp to platform */}
      <group position={[36, 0.7, -62]} rotation={[0, 0, RAMP_TILT]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[16, 1.2, 9]} />
          <meshStandardMaterial color={SCENE.roadColor} roughness={0.92} />
        </mesh>
      </group>

      {/* High-Grade Iron Ore Stockpiles & Blast Piles */}
      <Mound x={55} z={-67} r={6} h={3.8} isHighGrade />
      <Mound x={48} z={-56} r={5} h={3.2} isHighGrade />
      <Loader x={47} z={-62} rot={-Math.PI / 2 + 0.5} />
      <Excavator x={-70} z={-30} rot={0.8} />

      {/* Major Open-Pit Stockpiles */}
      {STOCKPILES.map(([x, z, r, h], i) => (
        <Mound key={`s${i}`} x={x} z={z} r={r} h={h} isHighGrade={i % 2 === 0} />
      ))}

      {/* Large Iron Ore Boulders & Rocks */}
      {ROCK_SPOTS.map(([x, z, s], i) => (
        <Rock key={`r${i}`} x={x} z={z} s={s} i={i} />
      ))}

      {/* Stepped Terraced Pit Benches (Bailadila Open-Cast Mine Walls) */}
      {PIT_BENCHES.map((b, i) => (
        <BenchTerrace key={`b${i}`} r={b.r} h={b.h} color={b.color} topColor={b.topColor} />
      ))}

      {/* Outer Mountain Ridges & Mine Pit Rim */}
      <Mound x={135} z={-60} r={32} h={20} />
      <Mound x={155} z={55} r={28} h={18} />
      <Mound x={-145} z={50} r={30} h={19} />
      <Mound x={-155} z={-30} r={32} h={20} />
      <Mound x={12} z={155} r={28} h={18} />
      <Mound x={10} z={-155} r={32} h={20} />

      {/* Mining Safety Road Signs */}
      <MineSign x={-11} z={-40} text="SPEED 20" rot={0.2} />
      <MineSign x={11} z={-100} text="CAUTION FOG" rot={-0.2} />
      <MineSign x={-11} z={-160} text="HAUL ROAD" rot={0.1} />
    </group>
  );
}