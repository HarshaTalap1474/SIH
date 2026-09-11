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
const FOG_DENSITIES = { heavy: 0.0285, medium: 0.0165, clear: 0.0055 } as const;
const RAIN_HAZES = { high: 0.008, medium: 0.0035, none: 0.0 } as const;

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
      <fogExp2 ref={fogRef} attach="fog" args={[SCENE.background, 0.022]} />
    </>
  );
}

export function Scene() {
  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 1.5]}
      camera={{ fov: 55, near: 0.5, far: 500, position: [0, 6, 8] }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
      }}
    >
      <FogEnvironment />

      {/* Atmospheric Iron-Ore Quarry Lighting */}
      <hemisphereLight args={["#fde68a", "#38231a", 0.8]} />
      <directionalLight
        position={[60, 80, 40]}
        intensity={1.9}
        castShadow
        shadow-bias={-0.0003}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-110}
        shadow-camera-right={110}
        shadow-camera-top={110}
        shadow-camera-bottom={-110}
        shadow-camera-near={1}
        shadow-camera-far={260}
      />
      <ambientLight intensity={0.35} />

      <Terrain />
      <VolumetricFog />
      <Rain />
      <Dumper />
      <Controls />
      <CameraRig />
    </Canvas>
  );
}