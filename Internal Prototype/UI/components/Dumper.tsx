"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DUMPER } from "@/lib/constants";
import { rigParts } from "@/lib/rig";
import { useSim } from "@/lib/simStore";

const C = {
  body: "#e5a100",
  bodyDark: "#b45309",
  bodyAccent: "#d97706",
  frame: "#1c1917",
  dark: "#0c0a09",
  glass: "#0f172a",
  metal: "#78716c",
  chrome: "#d6d3d1",
  tire: "#141210",
  rim: "#44403c",
  hub: "#292524",
  load: "#431407",
  headlightOn: "#fef08a",
  headlightOff: "#44403c",
  taillightBrake: "#ef4444",
  taillightDim: "#7f1d1d",
  beacon: "#f59e0b",
  hazardYellow: "#facc15",
  hazardBlack: "#09090b",
};

const LUGS = Array.from({ length: 6 }, (_, i) => (i * Math.PI * 2) / 6);

interface SingleWheelProps {
  x: number;
  z: number;
  steer?: boolean;
  index: number;
}

interface DualWheelProps {
  x: number;
  z: number;
  indexA: number;
  indexB: number;
}

// Front Single Steering Wheel
function FrontWheel({ x, z, index }: SingleWheelProps) {
  const r = DUMPER.wheelRadius;
  const w = DUMPER.wheelWidth;

  return (
    <group
      position={[x, r, z]}
      ref={(g) => {
        if (index === 0) rigParts.frontLeft = g;
        else rigParts.frontRight = g;
      }}
    >
      {/* Suspension Strut Kingpin */}
      <mesh position={[x > 0 ? -0.3 : 0.3, 0.4, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 1.2, 12]} />
        <meshStandardMaterial color="#292524" roughness={0.4} metalness={0.7} />
      </mesh>

      {/* Rotating Wheel Spoke Group */}
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        {/* Main Tire with deep tread geometry */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, w, 28]} />
          <meshStandardMaterial color={C.tire} roughness={0.96} />
        </mesh>
        {/* Beveled Sidewalls */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.92, r * 0.92, w * 1.05, 18]} />
          <meshStandardMaterial color="#1a1816" roughness={0.92} />
        </mesh>
        {/* Heavy Cast Steel Rim */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.58, r * 0.58, w * 1.08, 18]} />
          <meshStandardMaterial color={C.rim} roughness={0.35} metalness={0.75} />
        </mesh>
        {/* Planetary Hub Reduction Cover */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.3, r * 0.3, w * 1.18, 14]} />
          <meshStandardMaterial color={C.hub} roughness={0.4} metalness={0.6} />
        </mesh>
        {/* Wheel Studs / Lugs */}
        {LUGS.map((a, i) => (
          <group key={i}>
            <mesh position={[0.48, 0.4 * Math.sin(a), 0.4 * Math.cos(a)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.12, 6]} />
              <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
            </mesh>
            <mesh position={[-0.48, 0.4 * Math.sin(a), 0.4 * Math.cos(a)]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.045, 0.045, 0.12, 6]} />
              <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        ))}
      </mesh>
    </group>
  );
}

// Rear Heavy Dual Tires
function RearDualWheel({ x, z }: DualWheelProps) {
  const r = DUMPER.wheelRadius;
  const w = DUMPER.wheelWidth * 0.85;
  const spacing = 0.95;

  return (
    <group position={[x, r, z]}>
      {/* Heavy Drive Axle Hub */}
      <mesh position={[x > 0 ? -0.6 : 0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.26, 0.26, 1.4, 12]} />
        <meshStandardMaterial color="#1c1917" roughness={0.8} />
      </mesh>

      {/* Rotating Dual Wheel Assembly */}
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        {/* Outer Tire */}
        <group position={[x > 0 ? spacing / 2 : -spacing / 2, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r, r, w, 24]} />
            <meshStandardMaterial color={C.tire} roughness={0.96} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.58, r * 0.58, w * 1.08, 16]} />
            <meshStandardMaterial color={C.rim} roughness={0.35} metalness={0.75} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.3, r * 0.3, w * 1.18, 12]} />
            <meshStandardMaterial color={C.hub} roughness={0.4} metalness={0.6} />
          </mesh>
        </group>

        {/* Inner Tire */}
        <group position={[x > 0 ? -spacing / 2 : spacing / 2, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r, r, w, 24]} />
            <meshStandardMaterial color={C.tire} roughness={0.96} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.58, r * 0.58, w * 1.08, 16]} />
            <meshStandardMaterial color={C.rim} roughness={0.35} metalness={0.75} />
          </mesh>
        </group>
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
  const camMode = useSim((s) => s.camMode);

  useLayoutEffect(() => {
    if (rig.current) rigParts.rig = rig.current;
    if (body.current) rigParts.body = body.current;
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (beaconLight.current && beaconMesh.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      beaconLight.current.intensity = pulse * 5;
      const mat = beaconMesh.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.8 + pulse * 2.0;
    }
  });

  const isBraking = gear === "R" || gear === "N";
  const inCockpit = camMode === "cockpit";

  return (
    <group ref={rig}>
      <group ref={body} position={[0, DUMPER.chassis.y, 0]}>
        {/* Main Box Chassis Ladder Frame */}
        <mesh castShadow position={[0, 0.8, 0.3]}>
          <boxGeometry args={[4.4, 0.7, 7.6]} />
          <meshStandardMaterial color={C.frame} roughness={0.9} />
        </mesh>

        {/* Chassis Side Protection Rails & Fuel Tank */}
        <mesh castShadow position={[-2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>
        <mesh castShadow position={[2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.4, 0.8, 7.2]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        {/* Large Diesel Fuel & Hydraulic Tanks on Chassis Sides */}
        <mesh castShadow position={[-2.1, 0.85, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 3.2, 16]} />
          <meshStandardMaterial color="#292524" roughness={0.6} metalness={0.4} />
        </mesh>
        <mesh castShadow position={[2.1, 0.85, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.6, 3.2, 16]} />
          <meshStandardMaterial color="#292524" roughness={0.6} metalness={0.4} />
        </mesh>

        {/* Front Heavy Cast Radiator Grille & Bumper */}
        <mesh castShadow position={[0, 0.2, -4.1]}>
          <boxGeometry args={[3.6, 0.75, 0.7]} />
          <meshStandardMaterial color={C.dark} roughness={0.8} />
        </mesh>
        {/* Front Radiator Cooling Grille Vents */}
        <mesh castShadow position={[0, 1.05, -4.08]}>
          <boxGeometry args={[2.8, 0.7, 0.3]} />
          <meshStandardMaterial color="#1c1917" roughness={0.7} />
        </mesh>
        {/* Grille horizontal slats */}
        {[-0.2, 0, 0.2].map((gy, i) => (
          <mesh key={i} position={[0, 1.05 + gy, -4.24]}>
            <boxGeometry args={[2.5, 0.06, 0.05]} />
            <meshStandardMaterial color={C.chrome} roughness={0.3} metalness={0.8} />
          </mesh>
        ))}

        {/* Front Diagonal Access Stairway leading up to cab */}
        <group position={[1.1, 0.95, -3.9]} rotation={[0.4, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.1, 1.8]} />
            <meshStandardMaterial color="#44403c" roughness={0.7} />
          </mesh>
        </group>

        {/* Front Headlight Pods */}
        <group position={[-1.25, 1.25, -4.35]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.28, 0.14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 2.8 : 0}
            />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[-1.25, -1.0, -35]}
              intensity={30}
              distance={75}
              angle={0.65}
              penumbra={0.5}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        <group position={[1.25, 1.25, -4.35]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.28, 0.14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 2.8 : 0}
            />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[1.25, -1.0, -35]}
              intensity={30}
              distance={75}
              angle={0.65}
              penumbra={0.5}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        {/* Operator Cabin (Left-Offset Industrial Mining Layout) */}
        <mesh castShadow position={[-0.45, 1.65, -3.25]}>
          <boxGeometry args={[2.3, 1.25, 1.65]} />
          <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.15} />
        </mesh>
        {/* Cab Roof Protection Canopy */}
        <mesh castShadow position={[-0.45, 2.5, -3.1]}>
          <boxGeometry args={[2.5, 0.35, 1.9]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>
        {/* Roof A/C & HEPA Air Filter Unit */}
        <mesh castShadow position={[-0.45, 2.78, -2.6]}>
          <boxGeometry args={[1.4, 0.3, 0.9]} />
          <meshStandardMaterial color="#44403c" roughness={0.6} />
        </mesh>

        {/* Front Windshield Glass (Transparent safety glass, completely unobtrusive in cockpit view) */}
        {!inCockpit && (
          <mesh position={[-0.45, 2.0, -4.08]}>
            <boxGeometry args={[2.1, 0.75, 0.04]} />
            <meshStandardMaterial
              color="#93c5fd"
              transparent
              opacity={0.15}
              roughness={0.05}
              metalness={0.1}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Side Windows */}
        <mesh castShadow position={[-1.61, 1.95, -3.25]}>
          <boxGeometry args={[0.04, 0.65, 1.3]} />
          <meshStandardMaterial
            color="#93c5fd"
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.1}
            depthWrite={false}
          />
        </mesh>
        <mesh castShadow position={[0.71, 1.95, -3.25]}>
          <boxGeometry args={[0.04, 0.65, 1.3]} />
          <meshStandardMaterial
            color="#93c5fd"
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.1}
            depthWrite={false}
          />
        </mesh>

        {/* Side-View Mirrors on Steel Brackets */}
        <group position={[-1.85, 2.1, -3.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.1, 0.5, 0.25]} />
            <meshStandardMaterial color="#1c1917" roughness={0.5} />
          </mesh>
          <mesh position={[0.06, 0, 0]}>
            <boxGeometry args={[0.02, 0.44, 0.2]} />
            <meshStandardMaterial color={C.chrome} roughness={0.1} metalness={0.95} />
          </mesh>
        </group>

        {/* Dual Vertical Chrome Exhaust Stacks */}
        <mesh castShadow position={[1.35, 2.8, -2.4]}>
          <cylinderGeometry args={[0.12, 0.16, 2.0, 14]} />
          <meshStandardMaterial color={C.metal} roughness={0.3} metalness={0.8} />
        </mesh>
        <mesh castShadow position={[1.35, 3.85, -2.4]}>
          <cylinderGeometry args={[0.15, 0.12, 0.35, 14]} />
          <meshStandardMaterial color="#1c1917" roughness={0.7} />
        </mesh>

        {/* Safety Deck Handrails */}
        <mesh castShadow position={[1.5, 1.8, -3.3]}>
          <boxGeometry args={[0.08, 1.2, 1.5]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>
        <mesh castShadow position={[-1.65, 1.8, -3.3]}>
          <boxGeometry args={[0.08, 1.2, 1.5]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.6} />
        </mesh>

        {/* Flashing Amber Safety Strobe Beacon on Roof */}
        <group position={[-0.45, 2.8, -3.4]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.08, 0.1, 0.15, 8]} />
            <meshStandardMaterial color="#1c1917" />
          </mesh>
          <mesh ref={beaconMesh} position={[0, 0.15, 0]}>
            <sphereGeometry args={[0.14, 12, 8]} />
            <meshStandardMaterial
              color={C.beacon}
              emissive={C.beacon}
              emissiveIntensity={1.8}
            />
          </mesh>
          <pointLight ref={beaconLight} position={[0, 0.25, 0]} color="#f59e0b" distance={18} intensity={5} />
        </group>

        {/* Twin Hydraulic Telescopic Hoist Cylinders under dump body */}
        <mesh castShadow position={[-1.2, 1.8, -0.6]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 2.2, 12]} />
          <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
        </mesh>
        <mesh castShadow position={[1.2, 1.8, -0.6]} rotation={[-0.3, 0, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 2.2, 12]} />
          <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
        </mesh>

        {/* Mining Haul Body / Dump Bin (Reinforced Steel for Heavy Iron Ore) */}
        <mesh castShadow position={[0, 2.1, 0.9]}>
          <boxGeometry args={[5.3, 0.75, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Iron Ore Payload in Bin */}
        <mesh castShadow position={[0, 3.1, 0.9]}>
          <boxGeometry args={[4.95, 1.2, 4.25]} />
          <meshStandardMaterial color={C.load} roughness={0.98} />
        </mesh>
        {/* Bin Front Canopy (Overhang protecting cab) */}
        <mesh castShadow position={[0, 3.45, -1.6]}>
          <boxGeometry args={[5.4, 2.2, 0.5]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Bin Side Walls */}
        <mesh castShadow position={[-2.95, 3.45, 0.9]}>
          <boxGeometry args={[0.45, 2.2, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Bin Side Walls */}
        <mesh castShadow position={[2.95, 3.45, 0.9]}>
          <boxGeometry args={[0.45, 2.2, 4.6]} />
          <meshStandardMaterial color={C.body} roughness={0.5} />
        </mesh>
        {/* Bin Tail Chute */}
        <mesh castShadow position={[0, 3.45, 3.35]}>
          <boxGeometry args={[4.6, 2.1, 0.5]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* Bin Structural Reinforcement Ribs */}
        <mesh castShadow position={[0, 3.6, -1.4]}>
          <boxGeometry args={[5.6, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[0, 3.6, 2.85]}>
          <boxGeometry args={[4.9, 0.3, 0.3]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[-2.78, 3.6, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>
        <mesh castShadow position={[2.78, 3.6, 0.9]}>
          <boxGeometry args={[0.3, 0.3, 4.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.55} />
        </mesh>

        {/* Rear Heavy Cast Bumper & Tow Pintle */}
        <mesh castShadow position={[0, 0.7, 3.95]}>
          <boxGeometry args={[3.8, 0.65, 0.5]} />
          <meshStandardMaterial color={C.dark} roughness={0.9} />
        </mesh>

        {/* Rear Tail / Brake Light Clusters */}
        <mesh position={[-1.4, 0.75, 4.22]}>
          <boxGeometry args={[0.45, 0.22, 0.06]} />
          <meshStandardMaterial
            color={isBraking ? C.taillightBrake : C.taillightDim}
            emissive={isBraking ? C.taillightBrake : "#300000"}
            emissiveIntensity={isBraking ? 2.5 : 0.4}
          />
        </mesh>
        <mesh position={[1.4, 0.75, 4.22]}>
          <boxGeometry args={[0.45, 0.22, 0.06]} />
          <meshStandardMaterial
            color={isBraking ? C.taillightBrake : C.taillightDim}
            emissive={isBraking ? C.taillightBrake : "#300000"}
            emissiveIntensity={isBraking ? 2.5 : 0.4}
          />
        </mesh>

        {/* Heavy Rubber Mudflaps */}
        <mesh castShadow position={[0, 0.85, 3.6]}>
          <boxGeometry args={[3.4, 1.2, 0.08]} />
          <meshStandardMaterial color="#0a0a0a" roughness={1} />
        </mesh>
      </group>

      {/* Front Steerable Axle Wheels */}
      <FrontWheel x={-DUMPER.frontX} z={DUMPER.frontZ} steer index={0} />
      <FrontWheel x={DUMPER.frontX} z={DUMPER.frontZ} steer index={1} />

      {/* Rear Heavy Dual Axles */}
      <RearDualWheel x={-DUMPER.rearX} z={DUMPER.rearZ1} indexA={2} indexB={3} />
      <RearDualWheel x={DUMPER.rearX} z={DUMPER.rearZ1} indexA={4} indexB={5} />
      <RearDualWheel x={-DUMPER.rearX} z={DUMPER.rearZ2} indexA={6} indexB={7} />
      <RearDualWheel x={DUMPER.rearX} z={DUMPER.rearZ2} indexA={8} indexB={9} />
    </group>
  );
}