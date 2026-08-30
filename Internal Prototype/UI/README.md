# HEMM Dumper Simulator — SIH Prototype (Next.js + Three.js)

An interactive **full-screen 3D** HEMM dumper truck simulator for Smart India Hackathon.
Drive with the keyboard **and/or** the **Virtual Tilt Pad** (our MPU6050 stand-in).

## Run it

```bash
npm install        # once, first time
npm run dev        # start the dev server
```

Open **http://localhost:3000** in your browser.

## Controls

| Key | Action |
|-----|--------|
| `W` / `S` | Accelerate forward / reverse |
| `A` / `D` | Steer left / right |
| `W + S` (held) | Boost (speed ramps beyond normal max) |
| `C` | Toggle camera (chase ↔ top-down) |
| `R` | Reset truck to start |

**Virtual Tilt Pad (bottom-right)** — simulates the MPU6050 and **controls the camera**:

- **Drag** the yellow ball → the camera orbits to show the truck from that side
  (pull right = right side, up = front, left = left side, down = rear). The further
  you pull toward the pad edge, the higher/overhead the view gets.
- Release → camera glides back behind the truck. Works while driving.
- **Tap** the pad = pothole impact. **Fast flick** = road anomaly.
- Watch the live sensor stream on the HUD when an anomaly fires.

The pad drives the **truck?** No — the truck is keyboard-only. The pad is a view control.

## What the Virtual Tilt Pad simulates (MPU6050)

The pad converts a 2D mouse offset `(ΔX, ΔY)` from pad center into 6-axis sensor data
using polar mapping:

```
r     = min(√(ΔX² + ΔY²), Rmax)            // clamped distance from center
k     = r / Rmax                           // tilt factor 0..1
θ     = atan2(-ΔY, ΔX)                     // heading angle
roll  = k · cos(θ) · MaxRoll   (±30°)      // steers the truck
pitch = k · sin(θ) · MaxPitch  (±30°)      // drives the truck
yaw   = heading angle (0–360°)             // dead-reckoning heading
```

Accelerometer & gyro are derived from the tilt angles every frame:

```
Ax   = sin(pitch)                      // g-force, = 0 g at flat
Ay   = sin(roll)
Az   = cos(pitch)·cos(roll) + vibration + impact
gyro = d(angle)/dt                     // deg/sec on each axis
```

**Road anomaly / pothole:** a tap or fast-flick adds a decaying `Az` +2.5g spike.
While the spike is active the truck jolts, the camera shakes, and the HUD flags
`road_anomaly_detected`.

The truck consumes data **only** from `lib/simStore.ts`, and the camera from
`lib/virtualSensor.ts`. To attach the real MPU6050 later (ESP32/Arduino → Web Serial),
feed actual sensor values through the sensor store — the camera needs no changes.

## Project structure

```
app/
  layout.tsx          metadata + fonts + fullscreen shell
  page.tsx            canvas + HUD + TiltPad overlays
  globals.css         fullscreen reset, dark theme
components/
  Scene.tsx           Canvas, fog, lights
  Dumper.tsx          truck body + 6 wheels (front pair steerable)
  Controls.tsx        physics: WASD throttle/steer/boost + all animations
  CameraRig.tsx       sensor-driven orbital camera + top-down + impact shake
  Terrain.tsx         minesite: road, rocks, cones, mounds
  HUD.tsx             speedometer, controls, live MPU6050 readout
  TiltPad.tsx         virtual MPU6050 circular pad
lib/
  constants.ts        ALL tuning values in one file
  keys.ts             keyboard state (WASD + edge keys C/R)
  virtualSensor.ts    MPU6050-shaped sensor store (pad now, hardware later)
  simStore.ts         truck pose + HUD display state
  rig.ts              shared refs of truck 3D parts (mutated by loop)
```

## Tweaking (no web-dev knowledge needed)

Open `lib/constants.ts` — everything look/feel-related lives there:

- `PHYSICS` → max speed, boost speed, acceleration, steering rate, arena size
- `DUMPER.colors` → truck colour (`body`, `bin`, `tire`, …)
- `DUMPER.cabin / bin / chassis` → truck shape/size
- `SENSOR` → pad max tilt angles, pothole spike strength, smoothness
- `CAMERA` → chase distance/height, top-down height
- `SCENE` → ground/road/fog colours

Save and the dev server hot-reloads instantly.

## Checks

```bash
npm run lint    # eslint
npm run build   # type-check + production build
```