"use client";

import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SCENE, damp } from "@/lib/constants";
import { Dumper } from "./Dumper";
import { Controls } from "./Controls";
import { CameraRig } from "./CameraRig";
import { Terrain } from "./Terrain";
import { Rain } from "./Rain";
import { VolumetricFog } from "./VolumetricFog";
import { useSim } from "@/lib/simStore";
import { silenceThreeClockWarning } from "@/lib/threeWarnings";

silenceThreeClockWarning();

const targetColorObj = new THREE.Color();
const FOG_DENSITIES = { heavy: 0.0135, medium: 0.0075, clear: 0.0028 } as const;
const RAIN_HAZES = { high: 0.005, medium: 0.0025, none: 0.0 } as const;

function FogEnvironment() {
  const fogRef = useRef<THREE.FogExp2>(null);
  const bgRef = useRef<THREE.Color>(null);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const { fogMode, rainMode } = useSim.getState();

    const targetDensity = FOG_DENSITIES[fogMode] + RAIN_HAZES[rainMode];
    const targetHex =
      rainMode === "high"
        ? "#121519"
        : rainMode === "medium"
        ? "#17191d"
        : fogMode === "heavy"
        ? "#1e1b19"
        : SCENE.background;

    targetColorObj.set(targetHex);

    const lerpFactor = 1 - Math.exp(-3.0 * dt);
    if (fogRef.current) {
      fogRef.current.density = damp(fogRef.current.density, targetDensity, 3.0, dt);
      fogRef.current.color.lerp(targetColorObj, lerpFactor);
    }
    if (bgRef.current) {
      bgRef.current.lerp(targetColorObj, lerpFactor);
    }
  });

  return (
    <>
      <color ref={bgRef} attach="background" args={[SCENE.background]} />
      <fogExp2 ref={fogRef} attach="fog" args={[SCENE.background, 0.0135]} />
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.5, far: 500, position: [0, 6, 8] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.18,
      }}
    >
      <FogEnvironment />

      {/* Atmospheric Iron-Ore Quarry Cinematic Night Lighting */}
      <hemisphereLight args={["#fef3c7", "#24130c", 0.85]} />
      {/* Key Directional Quarry Light */}
      <directionalLight
        position={[50, 85, 35]}
        intensity={1.8}
        color="#fffbeb"
        castShadow
        shadow-bias={-0.00025}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-140}
        shadow-camera-right={140}
        shadow-camera-top={140}
        shadow-camera-bottom={-140}
        shadow-camera-near={1}
        shadow-camera-far={320}
      />
      {/* Cool Secondary Fill / Rim Light for Edge Separation */}
      <directionalLight position={[-60, 55, -40]} intensity={0.6} color="#94a3b8" />
      <ambientLight intensity={0.42} color="#38251b" />

      <Terrain />
      <VolumetricFog />
      <Rain />
      <Dumper />
      <Controls />
      <CameraRig />
    </Canvas>
  );
}