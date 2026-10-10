"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "@/lib/constants";
import { useSim } from "@/lib/simStore";

const MAX_DROPS = 5000;
const MEDIUM_DROPS = 2400;
const BOX_SIZE = 96; // 96m x 96m dynamic rain envelope centered on truck
const BOX_HALF = BOX_SIZE / 2;
const BOX_HEIGHT = 28;
const SPLASH_COUNT = 42;

interface DropData {
  positions: Float32Array;
  speeds: Float32Array;
  baseLengths: Float32Array;
}

interface SplashItem {
  x: number;
  z: number;
  life: number;
  scale: number;
}

function createInitialDropData(): DropData {
  const positions = new Float32Array(MAX_DROPS * 6);
  const speeds = new Float32Array(MAX_DROPS);
  const baseLengths = new Float32Array(MAX_DROPS);

  for (let i = 0; i < MAX_DROPS; i++) {
    const wx = (Math.random() - 0.5) * BOX_SIZE;
    const wz = -32 + (Math.random() - 0.5) * BOX_SIZE;
    const wy = Math.random() * BOX_HEIGHT;

    speeds[i] = 34 + Math.random() * 22; // 34 - 56 m/s natural terminal velocity
    baseLengths[i] = 0.45 + Math.random() * 0.45; // 0.45m - 0.90m subtle realistic streak length

    const idx = i * 6;
    // Vertex 0: Top
    positions[idx] = wx;
    positions[idx + 1] = wy + baseLengths[i];
    positions[idx + 2] = wz;
    // Vertex 1: Bottom
    positions[idx + 3] = wx;
    positions[idx + 4] = wy;
    positions[idx + 5] = wz;
  }

  return { positions, speeds, baseLengths };
}

function createInitialSplashes(): SplashItem[] {
  const list: SplashItem[] = [];
  for (let i = 0; i < SPLASH_COUNT; i++) {
    list.push({
      x: (Math.random() - 0.5) * 32,
      z: -32 + (Math.random() - 0.5) * 32,
      life: Math.random(),
      scale: 0.1,
    });
  }
  return list;
}

const STATIC_INITIAL_DATA = createInitialDropData();

const dummyMatrix = new THREE.Matrix4();
const scaleVector = new THREE.Vector3();

export function Rain() {
  const linesRef = useRef<THREE.LineSegments>(null);
  const splashesRef = useRef<THREE.InstancedMesh>(null);
  const dropDataRef = useRef<DropData>(STATIC_INITIAL_DATA);
  const splashDataRef = useRef<SplashItem[]>(createInitialSplashes());

  const currentOpacityRef = useRef(0.0);
  const splashOpacityRef = useRef(0.0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const { rainMode, x: truckX, z: truckZ, speed: truckSpeed, yaw: truckYaw } = useSim.getState();

    // Smooth target opacity transitions across states
    const targetOpacity =
      rainMode === "high"
        ? 0.70
        : rainMode === "medium"
        ? 0.38
        : 0.0;

    const targetSplashOpacity =
      rainMode === "high"
        ? 0.32
        : rainMode === "medium"
        ? 0.15
        : 0.0;

    currentOpacityRef.current = damp(currentOpacityRef.current, targetOpacity, 3.5, dt);
    splashOpacityRef.current = damp(splashOpacityRef.current, targetSplashOpacity, 3.5, dt);

    const isVisible = currentOpacityRef.current > 0.005;

    if (linesRef.current) {
      // Crucial fix: disable Three.js frustum culling so line segments are NEVER culled
      // when the truck drives far down the map towards the ends
      linesRef.current.frustumCulled = false;
      linesRef.current.visible = isVisible;
      const mat = linesRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        mat.opacity = currentOpacityRef.current;
        mat.color.set(rainMode === "high" ? "#c7d2fe" : "#94a3b8");
      }
    }

    if (splashesRef.current) {
      splashesRef.current.frustumCulled = false;
      splashesRef.current.visible = splashOpacityRef.current > 0.005;
      const mat = splashesRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = splashOpacityRef.current;
      }
    }

    if (!isVisible) return;

    const data = dropDataRef.current;
    const geo = linesRef.current?.geometry;
    if (!data || !geo) return;

    const { speeds, baseLengths } = data;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const arr = posAttr.array as Float32Array;

    const isHigh = rainMode === "high";
    const activeDropCount = isHigh ? MAX_DROPS : MEDIUM_DROPS;
    geo.setDrawRange(0, activeDropCount * 2);

    const speedMult = isHigh ? 1.30 : 0.95;
    const lenMult = isHigh ? 1.35 : 1.0;
    const windAngleX = isHigh ? 0.16 : 0.06;
    const windAngleZ = isHigh ? -0.12 : -0.03;

    // Dynamic apparent rain slant from vehicle motion (ETS2 windshield rain physics)
    const fwdX = -Math.sin(truckYaw);
    const fwdZ = -Math.cos(truckYaw);
    const dynSlantX = windAngleX - fwdX * truckSpeed * 0.024;
    const dynSlantZ = windAngleZ - fwdZ * truckSpeed * 0.024;

    for (let i = 0; i < activeDropCount; i++) {
      const idx = i * 6;
      const speed = speeds[i] * speedMult;
      const len = baseLengths[i] * lenMult;

      // Decrement Y at realistic velocity
      let yBottom = arr[idx + 4] - speed * dt;

      // World-space X and Z coordinates of the drop
      let wx = arr[idx + 3];
      let wz = arr[idx + 5];

      // Vertical respawn when hitting ground level
      if (yBottom <= 0.08) {
        yBottom = BOX_HEIGHT - Math.random() * 2.5;
        // Dynamically respawn anywhere within BOX_SIZE envelope centered on truck
        wx = truckX + (Math.random() - 0.5) * BOX_SIZE;
        wz = truckZ + (Math.random() - 0.5) * BOX_SIZE;
      }

      // Toroidal wrapping in world space around truck:
      // While inside the envelope, the raindrops remain completely stationary in the air as they fall.
      // If the truck moves far down the map, drops that exit the envelope seamlessly wrap to the front,
      // guaranteeing that rain continues continuously until the ACTUAL END OF THE MAP!
      const dx = wx - truckX;
      if (dx > BOX_HALF || dx < -BOX_HALF) {
        wx = truckX + ((((dx + BOX_HALF) % BOX_SIZE) + BOX_SIZE) % BOX_SIZE) - BOX_HALF;
      }

      const dz = wz - truckZ;
      if (dz > BOX_HALF || dz < -BOX_HALF) {
        wz = truckZ + ((((dz + BOX_HALF) % BOX_SIZE) + BOX_SIZE) % BOX_SIZE) - BOX_HALF;
      }

      const slantX = dynSlantX * len;
      const slantZ = dynSlantZ * len;

      // Vertex 0: Top of raindrop streak
      arr[idx] = wx + slantX;
      arr[idx + 1] = yBottom + len;
      arr[idx + 2] = wz + slantZ;

      // Vertex 1: Bottom of raindrop streak
      arr[idx + 3] = wx;
      arr[idx + 4] = yBottom;
      arr[idx + 5] = wz;
    }

    posAttr.needsUpdate = true;

    // Animate subtle ground splashes dynamically positioned around the truck
    const splashes = splashDataRef.current;
    if (splashesRef.current && splashes && splashOpacityRef.current > 0.005) {
      const splashMesh = splashesRef.current;
      const splashSpeed = isHigh ? 2.8 : 1.6;

      for (let i = 0; i < SPLASH_COUNT; i++) {
        const s = splashes[i];
        s.life += dt * splashSpeed;

        // Respawn splash when its animation cycle finishes
        if (s.life >= 1.0) {
          s.life = 0;
          s.x = truckX + (Math.random() - 0.5) * 36;
          s.z = truckZ + (Math.random() - 0.5) * 36;
        }

        // Toroidal wrap for splash items so they never get left behind as truck drives
        const sdx = s.x - truckX;
        if (sdx > 24 || sdx < -24) {
          s.x = truckX + ((((sdx + 24) % 48) + 48) % 48) - 24;
        }
        const sdz = s.z - truckZ;
        if (sdz > 24 || sdz < -24) {
          s.z = truckZ + ((((sdz + 24) % 48) + 48) % 48) - 24;
        }

        const scale = 0.06 + s.life * (isHigh ? 0.35 : 0.22);
        const y = 0.052;

        dummyMatrix.makeTranslation(s.x, y, s.z);
        scaleVector.set(scale, 1, scale);
        dummyMatrix.scale(scaleVector);
        splashMesh.setMatrixAt(i, dummyMatrix);
      }
      splashMesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {/* 3D Falling Rain Streaks (frustumCulled={false} ensures continuous rain across entire map) */}
      <lineSegments ref={linesRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[STATIC_INITIAL_DATA.positions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial
          color="#94a3b8"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </lineSegments>

      {/* Road / Ground Rain Splashes */}
      <instancedMesh
        ref={splashesRef}
        args={[undefined, undefined, SPLASH_COUNT]}
        position={[0, 0, 0]}
        frustumCulled={false}
      >
        <ringGeometry args={[0.2, 0.35, 14]} />
        <meshBasicMaterial
          color="#93c5fd"
          transparent
          opacity={0}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}
