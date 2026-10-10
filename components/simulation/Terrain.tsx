"use client";

import { useMemo } from "react";
import * as THREE from "three";
import {
  GRAVEL_CLUSTERS,
  HEAVY_EQUIPMENT,
  LIGHT_TOWERS,
  PATCHES,
  ROAD_SIGNS,
  ROCK_SPOTS,
  SCENE,
  STOCKPILES,
  UTILITY_POLES,
  getHaulRoadCenterlineY,
  getRoadCenterline,
  getRoadEdgePoint,
  getRoadElevation,
  getRoadWidth,
  getTerrainElevation,
} from "@/lib/constants";
import { useSim } from "@/lib/simStore";

// Procedural high-resolution canvas texture for realistic haul road surface
function useRoadTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Base compacted haul road dirt
    ctx.fillStyle = "#2a221c";
    ctx.fillRect(0, 0, 512, 512);

    // Lateral gravel grain and fine soil grading lines
    for (let i = 0; i < 900; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const size = 1 + Math.random() * 2.6;
      const shade =
        Math.random() > 0.6
          ? "rgba(18, 14, 11, 0.55)"
          : Math.random() > 0.3
          ? "rgba(78, 52, 38, 0.45)"
          : "rgba(115, 75, 52, 0.35)";
      ctx.fillStyle = shade;
      ctx.fillRect(rx, ry, size, size);
    }

    // Heavy compacted wheel track ruts (dual lanes at normalized coordinates ~0.3 and ~0.7)
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, "rgba(22, 17, 13, 0.35)");
    grad.addColorStop(0.16, "rgba(25, 20, 16, 0.65)");
    grad.addColorStop(0.32, "rgba(14, 10, 8, 0.95)"); // left rut
    grad.addColorStop(0.44, "rgba(48, 38, 30, 0.40)"); // road center crown
    grad.addColorStop(0.56, "rgba(48, 38, 30, 0.40)");
    grad.addColorStop(0.68, "rgba(14, 10, 8, 0.95)"); // right rut
    grad.addColorStop(0.84, "rgba(25, 20, 16, 0.65)");
    grad.addColorStop(1.0, "rgba(22, 17, 13, 0.35)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Tread impression bars in ruts
    ctx.fillStyle = "rgba(10, 8, 6, 0.50)";
    for (let y = 0; y < 512; y += 14) {
      ctx.fillRect(132, y, 70, 5);
      ctx.fillRect(310, y, 70, 5);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 24);
    return tex;
  }, []);
}

// Procedural gritty mineral texture for quarry pit floor
function useQuarryFloorTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Rich deep iron-ore soil base
    ctx.fillStyle = "#3b2217";
    ctx.fillRect(0, 0, 512, 512);

    // Mineral noise, blast dust & hematite streaks
    for (let i = 0; i < 1100; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const s = 1 + Math.random() * 3.8;
      const r = Math.random();
      ctx.fillStyle =
        r > 0.65
          ? "rgba(115, 34, 24, 0.50)" // rich red hematite ore
          : r > 0.35
          ? "rgba(24, 20, 18, 0.60)" // dark magnetite shale
          : "rgba(132, 60, 18, 0.40)"; // yellow-brown limonite
      ctx.fillRect(rx, ry, s, s);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    return tex;
  }, []);
}

// Mining Road Signs with retro-reflective industrial faces
function MineSign({ x, y = 0, z, text, rot = 0 }: { x: number; y?: number; z: number; text: string; rot?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* Concrete Base */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[0.6, 0.4, 0.6]} />
        <meshStandardMaterial color="#57534e" roughness={0.9} />
      </mesh>
      {/* Dual Steel Galvanized Channel Posts */}
      {[-0.35, 0.35].map((px) => (
        <mesh key={px} position={[px, 1.6, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 2.8, 6]} />
          <meshStandardMaterial color="#78716c" roughness={0.4} metalness={0.7} />
        </mesh>
      ))}
      {/* Sign Backplate */}
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[1.85, 1.05, 0.06]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>
      {/* High-Vis Reflective Yellow Hazard Face */}
      <mesh position={[0, 2.55, 0.04]}>
        <boxGeometry args={[1.72, 0.92, 0.02]} />
        <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={0.35} roughness={0.3} />
      </mesh>
      {/* Black Inner Warning Border */}
      <mesh position={[0, 2.55, 0.055]}>
        <boxGeometry args={[1.58, 0.78, 0.01]} />
        <meshStandardMaterial color="#09090b" roughness={0.6} />
      </mesh>
      {/* Yellow Center Text Field */}
      <mesh position={[0, 2.55, 0.065]}>
        <boxGeometry args={[1.44, 0.64, 0.01]} />
        <meshStandardMaterial color="#f59e0b" emissive="#b45309" emissiveIntensity={0.4} roughness={0.3} />
      </mesh>
    </group>
  );
}

// High-Mast Mining Floodlight Tower (12m steel lattice with generator & downlights)
function HighMastLight({ x, y = 0, z, rot = 0 }: { x: number; y?: number; z: number; rot?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* Heavy Concrete Foundation Base */}
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.2, 0.8, 2.2]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>
      {/* Diesel Generator / Power Housing */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <boxGeometry args={[1.8, 0.8, 1.4]} />
        <meshStandardMaterial color="#1c1917" roughness={0.7} metalness={0.6} />
      </mesh>
      {/* 4-Leg Lattice Tower Mast (12m height) */}
      <mesh position={[0, 6.8, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.55, 11, 4]} />
        <meshStandardMaterial color="#78716c" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Top Catwalk Platform */}
      <mesh position={[0, 12.4, 0]} castShadow>
        <boxGeometry args={[1.8, 0.15, 1.8]} />
        <meshStandardMaterial color="#292524" roughness={0.5} metalness={0.7} />
      </mesh>
      {/* Platform Safety Railings */}
      <mesh position={[0, 12.8, 0]}>
        <boxGeometry args={[1.75, 0.65, 1.75]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.5} wireframe />
      </mesh>
      {/* 2 Angled High-Power LED Floodlight Fixtures */}
      {[-0.5, 0.5].map((fx) => (
        <group key={fx} position={[fx, 12.6, 0.6]} rotation={[0.65, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.45, 0.35, 0.2]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0, 0.11]}>
            <planeGeometry args={[0.4, 0.3]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}
      {/* Downward Floodlight Cone Beam illuminating work area */}
      <spotLight
        position={[0, 12.6, 0]}
        target-position={[0, 0, 12]}
        intensity={65}
        distance={52}
        angle={0.75}
        penumbra={0.75}
        color="#fef3c7"
      />
    </group>
  );
}

// Heavy Industrial Power Utility Poles along pit rim
function UtilityPole({ x, y = 0, z, rot = 0 }: { x: number; y?: number; z: number; rot?: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
      {/* Concrete Footing */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.8, 8]} />
        <meshStandardMaterial color="#44403c" roughness={0.9} />
      </mesh>
      {/* Heavy Timber / Steel Utility Pole */}
      <mesh position={[0, 5.5, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 10.5, 8]} />
        <meshStandardMaterial color="#292524" roughness={0.7} />
      </mesh>
      {/* Crossarm 1 */}
      <mesh position={[0, 9.8, 0]} castShadow>
        <boxGeometry args={[2.2, 0.12, 0.12]} />
        <meshStandardMaterial color="#78716c" roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Ceramic Insulators */}
      {[-0.9, 0, 0.9].map((ix) => (
        <mesh key={ix} position={[ix, 10.0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
      {/* Crossarm 2 */}
      <mesh position={[0, 8.6, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.12]} />
        <meshStandardMaterial color="#78716c" roughness={0.5} metalness={0.6} />
      </mesh>
      {[-0.7, 0.7].map((ix) => (
        <mesh key={ix} position={[ix, 8.8, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.22, 6]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.2} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
}

// Construction Loader
function Loader({ x, y = 0, z, rot }: { x: number; y?: number; z: number; rot: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
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

// Construction Excavator
function Excavator({ x, y = 0, z, rot }: { x: number; y?: number; z: number; rot: number }) {
  return (
    <group position={[x, y, z]} rotation={[0, rot, 0]}>
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

function Mound({ x, y = 0, z, r, h, isHighGrade = false }: { x: number; y?: number; z: number; r: number; h: number; isHighGrade?: boolean }) {
  return (
    <group position={[x, y, z]}>
      {/* Subterranean extended cone ensures zero floating gaps on uneven slopes */}
      <mesh position={[0, (h + 0.8) * 0.5 - 0.4, 0]} castShadow receiveShadow>
        <coneGeometry args={[r, h + 0.8, 28, 2]} />
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

function Rock({ x, y = 0, z, s, i }: { x: number; y?: number; z: number; s: number; i: number }) {
  const isHighGrade = i % 3 === 0;
  return (
    <group position={[x, y + s * 0.45, z]} scale={s} rotation={[0.2 * (i % 3), i * 1.7, 0.1 * (i % 2)]}>
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

function Patch({ x, y = 0, z, sx, sz }: { x: number; y?: number; z: number; sx: number; sz: number }) {
  return (
    <mesh position={[x, y + 0.02, z]} scale={[sx, 1, sz]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
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

// Scattered Roadside Gravel Clusters & Micro-boulders along curved road
function RoadsideGravelClusters() {
  return (
    <group>
      {GRAVEL_CLUSTERS.map(([gx, gz, gs], i) => {
        const signU = gx < 0 ? -11.2 : 11.2;
        const pt = getRoadEdgePoint(gz, signU);
        const gy = getTerrainElevation(pt.x, pt.z);
        return (
          <group key={i} position={[pt.x, gy + 0.12, pt.z]} scale={gs}>
            <mesh castShadow receiveShadow rotation={[0.2, i * 1.5, 0.1]}>
              <dodecahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial color="#57534e" roughness={0.95} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.4, -0.05, 0.2]}>
              <dodecahedronGeometry args={[0.3, 0]} />
              <meshStandardMaterial color="#6b2118" roughness={0.92} flatShading />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ============================================================================
// TRUE 3D CURVED & ELEVATED HAUL ROAD MESH GENERATOR (SWEPT 0.75m STEP)
// ============================================================================
function useCurvedHaulRoadGeometry() {
  return useMemo(() => {
    const zStart = -200;
    const zEnd = 200;
    const stepZ = 0.75;
    const rows = Math.round((zEnd - zStart) / stepZ) + 1;
    const cols = 28;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const z = zStart + r * stepZ;
      const { x: cx, heading } = getRoadCenterline(z);
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const halfW = getRoadWidth(z) * 0.5;

      for (let c = 0; c <= cols; c++) {
        const uFrac = c / cols;
        const u = -halfW + uFrac * (2 * halfW);
        const vx = cx + u * cosH;
        const vz = z - u * sinH;
        const vy = getRoadElevation(vx, vz) + 0.015;

        vertices.push(vx, vy, vz);
        uvs.push(uFrac, (r / (rows - 1)) * 34);
      }
    }

    const rowStride = cols + 1;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * rowStride + c;
        const i1 = i0 + 1;
        const i2 = (r + 1) * rowStride + c;
        const i3 = i2 + 1;

        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, []);
}

// Conforming 3D Curved Road Lane Marking Strips
function useCurvedRoadLineGeometry(side: "left" | "right") {
  return useMemo(() => {
    const zStart = -200;
    const zEnd = 200;
    const stepZ = 0.75;
    const rows = Math.round((zEnd - zStart) / stepZ) + 1;
    const halfLineWidth = 0.2; // 0.4m total width

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const z = zStart + r * stepZ;
      const { x: cx, heading } = getRoadCenterline(z);
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const roadHalfW = getRoadWidth(z) * 0.5;
      const centerU = side === "left" ? -(roadHalfW - 0.6) : (roadHalfW - 0.6);

      const uLeft = centerU - halfLineWidth;
      const uRight = centerU + halfLineWidth;

      const xL = cx + uLeft * cosH;
      const zL = z - uLeft * sinH;
      const yL = getRoadElevation(xL, zL) + 0.038;

      const xR = cx + uRight * cosH;
      const zR = z - uRight * sinH;
      const yR = getRoadElevation(xR, zR) + 0.038;

      vertices.push(xL, yL, zL, xR, yR, zR);
    }

    for (let r = 0; r < rows - 1; r++) {
      const i0 = r * 2;
      const i1 = i0 + 1;
      const i2 = (r + 1) * 2;
      const i3 = i2 + 1;

      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [side]);
}

// Conforming 3D Curved Heavy Tire Track Ruts (Standing water sheen)
function useCurvedRutGeometry(side: "left" | "right") {
  return useMemo(() => {
    const zStart = -200;
    const zEnd = 200;
    const stepZ = 0.75;
    const rows = Math.round((zEnd - zStart) / stepZ) + 1;
    const halfRutWidth = 1.15;

    const vertices: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r < rows; r++) {
      const z = zStart + r * stepZ;
      const { x: cx, heading } = getRoadCenterline(z);
      const cosH = Math.cos(heading);
      const sinH = Math.sin(heading);
      const roadHalfW = getRoadWidth(z) * 0.5;
      const centerU = side === "left" ? -(roadHalfW * 0.4) : (roadHalfW * 0.4);

      const uLeft = centerU - halfRutWidth;
      const uRight = centerU + halfRutWidth;

      const xL = cx + uLeft * cosH;
      const zL = z - uLeft * sinH;
      const yL = getRoadElevation(xL, zL) + 0.022;

      const xR = cx + uRight * cosH;
      const zR = z - uRight * sinH;
      const yR = getRoadElevation(xR, zR) + 0.022;

      vertices.push(xL, yL, zL, xR, yR, zR);
    }

    for (let r = 0; r < rows - 1; r++) {
      const i0 = r * 2;
      const i1 = i0 + 1;
      const i2 = (r + 1) * 2;
      const i3 = i2 + 1;

      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [side]);
}

// Continuous 3D Curved Earthen Safety Berm Geometry
function useCurvedBermGeometry(side: "left" | "right") {
  return useMemo(() => {
    const skipMin = side === "left" ? -38 : -72;
    const skipMax = side === "left" ? -22 : -52;

    const vertices: number[] = [];
    const indices: number[] = [];
    const stepZ = 1.0;
    let vertCount = 0;

    for (let z = -200; z < 200; z += stepZ) {
      const zNext = Math.min(200, z + stepZ);
      if ((z >= skipMin && z <= skipMax) || (zNext >= skipMin && zNext <= skipMax)) {
        continue;
      }

      const roadHalfW1 = getRoadWidth(z) * 0.5;
      const roadHalfW2 = getRoadWidth(zNext) * 0.5;
      const centerU1 = side === "left" ? -(roadHalfW1 + 0.8) : (roadHalfW1 + 0.8);
      const centerU2 = side === "left" ? -(roadHalfW2 + 0.8) : (roadHalfW2 + 0.8);

      const p1 = getRoadEdgePoint(z, centerU1);
      const p2 = getRoadEdgePoint(zNext, centerU2);
      const yBase1 = getTerrainElevation(p1.x, p1.z);
      const yBase2 = getTerrainElevation(p2.x, p2.z);
      const h1 = yBase1 + 0.85;
      const h2 = yBase2 + 0.85;

      const { heading: hg1 } = getRoadCenterline(z);
      const { heading: hg2 } = getRoadCenterline(zNext);
      const cos1 = Math.cos(hg1);
      const sin1 = Math.sin(hg1);
      const cos2 = Math.cos(hg2);
      const sin2 = Math.sin(hg2);

      const sign = side === "left" ? -1 : 1;
      const halfW = 0.85;

      const xIn1 = p1.x - sign * halfW * cos1;
      const zIn1 = p1.z + sign * halfW * sin1;
      const xOut1 = p1.x + sign * (halfW + 0.4) * cos1;
      const zOut1 = p1.z - sign * (halfW + 0.4) * sin1;

      const xIn2 = p2.x - sign * halfW * cos2;
      const zIn2 = p2.z + sign * halfW * sin2;
      const xOut2 = p2.x + sign * (halfW + 0.4) * cos2;
      const zOut2 = p2.z - sign * (halfW + 0.4) * sin2;

      const b = vertCount;
      vertices.push(
        xIn1, yBase1, zIn1,
        p1.x, h1, p1.z,
        xOut1, yBase1 - 0.25, zOut1,
        xIn2, yBase2, zIn2,
        p2.x, h2, p2.z,
        xOut2, yBase2 - 0.25, zOut2
      );

      // Inner face
      indices.push(b, b + 3, b + 1);
      indices.push(b + 1, b + 3, b + 4);

      // Outer face
      indices.push(b + 1, b + 4, b + 2);
      indices.push(b + 2, b + 4, b + 5);

      vertCount += 6;
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [side]);
}

// Conforming Open-Pit Quarry Floor & Seamless Mountain Topography (480m x 480m grid)
function useConformingPitFloorGeometry() {
  return useMemo(() => {
    // 480m x 480m high-resolution terrain grid (192 x 192 subdivisions)
    const geom = new THREE.PlaneGeometry(480, 480, 192, 192);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = getTerrainElevation(x, z);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    geom.computeVertexNormals();
    return geom;
  }, []);
}

// Spoil / Waste Rock Dumps (Anchored subterranean into terrain)
function SpoilDump({
  x,
  z,
  r,
  h,
  rot = 0,
}: {
  x: number;
  z: number;
  r: number;
  h: number;
  rot?: number;
}) {
  const y = getTerrainElevation(x, z);
  return (
    <group position={[x, y - 0.5, z]} rotation={[0, rot, 0]}>
      <mesh position={[0, (h + 1.0) * 0.35, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.65, r, (h + 1.0) * 0.7, 24]} />
        <meshStandardMaterial color="#42251a" roughness={0.96} flatShading />
      </mesh>
      <mesh position={[0, (h + 1.0) * 0.78, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r * 0.35, r * 0.62, (h + 1.0) * 0.44, 20]} />
        <meshStandardMaterial color="#542c1e" roughness={0.94} flatShading />
      </mesh>
    </group>
  );
}

const RAMP_TILT = Math.atan(5 / 16);

const ROAD_RAIN_STYLES = {
  high: { roadColor: "#181412", roadRough: 0.28, roadMetal: 0.42, rutColor: "#120e0b", rutRough: 0.16, rutMetal: 0.55 },
  medium: { roadColor: "#221c19", roadRough: 0.52, roadMetal: 0.22, rutColor: "#1a1512", rutRough: 0.36, rutMetal: 0.32 },
  none: { roadColor: SCENE.roadColor, roadRough: 0.92, roadMetal: 0.02, rutColor: "#221b16", rutRough: 0.96, rutMetal: 0.02 },
} as const;

export function Terrain() {
  const rainMode = useSim((s) => s.rainMode);
  const roadStyle = ROAD_RAIN_STYLES[rainMode];
  const roadTex = useRoadTexture();
  const floorTex = useQuarryFloorTexture();

  // Generated True 3D Curved & Elevated Geometries
  const roadGeom = useCurvedHaulRoadGeometry();
  const leftLineGeom = useCurvedRoadLineGeometry("left");
  const rightLineGeom = useCurvedRoadLineGeometry("right");
  const leftRutGeom = useCurvedRutGeometry("left");
  const rightRutGeom = useCurvedRutGeometry("right");
  const leftBermGeom = useCurvedBermGeometry("left");
  const rightBermGeom = useCurvedBermGeometry("right");
  const pitFloorGeom = useConformingPitFloorGeometry();

  return (
    <group>
      {/* 1. Conforming Open-Pit Quarry Floor (Molded seamlessly around the 3D road, zero intersecting walls) */}
      <mesh geometry={pitFloorGeom} receiveShadow>
        <meshStandardMaterial map={floorTex || undefined} color={SCENE.groundColor} roughness={0.96} />
      </mesh>

      {/* 2. Iron-Ore Mineral Color Variations (patches) - Removed flat 2D discs that sliced through 3D terrain */}

      {/* 3. Main 18m Wide 3D Curved & Elevated Haul Road */}
      <mesh geometry={roadGeom} receiveShadow castShadow>
        <meshStandardMaterial
          map={roadTex || undefined}
          color={roadStyle.roadColor}
          roughness={roadStyle.roadRough}
          metalness={roadStyle.roadMetal}
        />
      </mesh>

      {/* 4. Compacted Heavy Tire Track Ruts (Standing water sheen) */}
      <mesh geometry={leftRutGeom} receiveShadow>
        <meshStandardMaterial color={roadStyle.rutColor} roughness={roadStyle.rutRough} metalness={roadStyle.rutMetal} />
      </mesh>
      <mesh geometry={rightRutGeom} receiveShadow>
        <meshStandardMaterial color={roadStyle.rutColor} roughness={roadStyle.rutRough} metalness={roadStyle.rutMetal} />
      </mesh>

      {/* 5. High-Visibility Road Edge Guides (Conforming Yellow Lane Markings) */}
      <mesh geometry={leftLineGeom}>
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.8} />
      </mesh>
      <mesh geometry={rightLineGeom}>
        <meshStandardMaterial color={SCENE.roadLineColor} roughness={0.8} />
      </mesh>

      {/* 6. Continuous 3D Earthen Safety Berms following the curved 3D road */}
      <mesh geometry={leftBermGeom} receiveShadow castShadow>
        <meshStandardMaterial color="#422417" roughness={0.96} side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={rightBermGeom} receiveShadow castShadow>
        <meshStandardMaterial color="#422417" roughness={0.96} side={THREE.DoubleSide} />
      </mesh>

      {/* 7. Overburden Spoil Dumps & Waste Rock Piles */}
      <SpoilDump x={-65} z={-110} r={22} h={14} rot={0.4} />
      <SpoilDump x={75} z={-120} r={24} h={15} rot={-0.6} />
      <SpoilDump x={-85} z={115} r={26} h={16} rot={0.8} />
      <SpoilDump x={80} z={125} r={28} h={17} rot={-0.3} />

      {/* 8. Roadside Gravel Clusters & Micro-Boulders */}
      <RoadsideGravelClusters />

      {/* 9. Industrial High-Mast Floodlight Towers Illuminating Work Areas */}
      {LIGHT_TOWERS.map((t, i) => {
        const pt = getRoadEdgePoint(t.z, t.x < 0 ? -18.5 : 18.5);
        return (
          <HighMastLight key={`light-${i}`} x={pt.x} y={getTerrainElevation(pt.x, pt.z)} z={pt.z} rot={t.rot} />
        );
      })}

      {/* 10. Heavy Industrial Power Utility Poles along quarry perimeter */}
      {UTILITY_POLES.map((p, i) => (
        <UtilityPole key={`pole-${i}`} x={p.x} y={getTerrainElevation(p.x, p.z)} z={p.z} rot={p.rot} />
      ))}

      {/* 11. Mine Drainage Sump / Silt Pond (grounded at terrain elevation) */}
      <group position={[-55, getTerrainElevation(-55, 35), 35]}>
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[11, 9, 0.3, 32]} />
          <meshStandardMaterial color={SCENE.pondColor} roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[11.2, 0.6, 8, 32]} />
          <meshStandardMaterial color={SCENE.rockColor} roughness={0.95} />
        </mesh>
      </group>

      {/* 12. Elevated Primary Crusher / Dump Platform */}
      <group position={[52, getTerrainElevation(52, -62), -62]}>
        <mesh position={[0, 2.5, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[13, 14, 5, 32]} />
          <meshStandardMaterial color={SCENE.plateColor} roughness={0.95} />
        </mesh>
      </group>
      {/* Loading Ramp to platform */}
      <group position={[36, getTerrainElevation(36, -62) + 0.7, -62]} rotation={[0, 0, RAMP_TILT]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[16, 1.2, 9]} />
          <meshStandardMaterial color={SCENE.roadColor} roughness={0.92} />
        </mesh>
      </group>

      {/* 13. Heavy Quarry Machinery (anchored to ground) */}
      <Loader x={47} y={getTerrainElevation(47, -62)} z={-62} rot={-Math.PI / 2 + 0.5} />
      <Excavator x={-70} y={getTerrainElevation(-70, -30)} z={-30} rot={0.8} />

      {/* 14. High-Grade Iron Ore Stockpiles & Blast Piles */}
      <Mound x={55} y={getTerrainElevation(55, -67)} z={-67} r={6} h={3.8} isHighGrade />
      <Mound x={48} y={getTerrainElevation(48, -56)} z={-56} r={5} h={3.2} isHighGrade />

      {/* Major Open-Pit Stockpiles */}
      {STOCKPILES.map(([x, z, r, h], i) => (
        <Mound key={`s${i}`} x={x} y={getTerrainElevation(x, z)} z={z} r={r} h={h} isHighGrade={i % 2 === 0} />
      ))}

      {/* Large Iron Ore Boulders & Rocks */}
      {ROCK_SPOTS.map(([x, z, s], i) => (
        <Rock key={`r${i}`} x={x} y={getTerrainElevation(x, z)} z={z} s={s} i={i} />
      ))}


      {/* Mining Safety Road Signs Along Haul Road */}
      {ROAD_SIGNS.map((s, i) => {
        const signU = s.x < 0 ? -10.8 : 10.8;
        const pt = getRoadEdgePoint(s.z, signU);
        const sy = getTerrainElevation(pt.x, pt.z);
        return (
          <MineSign key={`sign-${i}`} x={pt.x} y={sy} z={pt.z} text={s.text} rot={s.rot} />
        );
      })}
    </group>
  );
}