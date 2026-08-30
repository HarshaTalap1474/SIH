"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DUMPER } from "@/lib/constants";
import { rigParts } from "@/lib/rig";
import { useSim } from "@/lib/simStore";

const C = {
  body: DUMPER.colors.body,
  bodyDark: DUMPER.colors.bodyDark,
  frame: "#1c1917",
  dark: "#0f0e0d",
  glass: "#0f172a",
  metal: "#78716c",
  tire: DUMPER.colors.tire,
  rim: DUMPER.colors.rim,
  load: "#451a03",
  headlightOn: "#fef08a",
  headlightOff: "#44403c",
  taillightBrake: "#ef4444",
  taillightDim: "#7f1d1d",
  beacon: "#f59e0b",
};

const LUGS = Array.from({ length: 6 }, (_, i) => (i * Math.PI * 2) / 6);

interface WheelProps {
  x: number;
  z: number;
  steer?: boolean;
  index: number;
}

function Wheel({ x, z, steer = false, index }: WheelProps) {
  const r = DUMPER.wheelRadius;
  const w = DUMPER.wheelWidth;

  return (
    <group
      position={[x, r, z]}
      ref={(g) => {
        if (steer) {
          if (index === 0) rigParts.frontLeft = g;
          else rigParts.frontRight = g;
        }
      }}
    >
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        {/* Main Tire with rugged tread */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, w, 24]} />
          <meshStandardMaterial color={C.tire} roughness={0.96} />
        </mesh>
        {/* Tire Sidewall bevel */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.92, r * 0.92, w * 1.04, 16]} />
          <meshStandardMaterial color="#171717" roughness={0.9} />
        </mesh>
        {/* Heavy Mining Steel Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.55, r * 0.55, w * 1.08, 16]} />
          <meshStandardMaterial color={C.rim} roughness={0.4} metalness={0.7} />
        </mesh>
        {/* Planetary Hub Reduction Gear Cover */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.28, r * 0.28, w * 1.15, 12]} />
          <meshStandardMaterial color="#292524" roughness={0.5} metalness={0.6} />
        </mesh>
        {/* Heavy Wheel Studs / Lugs */}
        {LUGS.map((a, i) => (
          <group key={i}>
            <mesh position={[0.45, 0.38 * Math.sin(a), 0.38 * Math.cos(a)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.12, 6]} />
              <meshStandardMaterial color="#a8a29e" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[-0.45, 0.38 * Math.sin(a), 0.38 * Math.cos(a)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, 0.12, 6]} />
              <meshStandardMaterial color="#a8a29e" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        ))}
      </mesh>
    </group>
  );
}

export function Dumper() {
  const rig = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const beaconLight = useRef<THREE.PointLight>(null);
  const beaconMesh = useRef<THREE.Mesh>(null);

  const headlights = useSim((s) => s.headlights);
  const gear = useSim((s) => s.gear);

  useLayoutEffect(() => {
    if (rig.current) rigParts.rig = rig.current;
    if (body.current) rigParts.body = body.current;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    // Rotating flashing amber safety beacon on top of the cab
    if (beaconLight.current && beaconMesh.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      beaconLight.current.intensity = pulse * 4;
      const mat = beaconMesh.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.8 + pulse * 1.5;
    }
  });

  const isBraking = gear === "R" || gear === "N";

  return (
    <group ref={rig}>
      <group ref={body} position={[0, DUMPER.chassis.y, 0]}>
        {/* Main Box Chassis Frame */}
        <mesh castShadow position={[0, 0.8, 0.3]}>
          <boxGeometry args={[4.4, 0.7, 7.4]} />
          <meshStandardMaterial color={C.frame} roughness={0.9} />
        </mesh>

        {/* Chassis Side Rails */}
        <mesh castShadow position={[-2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        {/* Axle Housings */}
        <mesh castShadow position={[-1.65, 0.5, -2.3]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-1.65, 0.5, 0.8]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[-1.65, 0.5, 2.6]}>
          <boxGeometry args={[3.1, 0.45, 0.8]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        {/* Front Radiator Cowling & Heavy Steel Bumper */}
        <mesh castShadow position={[0, 0.15, -4.05]}>
          <boxGeometry args={[3.4, 0.7, 0.65]} />
          <meshStandardMaterial color={C.dark} roughness={0.8} />
        </mesh>
        <mesh castShadow position={[0, 1.0, -4.05]}>
          <boxGeometry args={[2.7, 0.65, 0.3]} />
          <meshStandardMaterial color={C.dark} roughness={0.8} />
        </mesh>

        {/* Front Headlight Assemblies (Dual high-power mining lights) */}
        <group position={[-1.1, 1.25, -4.3]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.28, 0.12]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 2.5 : 0}
            />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[-1.1, -1.0, -35]}
              intensity={28}
              distance={70}
              angle={0.65}
              penumbra={0.5}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        <group position={[1.1, 1.25, -4.3]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.28, 0.12]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 2.5 : 0}
            />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[1.1, -1.0, -35]}
              intensity={28}
              distance={70}
              angle={0.65}
              penumbra={0.5}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        {/* Driver Operator Cabin (Left-offset industrial mining layout) */}
        <mesh castShadow position={[-0.4, 1.6, -3.25]}>
          <boxGeometry args={[2.3, 1.2, 1.6]} />
          <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.1} />
        </mesh>
        <mesh castShadow position={[-0.4, 2.45, -3.1]}>
          <boxGeometry args={[2.5, 0.35, 1.9]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* Cabin Front Windshield (Safety Glazing) */}
        <mesh castShadow position={[-0.4, 1.95, -4.06]}>
          <boxGeometry args={[2.1, 0.72, 0.12]} />
          <meshStandardMaterial color={C.glass} roughness={0.15} metalness={0.85} />
        </mesh>
        {/* Side Windows */}
        <mesh castShadow position={[-1.56, 1.9, -3.25]}>
          <boxGeometry args={[0.1, 0.6, 1.25]} />
          <meshStandardMaterial color={C.glass} roughness={0.15} metalness={0.85} />
        </mesh>
        <mesh castShadow position={[0.76, 1.9, -3.25]}>
          <boxGeometry args={[0.1, 0.6, 1.25]} />
          <meshStandardMaterial color={C.glass} roughness={0.15} metalness={0.85} />
        </mesh>

        {/* Dual Heavy Vertical Exhaust Stacks */}
        <mesh castShadow position={[1.35, 2.7, -2.4]}>
          <cylinderGeometry args={[0.12, 0.16, 1.8, 12]} />
          <meshStandardMaterial color={C.metal} roughness={0.4} metalness={0.7} />
        </mesh>
        <mesh castShadow position={[1.35, 3.7, -2.4]}>
          <cylinderGeometry args={[0.14, 0.12, 0.3, 12]} />
          <meshStandardMaterial color="#292524" roughness={0.6} />
        </mesh>

        {/* Safety Railings / Walkway around Cab */}
        <mesh castShadow position={[1.45, 1.75, -3.3]}>
          <boxGeometry args={[0.08, 1.15, 1.4]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[-1.6, 1.75, -3.3]}>
          <boxGeometry args={[0.08, 1.15, 1.4]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>

        {/* Rotating Amber Safety Strobe Beacon on Cabin Roof */}
        <group position={[-0.4, 2.75, -3.4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.15, 8]} />
            <meshStandardMaterial color="#292524" />
          </mesh>
          <mesh ref={beaconMesh} position={[0, 0.14, 0]}>
            <sphereGeometry args={[0.12, 12, 8]} />
            <meshStandardMaterial
              color={C.beacon}
              emissive={C.beacon}
              emissiveIntensity={1.8}
            />
          </mesh>
          <pointLight ref={beaconLight} position={[0, 0.2, 0]} color="#f59e0b" distance={16} intensity={4} />
        </group>

        {/* Mining Haul Body / Dump Bin (Reinforced Steel for Iron Ore) */}
        <mesh castShadow position={[0, 2.05, 0.9]}>
          <boxGeometry args={[5.3, 0.7, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Iron Ore Payload in Bin */}
        <mesh castShadow position={[0, 3.05, 0.9]}>
          <boxGeometry args={[4.95, 1.15, 4.25]} />
          <meshStandardMaterial color={C.load} roughness={0.98} />
        </mesh>
        {/* Bin Front Canopy (Protects Cabin) */}
        <mesh castShadow position={[0, 3.4, -1.55]}>
          <boxGeometry args={[5.4, 2.1, 0.45]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Bin Side Walls */}
        <mesh castShadow position={[-2.95, 3.4, 0.9]}>
          <boxGeometry args={[0.45, 2.1, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[2.95, 3.4, 0.9]}>
          <boxGeometry args={[0.45, 2.1, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Bin Tail Slope */}
        <mesh castShadow position={[0, 3.4, 3.35]}>
          <boxGeometry args={[4.6, 2.0, 0.5]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* Bin Reinforcement Ribs */}
        <mesh castShadow position={[0, 3.55, -1.38]}>
          <boxGeometry args={[5.6, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 3.55, 2.85]}>
          <boxGeometry args={[4.9, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[-2.78, 3.55, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[2.78, 3.55, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>

        {/* Rear Heavy Bumper & Tail Lamp Clusters */}
        <mesh castShadow position={[0, 0.7, 3.9]}>
          <boxGeometry args={[3.8, 0.6, 0.45]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        {/* Rear Tail / Brake Lights (Illuminate Red when Braking or Reversing) */}
        <mesh position={[-1.4, 0.75, 4.14]}>
          <boxGeometry args={[0.4, 0.2, 0.05]} />
          <meshStandardMaterial
            color={isBraking ? C.taillightBrake : C.taillightDim}
            emissive={isBraking ? C.taillightBrake : "#300000"}
            emissiveIntensity={isBraking ? 2.2 : 0.4}
          />
        </mesh>
        <mesh position={[1.4, 0.75, 4.14]}>
          <boxGeometry args={[0.4, 0.2, 0.05]} />
          <meshStandardMaterial
            color={isBraking ? C.taillightBrake : C.taillightDim}
            emissive={isBraking ? C.taillightBrake : "#300000"}
            emissiveIntensity={isBraking ? 2.2 : 0.4}
          />
        </mesh>

        {/* Heavy Rubber Mudflaps */}
        <mesh castShadow position={[0, 0.85, 3.55]}>
          <boxGeometry args={[3.2, 1.2, 0.08]} />
          <meshStandardMaterial color="#0c0a09" roughness={1} />
        </mesh>
      </group>

      {/* 6 Large Mining Haul Tires */}
      <Wheel x={-DUMPER.frontX} z={DUMPER.frontZ} steer index={0} />
      <Wheel x={DUMPER.frontX} z={DUMPER.frontZ} steer index={1} />
      <Wheel x={-DUMPER.rearX} z={DUMPER.rearZ1} index={2} />
      <Wheel x={DUMPER.rearX} z={DUMPER.rearZ1} index={3} />
      <Wheel x={-DUMPER.rearX} z={DUMPER.rearZ2} index={4} />
      <Wheel x={DUMPER.rearX} z={DUMPER.rearZ2} index={5} />
    </group>
  );
}