"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { damp } from "@/lib/constants";
import { useSim } from "@/lib/simStore";

// Low-altitude mist layers situated safely along pit benches, stockpiles, and perimeter depressions
// Placed at |x| > 25m to prevent any camera near-plane slicing or intersecting with the haul road
const MIST_SHEETS = [
  { x: -55, y: 1.5, z: 35, scale: 38, rotSpeed: 0.012 }, // Silt pond basin
  { x: 58, y: 2.2, z: -70, scale: 42, rotSpeed: -0.011 }, // Platform base
  { x: -75, y: 4.5, z: -60, scale: 48, rotSpeed: 0.009 }, // Western stockpile depression
  { x: 72, y: 4.0, z: 64, scale: 46, rotSpeed: -0.010 }, // Eastern stockpile depression
  { x: -85, y: 7.0, z: 10, scale: 52, rotSpeed: 0.008 }, // Bench terrace 1
  { x: 88, y: 6.5, z: -35, scale: 50, rotSpeed: -0.009 }, // Bench terrace 2
  { x: -40, y: 3.0, z: -110, scale: 44, rotSpeed: 0.011 }, // North quarry wall
  { x: 45, y: 3.5, z: 110, scale: 45, rotSpeed: -0.012 }, // South quarry wall
  // Extended along the haul road to the actual northern and southern ends of the map
  { x: -45, y: 2.5, z: -150, scale: 46, rotSpeed: 0.009 },
  { x: 48, y: 2.8, z: -160, scale: 48, rotSpeed: -0.010 },
  { x: -42, y: 2.2, z: -185, scale: 45, rotSpeed: 0.008 },
  { x: 46, y: 2.5, z: -185, scale: 46, rotSpeed: -0.011 },
  { x: -48, y: 2.8, z: 150, scale: 48, rotSpeed: 0.010 },
  { x: 44, y: 2.5, z: 160, scale: 46, rotSpeed: -0.009 },
  { x: -42, y: 2.2, z: 185, scale: 45, rotSpeed: 0.011 },
  { x: 46, y: 2.5, z: 185, scale: 46, rotSpeed: -0.012 },
] as const;

export function VolumetricFog() {
  const groupRef = useRef<THREE.Group>(null);
  const currentOpacityRef = useRef(0.15);

  // Procedurally generate a soft radial alpha gradient texture in memory
  const mistTexture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    grad.addColorStop(0.35, "rgba(230, 230, 230, 0.5)");
    grad.addColorStop(0.70, "rgba(160, 160, 160, 0.12)");
    grad.addColorStop(1.0, "rgba(80, 80, 80, 0.0)");

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.getElapsedTime();
    const { fogMode, rainMode } = useSim.getState();

    const baseOpacity =
      fogMode === "heavy"
        ? 0.38
        : fogMode === "medium"
        ? 0.20
        : 0.05;

    const rainBoost =
      rainMode === "high"
        ? 0.14
        : rainMode === "medium"
        ? 0.07
        : 0.0;

    const targetOpacity = Math.min(baseOpacity + rainBoost, 0.48);
    currentOpacityRef.current = damp(currentOpacityRef.current, targetOpacity, 3.0, dt);

    const children = groupRef.current.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i] as THREE.Mesh;
      const sheet = MIST_SHEETS[i];
      if (sheet && child) {
        child.rotation.z += sheet.rotSpeed * dt;
        child.position.y = sheet.y + Math.sin(t * 0.35 + i * 1.4) * 0.35;
        const mat = child.material as THREE.MeshBasicMaterial;
        if (mat) {
          mat.opacity = currentOpacityRef.current;
        }
      }
    }
  });

  if (!mistTexture) return null;

  return (
    <group ref={groupRef}>
      {MIST_SHEETS.map((sheet, i) => (
        <mesh
          key={i}
          position={[sheet.x, sheet.y, sheet.z]}
          rotation={[-Math.PI / 2, 0, i * 0.7]}
          scale={[sheet.scale, sheet.scale, 1]}
          renderOrder={1}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={mistTexture}
            color="#38322e"
            transparent
            opacity={0.15}
            depthWrite={false}
            blending={THREE.NormalBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
