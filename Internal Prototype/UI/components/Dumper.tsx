"use client";

import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { DUMPER } from "@/lib/constants";
import { rigParts } from "@/lib/rig";
import { useSim } from "@/lib/simStore";

// Ultra-premium industrial mining color palette (CAT / Komatsu heavy aesthetic)
const C = {
  body: "#f59e0b", // Rich vibrant Caterpillar amber gold
  bodyDark: "#b45309", // Deep structural ochre
  bodyAccent: "#d97706", // Reinforced gussets & ribs
  chassis: "#18181b", // Charcoal zinc-900 steel frame
  chassisDark: "#09090b", // Deep shadow underbody
  deck: "#27272a", // Anti-slip diamond plate
  handrail: "#fbbf24", // High-vis safety yellow handrails
  metal: "#71717a", // Cast iron / brushed steel
  chrome: "#f4f4f5", // High-reflectivity chrome
  tire: "#0c0a09", // Matte vulcanized off-road rubber
  rim: "#3f3f46", // Heavy gunmetal cast steel rim
  hub: "#27272a", // Planetary reduction drive hub
  lug: "#e4e4e7", // Chrome lug nuts
  load: "#3f1d14", // Deep hematite/magnetite iron ore
  loadOre: "#542317", // Rich iron ore highlights
  glass: "#93c5fd", // Tinted laminated safety glass
  headlightOn: "#fef08a",
  headlightOff: "#3f3f46",
  lightAmber: "#f59e0b",
  lightWhite: "#f8fafc",
  taillightBrake: "#ef4444",
  taillightDim: "#7f1d1d",
  beacon: "#f59e0b",
  hazardYellow: "#facc15",
  hazardBlack: "#18181b",
  safetyRed: "#dc2626",
};

const LUGS_COUNT = 8;
const LUGS = Array.from({ length: LUGS_COUNT }, (_, i) => (i * Math.PI * 2) / LUGS_COUNT);
const TREAD_BLOCKS = Array.from({ length: 14 }, (_, i) => (i * Math.PI * 2) / 14);

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

// Heavy front steerable wheel assembly with deep treads, disc brakes & steering knuckle
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
      {/* Heavy Double-Wishbone & Kingpin Suspension Strut */}
      <group position={[x > 0 ? -0.32 : 0.32, 0.45, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.22, 1.3, 14]} />
          <meshStandardMaterial color="#27272a" roughness={0.35} metalness={0.8} />
        </mesh>
        {/* Suspension Coil Spring Collar */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[0.24, 0.24, 0.5, 14]} />
          <meshStandardMaterial color="#b45309" roughness={0.5} metalness={0.6} />
        </mesh>
      </group>

      {/* Disc Brake Caliper Assembly */}
      <mesh position={[x > 0 ? -0.18 : 0.18, 0.2, 0]}>
        <boxGeometry args={[0.25, 0.35, 0.45]} />
        <meshStandardMaterial color="#dc2626" roughness={0.4} metalness={0.5} />
      </mesh>

      {/* Rotating Wheel & Tire Assembly */}
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        {/* Main Vulcanized Rubber Tire Body */}
        <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r, r, w, 32]} />
          <meshStandardMaterial color={C.tire} roughness={0.94} metalness={0.05} />
        </mesh>

        {/* 3D Heavy Chevron Rock-Lug Cleats around tread perimeter */}
        {TREAD_BLOCKS.map((ang, i) => (
          <group key={i} rotation={[ang, 0, 0]}>
            <mesh position={[0, r * 0.98, 0]}>
              <boxGeometry args={[w * 0.94, 0.11, 0.18]} />
              <meshStandardMaterial color="#09090b" roughness={0.98} />
            </mesh>
          </group>
        ))}

        {/* Outer Beveled Tire Sidewall Shoulder */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.91, r * 0.91, w * 1.04, 24]} />
          <meshStandardMaterial color="#141210" roughness={0.92} />
        </mesh>

        {/* Heavy Deep-Dish Cast Steel Rim with Bevel */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.6, r * 0.54, w * 1.06, 24]} />
          <meshStandardMaterial color={C.rim} roughness={0.3} metalness={0.85} />
        </mesh>

        {/* Rim Step Flange */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.48, r * 0.48, w * 1.12, 20]} />
          <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.7} />
        </mesh>

        {/* Planetary Final Drive Reduction Hub Cap */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.32, r * 0.32, w * 1.2, 16]} />
          <meshStandardMaterial color={C.hub} roughness={0.35} metalness={0.75} />
        </mesh>

        {/* Center Axle Grease Cap with CAT Emblem Indent */}
        <mesh position={[x > 0 ? w * 0.61 : -w * 0.61, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[r * 0.16, r * 0.16, 0.08, 12]} />
          <meshStandardMaterial color={C.body} roughness={0.4} metalness={0.4} />
        </mesh>

        {/* Heavy Chrome Wheel Studs / Lug Nuts */}
        {LUGS.map((a, i) => {
          const ly = 0.42 * Math.sin(a);
          const lz = 0.42 * Math.cos(a);
          return (
            <group key={i}>
              <mesh position={[w * 0.55, ly, lz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.042, 0.042, 0.14, 6]} />
                <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.95} />
              </mesh>
              <mesh position={[-w * 0.55, ly, lz]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.042, 0.042, 0.14, 6]} />
                <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.95} />
              </mesh>
            </group>
          );
        })}
      </mesh>
    </group>
  );
}

// Heavy rear dual tires with planetary drive hub & differential axle housing
function RearDualWheel({ x, z }: DualWheelProps) {
  const r = DUMPER.wheelRadius;
  const w = DUMPER.wheelWidth * 0.88;
  const spacing = 1.02;

  return (
    <group position={[x, r, z]}>
      {/* Heavy Axle Housing & Brake Drum */}
      <mesh position={[x > 0 ? -0.7 : 0.7, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.32, 1.5, 14]} />
        <meshStandardMaterial color="#18181b" roughness={0.7} metalness={0.6} />
      </mesh>

      {/* Rotating Dual Wheel Assembly */}
      <mesh
        ref={(m) => {
          if (m) rigParts.spokes.push(m);
        }}
      >
        {/* Outer Wheel Assembly */}
        <group position={[x > 0 ? spacing / 2 : -spacing / 2, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r, r, w, 28]} />
            <meshStandardMaterial color={C.tire} roughness={0.94} />
          </mesh>
          {TREAD_BLOCKS.map((ang, i) => (
            <group key={`ot${i}`} rotation={[ang, 0, 0]}>
              <mesh position={[0, r * 0.98, 0]}>
                <boxGeometry args={[w * 0.94, 0.1, 0.18]} />
                <meshStandardMaterial color="#09090b" roughness={0.98} />
              </mesh>
            </group>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.6, r * 0.54, w * 1.06, 20]} />
            <meshStandardMaterial color={C.rim} roughness={0.3} metalness={0.85} />
          </mesh>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.32, r * 0.32, w * 1.2, 14]} />
            <meshStandardMaterial color={C.hub} roughness={0.35} metalness={0.75} />
          </mesh>
        </group>

        {/* Inner Wheel Assembly */}
        <group position={[x > 0 ? -spacing / 2 : spacing / 2, 0, 0]}>
          <mesh castShadow receiveShadow rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r, r, w, 28]} />
            <meshStandardMaterial color={C.tire} roughness={0.94} />
          </mesh>
          {TREAD_BLOCKS.map((ang, i) => (
            <group key={`it${i}`} rotation={[ang, 0, 0]}>
              <mesh position={[0, r * 0.98, 0]}>
                <boxGeometry args={[w * 0.94, 0.1, 0.18]} />
                <meshStandardMaterial color="#09090b" roughness={0.98} />
              </mesh>
            </group>
          ))}
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[r * 0.6, r * 0.54, w * 1.06, 20]} />
            <meshStandardMaterial color={C.rim} roughness={0.3} metalness={0.85} />
          </mesh>
        </group>

        {/* Outer Lug Nuts */}
        {LUGS.map((a, i) => {
          const ly = 0.42 * Math.sin(a);
          const lz = 0.42 * Math.cos(a);
          const px = x > 0 ? spacing / 2 + w * 0.56 : -spacing / 2 - w * 0.56;
          return (
            <mesh key={i} position={[px, ly, lz]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.042, 0.042, 0.14, 6]} />
              <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.95} />
            </mesh>
          );
        })}
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
      const pulse = 0.5 + 0.5 * Math.sin(t * 9);
      beaconLight.current.intensity = pulse * 6;
      const mat = beaconMesh.current.material as THREE.MeshStandardMaterial;
      if (mat) mat.emissiveIntensity = 0.8 + pulse * 2.5;
    }
  });

  const isBraking = gear === "R" || gear === "N";
  const inCockpit = camMode === "cockpit";

  return (
    <group ref={rig}>
      <group ref={body} position={[0, DUMPER.chassis.y, 0]}>
        {/* ========================================================================= */}
        {/* 1. CHASSIS FRAME & STRUCTURAL RAILS                                       */}
        {/* ========================================================================= */}
        {/* Longitudinal Box-Section Frame Rails (Left & Right) */}
        <mesh castShadow position={[-1.4, 0.8, 0.3]}>
          <boxGeometry args={[0.55, 0.85, 7.8]} />
          <meshStandardMaterial color={C.chassis} roughness={0.7} metalness={0.7} />
        </mesh>
        <mesh castShadow position={[1.4, 0.8, 0.3]}>
          <boxGeometry args={[0.55, 0.85, 7.8]} />
          <meshStandardMaterial color={C.chassis} roughness={0.7} metalness={0.7} />
        </mesh>
        {/* Heavy Cross-Members */}
        {[-3.0, -1.0, 1.2, 3.2].map((cz, i) => (
          <mesh key={`cm${i}`} castShadow position={[0, 0.78, cz]}>
            <boxGeometry args={[2.5, 0.45, 0.4]} />
            <meshStandardMaterial color={C.chassis} roughness={0.8} metalness={0.6} />
          </mesh>
        ))}

        {/* Chassis Center Belly Skid Plate & Transmission Shield */}
        <mesh castShadow position={[0, 0.42, 0.2]}>
          <boxGeometry args={[3.2, 0.25, 6.8]} />
          <meshStandardMaterial color={C.chassisDark} roughness={0.9} />
        </mesh>

        {/* Side Impact Protection Skirts */}
        <mesh castShadow position={[-2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.3, 0.75, 7.2]} />
          <meshStandardMaterial color="#27272a" roughness={0.8} metalness={0.5} />
        </mesh>
        <mesh castShadow position={[2.45, 0.55, 0.3]}>
          <boxGeometry args={[0.3, 0.75, 7.2]} />
          <meshStandardMaterial color="#27272a" roughness={0.8} metalness={0.5} />
        </mesh>

        {/* ========================================================================= */}
        {/* 2. AUXILIARY TANKS & EQUIPMENT MODULES                                    */}
        {/* ========================================================================= */}
        {/* Left Heavy Cylindrical Diesel Fuel Tank with Steel Straps */}
        <group position={[-2.1, 0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.62, 0.62, 3.4, 20]} />
            <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.65} />
          </mesh>
          {/* Chrome Filler Neck & Breather Cap */}
          <mesh position={[0.55, 1.2, 0]} rotation={[0, 0, Math.PI / 3]}>
            <cylinderGeometry args={[0.1, 0.1, 0.25, 12]} />
            <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
          </mesh>
          {/* Tank Mounting Steel Straps */}
          {[-1.0, 0, 1.0].map((sy, i) => (
            <mesh key={`st${i}`} position={[0, sy, 0]}>
              <cylinderGeometry args={[0.64, 0.64, 0.12, 20]} />
              <meshStandardMaterial color={C.bodyAccent} roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
        </group>

        {/* Right Hydraulic Fluid Reservoir with Sight Gauge */}
        <group position={[2.1, 0.9, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.62, 0.62, 3.4, 20]} />
            <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.65} />
          </mesh>
          {/* Hydraulic Level Sight Glass Indicator */}
          <mesh position={[-0.6, 0.2, 0]}>
            <boxGeometry args={[0.06, 0.9, 0.12]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.6} />
          </mesh>
          {[-1.0, 0, 1.0].map((sy, i) => (
            <mesh key={`rst${i}`} position={[0, sy, 0]}>
              <cylinderGeometry args={[0.64, 0.64, 0.12, 20]} />
              <meshStandardMaterial color={C.bodyAccent} roughness={0.4} metalness={0.5} />
            </mesh>
          ))}
        </group>

        {/* Dual High-Pressure Air Brake Accumulators */}
        <group position={[0, 0.65, -1.8]} rotation={[0, 0, Math.PI / 2]}>
          <mesh castShadow position={[0.2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 2.2, 16]} />
            <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
          </mesh>
          <mesh castShadow position={[-0.2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 2.2, 16]} />
            <meshStandardMaterial color="#52525b" roughness={0.3} metalness={0.8} />
          </mesh>
        </group>

        {/* Battery & High-Voltage Power Electronics Enclosure with Hazard Decal */}
        <group position={[-2.2, 1.6, -1.8]}>
          <mesh castShadow>
            <boxGeometry args={[0.7, 0.65, 1.2]} />
            <meshStandardMaterial color="#27272a" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* High Voltage Danger Striping */}
          <mesh position={[-0.36, 0, 0]}>
            <boxGeometry args={[0.02, 0.18, 0.8]} />
            <meshStandardMaterial color={C.hazardYellow} roughness={0.4} />
          </mesh>
        </group>

        {/* ========================================================================= */}
        {/* 3. FRONT BUMPER, RADIATOR GRILLE & LED LIGHTING                           */}
        {/* ========================================================================= */}
        {/* Massive Cast Steel Front Push Bumper */}
        <mesh castShadow position={[0, 0.22, -4.2]}>
          <boxGeometry args={[4.4, 0.85, 0.8]} />
          <meshStandardMaterial color={C.chassisDark} roughness={0.85} metalness={0.5} />
        </mesh>
        {/* Bumper Center Reinforced Impact Push Block */}
        <mesh castShadow position={[0, 0.22, -4.62]}>
          <boxGeometry args={[1.8, 0.65, 0.22]} />
          <meshStandardMaterial color="#27272a" roughness={0.6} metalness={0.7} />
        </mesh>

        {/* Dual Heavy-Duty Forged Steel Tow Hooks / Shackles (Red) */}
        {[-1.2, 1.2].map((tx, i) => (
          <group key={`th${i}`} position={[tx, 0.2, -4.68]}>
            <mesh castShadow>
              <torusGeometry args={[0.14, 0.045, 10, 18]} />
              <meshStandardMaterial color={C.safetyRed} roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[0, 0.12, 0.08]}>
              <boxGeometry args={[0.15, 0.18, 0.12]} />
              <meshStandardMaterial color="#27272a" metalness={0.8} />
            </mesh>
          </group>
        ))}

        {/* Radiator Lower Sub-Frame Housing */}
        <mesh castShadow position={[0, 1.15, -4.12]}>
          <boxGeometry args={[3.4, 1.05, 0.55]} />
          <meshStandardMaterial color="#1c1917" roughness={0.8} />
        </mesh>

        {/* Radiator Honeycomb Dark Intake Mesh */}
        <mesh castShadow position={[0, 1.15, -4.38]}>
          <boxGeometry args={[2.9, 0.85, 0.08]} />
          <meshStandardMaterial color="#09090b" roughness={0.95} />
        </mesh>

        {/* Horizontal Chrome Aerodynamic Cooling Grille Slats */}
        {[-0.28, -0.14, 0, 0.14, 0.28].map((gy, i) => (
          <mesh key={`gs${i}`} position={[0, 1.15 + gy, -4.42]}>
            <boxGeometry args={[2.7, 0.045, 0.05]} />
            <meshStandardMaterial color={C.chrome} roughness={0.2} metalness={0.9} />
          </mesh>
        ))}

        {/* Center CAT / Mining Emblem Badge */}
        <mesh position={[0, 1.48, -4.44]}>
          <boxGeometry args={[0.55, 0.2, 0.05]} />
          <meshStandardMaterial color={C.body} roughness={0.3} metalness={0.4} />
        </mesh>

        {/* Front High-Intensity LED Projector Headlight Pods */}
        <group position={[-1.5, 1.25, -4.42]}>
          {/* Housing Bezel */}
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.32, 0.16]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.8} />
          </mesh>
          {/* Dual Lens Assembly */}
          <mesh position={[-0.14, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 3.5 : 0}
            />
          </mesh>
          <mesh position={[0.14, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 3.5 : 0}
            />
          </mesh>
          {/* Turn Signal / Amber Marker */}
          <mesh position={[0.26, 0, -0.06]}>
            <boxGeometry args={[0.06, 0.22, 0.04]} />
            <meshStandardMaterial color={C.lightAmber} emissive={C.lightAmber} emissiveIntensity={1.2} />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[-1.5, -1.2, -40]}
              intensity={40}
              distance={90}
              angle={0.68}
              penumbra={0.45}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        <group position={[1.5, 1.25, -4.42]}>
          <mesh castShadow>
            <boxGeometry args={[0.65, 0.32, 0.16]} />
            <meshStandardMaterial color="#18181b" roughness={0.6} metalness={0.8} />
          </mesh>
          <mesh position={[-0.14, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 3.5 : 0}
            />
          </mesh>
          <mesh position={[0.14, 0, -0.07]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.05, 14]} />
            <meshStandardMaterial
              color={headlights ? C.headlightOn : C.headlightOff}
              emissive={headlights ? C.headlightOn : "#000000"}
              emissiveIntensity={headlights ? 3.5 : 0}
            />
          </mesh>
          <mesh position={[-0.26, 0, -0.06]}>
            <boxGeometry args={[0.06, 0.22, 0.04]} />
            <meshStandardMaterial color={C.lightAmber} emissive={C.lightAmber} emissiveIntensity={1.2} />
          </mesh>
          {headlights && (
            <spotLight
              position={[0, 0, -0.2]}
              target-position={[1.5, -1.2, -40]}
              intensity={40}
              distance={90}
              angle={0.68}
              penumbra={0.45}
              color="#fef08a"
              castShadow
            />
          )}
        </group>

        {/* Lower Bumper Auxiliary Fog Lamps */}
        {[-0.6, 0.6].map((fx, i) => (
          <mesh key={`fl${i}`} position={[fx, 0.35, -4.62]}>
            <boxGeometry args={[0.28, 0.14, 0.06]} />
            <meshStandardMaterial
              color={headlights ? "#fef08a" : "#3f3f46"}
              emissive={headlights ? "#fef08a" : "#000000"}
              emissiveIntensity={headlights ? 2.0 : 0}
            />
          </mesh>
        ))}

        {/* ========================================================================= */}
        {/* 4. DIAGONAL ACCESS STAIRWAY & WALKWAY DECK                                */}
        {/* ========================================================================= */}
        {/* Right-Side Diagonal Staircase leading from bumper to operator deck */}
        <group position={[1.35, 1.05, -3.95]} rotation={[0.48, 0, 0]}>
          {/* Main Stair Stringer Channel */}
          <mesh castShadow>
            <boxGeometry args={[0.95, 0.1, 2.3]} />
            <meshStandardMaterial color="#27272a" roughness={0.7} metalness={0.5} />
          </mesh>
          {/* Individual Non-Slip Step Treads */}
          {[-0.8, -0.4, 0, 0.4, 0.8].map((sy, i) => (
            <mesh key={`st${i}`} position={[0, 0.08, sy]}>
              <boxGeometry args={[0.85, 0.05, 0.18]} />
              <meshStandardMaterial color={C.hazardYellow} roughness={0.4} />
            </mesh>
          ))}
          {/* Staircase Safety Handrails */}
          <mesh position={[0.48, 0.55, 0]}>
            <boxGeometry args={[0.06, 0.9, 2.3]} />
            <meshStandardMaterial color={C.handrail} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>

        {/* Operator Walkway Platform Deck (Around Cab) */}
        <mesh castShadow position={[0.7, 1.85, -3.15]}>
          <boxGeometry args={[2.2, 0.12, 2.1]} />
          <meshStandardMaterial color={C.deck} roughness={0.6} metalness={0.6} />
        </mesh>
        {/* Front Deck Platform Extension */}
        <mesh castShadow position={[-0.45, 1.85, -3.95]}>
          <boxGeometry args={[2.6, 0.12, 0.65]} />
          <meshStandardMaterial color={C.deck} roughness={0.6} metalness={0.6} />
        </mesh>

        {/* Perimeter Safety Handrails (Painted Safety Yellow) */}
        {/* Front Walkway Rail */}
        <mesh position={[-0.45, 2.35, -4.25]}>
          <boxGeometry args={[2.55, 0.85, 0.06]} />
          <meshStandardMaterial color={C.handrail} roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Right Walkway Outer Rail */}
        <mesh position={[1.78, 2.35, -3.15]}>
          <boxGeometry args={[0.06, 0.85, 2.05]} />
          <meshStandardMaterial color={C.handrail} roughness={0.4} metalness={0.4} />
        </mesh>
        {/* Left Access Ladder Rail */}
        <mesh position={[-1.72, 2.35, -3.4]}>
          <boxGeometry args={[0.06, 0.85, 1.4]} />
          <meshStandardMaterial color={C.handrail} roughness={0.4} metalness={0.4} />
        </mesh>

        {/* Dual Pressurized Fire Suppression Cylinders on Walkway */}
        <group position={[1.45, 2.25, -2.6]}>
          <mesh castShadow position={[-0.15, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.75, 12]} />
            <meshStandardMaterial color={C.safetyRed} roughness={0.3} metalness={0.6} />
          </mesh>
          <mesh castShadow position={[0.15, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.75, 12]} />
            <meshStandardMaterial color={C.safetyRed} roughness={0.3} metalness={0.6} />
          </mesh>
        </group>

        {/* ========================================================================= */}
        {/* 5. OPERATOR CABIN (ROPS/FOPS CHISELED DESIGN)                             */}
        {/* ========================================================================= */}
        {/* Main Cabin Body Shell (Left-Offset Industrial Mining Ergonomics) */}
        <mesh castShadow position={[-0.55, 2.5, -3.15]}>
          <boxGeometry args={[2.1, 1.45, 1.75]} />
          <meshStandardMaterial color={C.body} roughness={0.4} metalness={0.2} />
        </mesh>

        {/* Cab Chamfered Lower Base & Isolation Mounts */}
        <mesh castShadow position={[-0.55, 1.82, -3.15]}>
          <boxGeometry args={[2.18, 0.18, 1.82]} />
          <meshStandardMaterial color={C.chassisDark} roughness={0.7} metalness={0.6} />
        </mesh>

        {/* Heavy ROPS/FOPS Roll-Over Cage Pillars */}
        {[-1.56, 0.46].map((px, i) => (
          <group key={`rops${i}`}>
            <mesh castShadow position={[px, 2.5, -3.98]}>
              <boxGeometry args={[0.12, 1.55, 0.12]} />
              <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[px, 2.5, -2.32]}>
              <boxGeometry args={[0.12, 1.55, 0.12]} />
              <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* Cab Roof Heavy Protective Canopy Cap */}
        <mesh castShadow position={[-0.55, 3.28, -3.15]}>
          <boxGeometry args={[2.32, 0.22, 1.95]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.45} metalness={0.3} />
        </mesh>

        {/* Angled Sun Visor Brow over Front Windshield */}
        <mesh castShadow position={[-0.55, 3.12, -4.08]} rotation={[0.3, 0, 0]}>
          <boxGeometry args={[2.2, 0.18, 0.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* Roof HVAC & HEPA Pressurizer Unit */}
        <group position={[-0.55, 3.5, -2.7]}>
          <mesh castShadow>
            <boxGeometry args={[1.35, 0.28, 0.9]} />
            <meshStandardMaterial color="#3f3f46" roughness={0.6} metalness={0.5} />
          </mesh>
          {/* Dual Ventilation Intake Fan Covers */}
          <mesh position={[-0.32, 0.15, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.8} />
          </mesh>
          <mesh position={[0.32, 0.15, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.05, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.8} />
          </mesh>
        </group>

        {/* Front Laminated Panoramic Safety Glass (Transparent, clear in cockpit) */}
        {!inCockpit && (
          <mesh position={[-0.55, 2.55, -4.04]}>
            <boxGeometry args={[1.92, 0.95, 0.04]} />
            <meshStandardMaterial
              color={C.glass}
              transparent
              opacity={0.16}
              roughness={0.05}
              metalness={0.15}
              depthWrite={false}
            />
          </mesh>
        )}

        {/* Dual Pantograph Windshield Wipers */}
        {!inCockpit && (
          <group position={[-0.55, 2.25, -4.08]}>
            <mesh position={[-0.4, 0.25, 0]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.03, 0.6, 0.02]} />
              <meshStandardMaterial color="#09090b" roughness={0.8} />
            </mesh>
            <mesh position={[0.4, 0.25, 0]} rotation={[0, 0, -0.4]}>
              <boxGeometry args={[0.03, 0.6, 0.02]} />
              <meshStandardMaterial color="#09090b" roughness={0.8} />
            </mesh>
          </group>
        )}

        {/* Side Safety Windows */}
        <mesh position={[-1.61, 2.55, -3.15]}>
          <boxGeometry args={[0.04, 0.85, 1.4]} />
          <meshStandardMaterial
            color={C.glass}
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.15}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0.51, 2.55, -3.15]}>
          <boxGeometry args={[0.04, 0.85, 1.4]} />
          <meshStandardMaterial
            color={C.glass}
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.15}
            depthWrite={false}
          />
        </mesh>

        {/* Heavy Side-View Heated Mirrors with Convex Spotters on Steel Tubular Arms */}
        <group position={[-1.88, 2.65, -3.85]}>
          {/* Tubular Extension Bracket */}
          <mesh position={[0.15, -0.15, 0.3]} rotation={[0, 0.4, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.6]} />
            <meshStandardMaterial color="#27272a" metalness={0.8} />
          </mesh>
          {/* Main Mirror Casing */}
          <mesh castShadow>
            <boxGeometry args={[0.08, 0.55, 0.26]} />
            <meshStandardMaterial color="#18181b" roughness={0.4} />
          </mesh>
          {/* Flat Glass Surface */}
          <mesh position={[0.05, 0.06, 0]}>
            <boxGeometry args={[0.02, 0.36, 0.22]} />
            <meshStandardMaterial color={C.chrome} roughness={0.05} metalness={0.98} />
          </mesh>
          {/* Lower Convex Spotter Mirror */}
          <mesh position={[0.05, -0.18, 0]}>
            <boxGeometry args={[0.02, 0.12, 0.22]} />
            <meshStandardMaterial color={C.chrome} roughness={0.05} metalness={0.98} />
          </mesh>
        </group>

        {/* High-Gain Telemetry Whip Antenna with Safety Flag */}
        <group position={[-1.4, 3.4, -2.4]}>
          <mesh>
            <cylinderGeometry args={[0.015, 0.02, 1.8, 8]} />
            <meshStandardMaterial color="#e4e4e7" metalness={0.9} />
          </mesh>
          {/* Safety Tip Pennant */}
          <mesh position={[0.08, 0.8, 0]}>
            <boxGeometry args={[0.15, 0.08, 0.01]} />
            <meshStandardMaterial color={C.hazardYellow} />
          </mesh>
        </group>

        {/* Flashing Amber Safety Strobe Beacon on Roof */}
        <group position={[-0.55, 3.42, -3.6]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.14, 0.18, 12]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} metalness={0.7} />
          </mesh>
          <mesh ref={beaconMesh} position={[0, 0.16, 0]}>
            <sphereGeometry args={[0.15, 14, 10]} />
            <meshStandardMaterial
              color={C.beacon}
              emissive={C.beacon}
              emissiveIntensity={2.2}
              roughness={0.1}
            />
          </mesh>
          <pointLight ref={beaconLight} position={[0, 0.3, 0]} color="#f59e0b" distance={24} intensity={6} />
        </group>

        {/* 4-Unit High-Intensity LED Light Bar on Cab Roof */}
        <group position={[-0.55, 3.42, -4.08]}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.14, 0.14]} />
            <meshStandardMaterial color="#18181b" metalness={0.8} />
          </mesh>
          {[-0.5, -0.17, 0.17, 0.5].map((lx, i) => (
            <mesh key={`lb${i}`} position={[lx, 0, -0.08]}>
              <boxGeometry args={[0.22, 0.08, 0.04]} />
              <meshStandardMaterial
                color={headlights ? "#ffffff" : "#3f3f46"}
                emissive={headlights ? "#ffffff" : "#000000"}
                emissiveIntensity={headlights ? 4.0 : 0}
              />
            </mesh>
          ))}
        </group>

        {/* ========================================================================= */}
        {/* 6. DUAL VERTICAL EXHAUST STACKS & AIR CLEANERS                            */}
        {/* ========================================================================= */}
        {/* Dual Chrome Exhaust Stacks with Perforated Heat Shields */}
        <group position={[1.4, 2.9, -2.2]}>
          {/* Exhaust Pipe Column */}
          <mesh castShadow>
            <cylinderGeometry args={[0.13, 0.16, 2.4, 16]} />
            <meshStandardMaterial color={C.chrome} roughness={0.15} metalness={0.95} />
          </mesh>
          {/* Perforated Heat Shield Guard */}
          <mesh castShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[0.18, 0.18, 1.6, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.5} metalness={0.7} />
          </mesh>
          {/* Curved Rain Discharge Elbow & Flapper Cap */}
          <mesh castShadow position={[0, 1.25, 0.08]} rotation={[0.4, 0, 0]}>
            <cylinderGeometry args={[0.14, 0.12, 0.4, 14]} />
            <meshStandardMaterial color="#18181b" roughness={0.7} />
          </mesh>
        </group>

        {/* Dual Heavy Vortex Air Cleaners on Right Deck */}
        <group position={[0.7, 2.5, -2.1]}>
          <mesh castShadow position={[-0.28, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 1.0, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.6} metalness={0.5} />
          </mesh>
          <mesh castShadow position={[0.28, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.24, 1.0, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.6} metalness={0.5} />
          </mesh>
        </group>

        {/* ========================================================================= */}
        {/* 7. HYDRAULIC HOIST CYLINDERS & DUMP BODY (THE BIN)                        */}
        {/* ========================================================================= */}
        {/* Twin Multi-Stage Telescopic Chrome Hoist Rams */}
        <group position={[-1.2, 1.85, -0.55]} rotation={[-0.32, 0, 0]}>
          {/* Outer Cylinder Barrel */}
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.25, 1.8, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.7} />
          </mesh>
          {/* Inner Telescopic Chrome Piston Rod */}
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 1.4, 16]} />
            <meshStandardMaterial color={C.chrome} roughness={0.08} metalness={0.98} />
          </mesh>
        </group>

        <group position={[1.2, 1.85, -0.55]} rotation={[-0.32, 0, 0]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.22, 0.25, 1.8, 16]} />
            <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.7} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.15, 0.15, 1.4, 16]} />
            <meshStandardMaterial color={C.chrome} roughness={0.08} metalness={0.98} />
          </mesh>
        </group>

        {/* Mining Haul Body / Dump Bin (V-Bottom High-Strength Rock Body) */}
        {/* Main Floor Bed (V-Bottom Section) */}
        <mesh castShadow position={[0, 2.15, 0.95]}>
          <boxGeometry args={[5.35, 0.8, 4.8]} />
          <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.25} />
        </mesh>

        {/* Heavy Cab Protector Canopy Overhang (Forward Sloping Shield) */}
        <group position={[0, 3.65, -1.75]} rotation={[-0.14, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[5.55, 0.35, 2.2]} />
            <meshStandardMaterial color={C.body} roughness={0.45} metalness={0.25} />
          </mesh>
          {/* Triangular Canopy Gussets */}
          {[-2.5, -1.2, 0, 1.2, 2.5].map((gx, i) => (
            <mesh key={`cg${i}`} castShadow position={[gx, -0.55, 0.2]} rotation={[0.4, 0, 0]}>
              <boxGeometry args={[0.12, 0.9, 0.8]} />
              <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
            </mesh>
          ))}
        </group>

        {/* Front Bulkhead Wall */}
        <mesh castShadow position={[0, 3.45, -0.9]}>
          <boxGeometry args={[5.4, 2.3, 0.45]} />
          <meshStandardMaterial color={C.body} roughness={0.45} />
        </mesh>

        {/* Left Sloped Side Wall with Heavy Bolster Flanges */}
        <mesh castShadow position={[-2.95, 3.45, 0.95]} rotation={[0, 0, 0.05]}>
          <boxGeometry args={[0.45, 2.25, 4.8]} />
          <meshStandardMaterial color={C.body} roughness={0.45} />
        </mesh>
        {/* Right Sloped Side Wall */}
        <mesh castShadow position={[2.95, 3.45, 0.95]} rotation={[0, 0, -0.05]}>
          <boxGeometry args={[0.45, 2.25, 4.8]} />
          <meshStandardMaterial color={C.body} roughness={0.45} />
        </mesh>

        {/* Rear Tapered Rock-Ejector Tail Chute */}
        <mesh castShadow position={[0, 3.25, 3.4]} rotation={[0.18, 0, 0]}>
          <boxGeometry args={[4.8, 1.8, 0.45]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* External Structural Box-Ribs (Vertical Reinforcements on Side Walls) */}
        {[-1.0, 0.0, 1.0, 2.0, 3.0].map((rz, i) => (
          <group key={`rib${i}`}>
            <mesh castShadow position={[-3.22, 3.45, rz]}>
              <boxGeometry args={[0.18, 2.2, 0.22]} />
              <meshStandardMaterial color={C.bodyAccent} roughness={0.5} />
            </mesh>
            <mesh castShadow position={[3.22, 3.45, rz]}>
              <boxGeometry args={[0.18, 2.2, 0.22]} />
              <meshStandardMaterial color={C.bodyAccent} roughness={0.5} />
            </mesh>
          </group>
        ))}

        {/* Upper Top Rail Impact Box Beams */}
        <mesh castShadow position={[-2.98, 4.58, 0.95]}>
          <boxGeometry args={[0.35, 0.25, 4.85]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[2.98, 4.58, 0.95]}>
          <boxGeometry args={[0.35, 0.25, 4.85]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[0, 4.58, -0.9]}>
          <boxGeometry args={[5.6, 0.25, 0.35]} />
          <meshStandardMaterial color={C.bodyDark} roughness={0.5} />
        </mesh>

        {/* High-Grade Sparkling Iron Ore Payload (Heaped in the Bin) */}
        <group position={[0, 3.1, 0.95]}>
          <mesh castShadow position={[0, 0, 0]}>
            <boxGeometry args={[4.95, 1.35, 4.35]} />
            <meshStandardMaterial color={C.load} roughness={0.96} metalness={0.2} />
          </mesh>
          {/* Sculpted Iron Ore Peaks */}
          <mesh position={[0, 0.75, 0]}>
            <coneGeometry args={[2.1, 0.9, 14]} />
            <meshStandardMaterial color={C.loadOre} roughness={0.98} metalness={0.25} />
          </mesh>
          <mesh position={[-0.9, 0.65, -0.8]}>
            <coneGeometry args={[1.4, 0.7, 10]} />
            <meshStandardMaterial color={C.load} roughness={0.98} />
          </mesh>
          <mesh position={[0.9, 0.65, 0.8]}>
            <coneGeometry args={[1.4, 0.7, 10]} />
            <meshStandardMaterial color={C.load} roughness={0.98} />
          </mesh>
        </group>

        {/* ========================================================================= */}
        {/* 8. REAR BUMPER, TAILLIGHTS & HAZARD MUDFLAPS                              */}
        {/* ========================================================================= */}
        {/* Rear Heavy-Duty Cast Bumper */}
        <mesh castShadow position={[0, 0.72, 4.15]}>
          <boxGeometry args={[4.2, 0.7, 0.55]} />
          <meshStandardMaterial color={C.chassisDark} roughness={0.85} metalness={0.6} />
        </mesh>

        {/* Center Heavy Tow Pintle Hitch */}
        <mesh castShadow position={[0, 0.7, 4.48]}>
          <boxGeometry args={[0.55, 0.35, 0.2]} />
          <meshStandardMaterial color="#27272a" roughness={0.4} metalness={0.8} />
        </mesh>

        {/* Tri-Chamber Rear LED Taillight / Brake Light Assemblies */}
        <group position={[-1.55, 0.75, 4.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.24, 0.08]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} />
          </mesh>
          {/* Red Brake Light Section */}
          <mesh position={[-0.14, 0, 0.03]}>
            <boxGeometry args={[0.2, 0.18, 0.04]} />
            <meshStandardMaterial
              color={isBraking ? C.taillightBrake : C.taillightDim}
              emissive={isBraking ? C.taillightBrake : "#200000"}
              emissiveIntensity={isBraking ? 3.2 : 0.4}
            />
          </mesh>
          {/* Amber Turn Section */}
          <mesh position={[0.07, 0, 0.03]}>
            <boxGeometry args={[0.14, 0.18, 0.04]} />
            <meshStandardMaterial color={C.lightAmber} emissive={C.lightAmber} emissiveIntensity={0.8} />
          </mesh>
          {/* White Reverse Worklight */}
          <mesh position={[0.2, 0, 0.03]}>
            <boxGeometry args={[0.08, 0.18, 0.04]} />
            <meshStandardMaterial
              color={gear === "R" ? C.lightWhite : "#3f3f46"}
              emissive={gear === "R" ? C.lightWhite : "#000000"}
              emissiveIntensity={gear === "R" ? 3.0 : 0}
            />
          </mesh>
        </group>

        <group position={[1.55, 0.75, 4.45]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 0.24, 0.08]} />
            <meshStandardMaterial color="#18181b" roughness={0.5} />
          </mesh>
          <mesh position={[0.14, 0, 0.03]}>
            <boxGeometry args={[0.2, 0.18, 0.04]} />
            <meshStandardMaterial
              color={isBraking ? C.taillightBrake : C.taillightDim}
              emissive={isBraking ? C.taillightBrake : "#200000"}
              emissiveIntensity={isBraking ? 3.2 : 0.4}
            />
          </mesh>
          <mesh position={[-0.07, 0, 0.03]}>
            <boxGeometry args={[0.14, 0.18, 0.04]} />
            <meshStandardMaterial color={C.lightAmber} emissive={C.lightAmber} emissiveIntensity={0.8} />
          </mesh>
          <mesh position={[-0.2, 0, 0.03]}>
            <boxGeometry args={[0.08, 0.18, 0.04]} />
            <meshStandardMaterial
              color={gear === "R" ? C.lightWhite : "#3f3f46"}
              emissive={gear === "R" ? C.lightWhite : "#000000"}
              emissiveIntensity={gear === "R" ? 3.0 : 0}
            />
          </mesh>
        </group>

        {/* Heavy Reinforced Rubber Mudflaps with Diagonal Hazard Chevron Striping */}
        <group position={[0, 0.85, 3.8]}>
          <mesh castShadow>
            <boxGeometry args={[3.8, 1.25, 0.08]} />
            <meshStandardMaterial color="#09090b" roughness={0.98} />
          </mesh>
          {/* Anti-Sail Bottom Steel Weights */}
          <mesh position={[0, -0.58, 0.04]}>
            <boxGeometry args={[3.7, 0.08, 0.04]} />
            <meshStandardMaterial color={C.hazardYellow} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* ========================================================================= */}
      {/* 9. AXLES & WHEEL HUBS                                                     */}
      {/* ========================================================================= */}
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