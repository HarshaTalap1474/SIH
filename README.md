# 🚛 HEMM Fleet Safety Dashboard

> **Real-time fleet monitoring and ADAS safety dashboard for Heavy Earth Moving Machinery (HEMM) — built for Smart India Hackathon (SIH).**

A Next.js-powered operational command center for monitoring a fleet of mining dump trucks (CAT 797F, Komatsu 930E-5) across a live open-cast mine environment. Includes a physics-based safety engine, ESP32 hardware integration, AI/ML ADAS client, and a 3D mine visualization with live vehicle tracking.

---

## 📌 Repository Notes

- This dashboard lives on the **`fleet_dash`** branch of `HarshaTalap1474/SIH`.
- The live 3D simulation is hosted **separately** and linked into the dashboard via the
  `NEXT_PUBLIC_CABIN_URL` environment variable (see "Deployment"). The dashboard's
  "Live Cabin" preview/route opens that simulation.
- Local dev simulation default: `http://localhost:3001`.

---

## ✨ Features

### 🗺️ Live Mine Fleet Map
- Real-time vehicle position tracking across the mine haul road network
- Color-coded vehicle markers by status: **Online**, **Warning**, **Critical**, **Offline**
- Animated route traversal with switchbacks, ramps, and pit zones
- Restricted geofence zones with polygon-based entry detection

### 📊 Fleet KPI Dashboard
- **5 live KPI cards**: Active dumpers, alerts, total distance, avg speed, system uptime
- Fleet utilization donut chart (running / idle / offline breakdown)
- Productivity trend chart with shift-over-shift comparison
- Real-time alert feed with severity classification (Critical / Warning / Info)

### 🚨 Safety Engine
- **Vehicle-to-Vehicle Proximity Alerts** — warns when separation drops below 30m, critical below 15m
- **Time-to-Collision (TTC)** — physics-based closing speed calculation per vehicle pair
- **Geofence Violation Detection** — point-in-polygon for restricted blasting zones
- **Speed Limit Enforcement** — zone-aware speed threshold monitoring
- **Person Detection Alerts** — human-in-path proximity warnings

### 🤖 ADAS ML Client
- Simulated ADAS state with: `SAFE` / `CAUTION` / `CRITICAL` collision risk levels
- Emergency brake trigger, steering guidance (`-1.0` to `+1.0`), and threat direction
- Multi-ray distance sensing (front, rear, far-left, far-right, center)
- Latency monitoring and connection state management

### 🔌 ESP32 Hardware Integration
- WebSocket connection to `ws://esp32-adas.local:81/ws` (mDNS auto-discovery)
- Physical button inputs: throttle, brake, left, right, **E-STOP**
- Virtual sensor fallback when hardware is disconnected
- Custom IP/URL override support

### 🎯 Interactive Vehicle Details Panel
- Per-vehicle drill-down: speed, gear, payload, fuel, power, heading
- Sensor health matrix: Camera, LiDAR, Radar, GPS, ESP32, AI Model
- Operator info, shift hours, and distance today
- Slide-in panel on vehicle selection with mobile-responsive backdrop

### 🏔️ 3D Mine Visualization
- Three.js / React Three Fiber scene with procedural terrain
- Volumetric fog, rain particles, and dynamic lighting
- Animated dumper truck model with camera rig and controls
- Minimap overlay for spatial orientation

### 🧭 Onboarding Tour
- Guided product walkthrough with step-by-step tooltips
- Welcome modal and completion modal
- Help tour button to re-trigger at any time

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript 5 |
| 3D Rendering | Three.js + React Three Fiber + Drei |
| State Management | Zustand |
| Styling | Tailwind CSS v4 |
| Hardware | ESP32 via WebSocket (mDNS) |
| Icons | Lucide React |
| Linting | ESLint + eslint-config-next |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm / yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/HarshaTalap1474/SIH.git
cd SIH
git checkout fleet_dash

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm run start
```

---

## 📁 Project Structure

```
fleet_dashboard/
├── app/
│   ├── page.tsx                  # Main fleet dashboard page
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   └── fleet/
│       └── [vehicleId]/
│           ├── page.tsx          # Vehicle detail page
│           └── cabin/
│               └── page.tsx      # In-cabin ADAS view
├── components/
│   ├── fleet/                    # Fleet dashboard components
│   │   ├── FleetHeader.tsx       # Top navigation bar
│   │   ├── FleetSidebar.tsx      # Left navigation
│   │   ├── FleetMap.tsx          # Live mine map
│   │   ├── KpiCard.tsx           # KPI summary cards
│   │   ├── VehicleDetailsPanel.tsx # Side panel for selected vehicle
│   │   ├── RecentAlerts.tsx      # Alert feed table
│   │   ├── FleetUtilization.tsx  # Donut utilization chart
│   │   └── ProductivityChart.tsx # Trend chart
│   ├── onboarding/               # Guided tour system
│   ├── Scene.tsx                 # Three.js 3D scene root
│   ├── Terrain.tsx               # Procedural mine terrain
│   ├── Dumper.tsx                # Animated truck model
│   ├── Rain.tsx                  # Particle rain system
│   └── VolumetricFog.tsx         # Atmospheric fog
├── lib/
│   ├── fleetData.ts              # Vehicle types & initial data (12 HEMMs)
│   ├── fleetStore.ts             # Zustand global fleet state
│   ├── safetyEngine.ts           # Physics-based safety & geofence engine
│   ├── roadNetwork.ts            # Haul road waypoint network
│   ├── mlClient.ts               # ADAS ML state client
│   ├── hardwareClient.ts         # ESP32 WebSocket hardware client
│   ├── virtualSensor.ts          # Sensor simulation fallback
│   ├── terrainElevation.ts       # Terrain height sampling
│   ├── constants.ts              # Safety thresholds & physics constants
│   └── simStore.ts               # Simulation state store
└── .gitignore
```

---

## 🚗 Fleet Overview

The dashboard monitors **12 HEMM vehicles** across the Bailadila mine haul road network:

| ID | Model | Zone |
|---|---|---|
| D-01 | CAT 797F Ultra-Class | North Bench Ramp |
| D-02 | CAT 797F Ultra-Class | East Transfer Spur |
| D-03 | CAT 797F Ultra-Class | Haul Road A |
| D-04 | Komatsu 930E-5 | Kirandul Pit Haul Highway |
| D-05 | CAT 797F Ultra-Class | Deposit 5 Central Arterial |
| D-06–D-12 | CAT 797F / Komatsu 930E-5 | Various Mine Zones |

---

## ⚙️ Safety Thresholds

| Parameter | Warning | Critical |
|---|---|---|
| Vehicle Proximity | < 30m | < 15m |
| Time-to-Collision (TTC) | < 12s | < 6s |
| Geofence Approach | 60m from boundary | Inside zone |
| Speed (ramp) | Approaching limit | Exceeded |

---

## 🔧 Hardware Setup (ESP32 ADAS Unit)

1. Flash the ESP32 firmware with WebSocket server on port `81`
2. Ensure mDNS hostname is set to `esp32-adas.local`
3. Connect to the same local network as the dashboard host
4. The dashboard auto-connects to `ws://esp32-adas.local:81/ws`
5. Use the custom URL override in the dashboard UI if needed

---

## 📄 License

This project was built for **Smart India Hackathon (SIH)**. All rights reserved.
