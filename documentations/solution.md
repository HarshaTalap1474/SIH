# Solution Approach — Cooperative Multi-Modal Fog Perception

## Problem Statement (PS 26007)

Safe and Efficient Operation of Mine Vehicles in Fog and Low-Visibility Conditions in Open Cast Iron Ore Mines (NMDC Bailadila).

- **Visibility:** 3-5m during monsoon (Jun-Oct)
- **Impact:** 50-60 days of halted/reduced mining, production losses, collision risk
- **Category:** Hardware | **Theme:** Smart Automation

---

## Core Philosophy

**No single sensor works at 3-5m fog.** Thermal sees heat, LiDAR sees geometry, radar sees velocity, cameras struggle. The only reliable solution is **thermal-first perception fused with complementary sensors at the edge**, then **shared across the fleet via V2V mesh** so every dumper sees beyond its own sensors.

---

## 1. Perception Stack (On Each Dumper)

| Sensor | Role | Why It's Essential |
|--------|------|-------------------|
| **Thermal** (FLIR Lepton 3.5 / MLX90640) | Primary — detect heat signatures (engines, exhaust, people) through fog | Only sensor that *penetrates* dense fog; cameras/LiDAR scatter |
| **LiDAR** (RPLidar A1 / YDLIDAR X4) | 360° 3D geometry — exact obstacle position, size, road edges | Works day/night, gives metric 3D positions |
| **mmWave Radar** (HLK-LD2450 / LD2410) | Closing velocity + range confirmation | Works in rain/fog, measures speed directly |
| **Stereo Cameras** (2x Pi Cam v3) | Road edge detection, haul-road guidance, daytime classification | Solves "vehicle guidance" requirement explicitly |
| **RTK-GPS** (u-blox F9P / NEO-M8N) | cm-level positioning for geo-fencing, fleet coordination | Haul-road accuracy, map matching |

### Edge Compute: Raspberry Pi 5 8GB + Google Coral USB

| Pipeline | Load | Optimization | Expected FPS |
|----------|------|--------------|--------------|
| Thermal YOLOv8n | ~4 GFLOPS | INT8 on Coral | 20-25 |
| Stereo SGBM (640x480) | ~8 GOPS | NEON + ROI | 8-10 |
| LiDAR clustering (360 pts) | Negligible | CPU | 20 |
| Radar tracking | Negligible | CPU | 20 |
| Kalman fusion (20 tracks) | Negligible | CPU | 20 |
| V2V + MQTT | Low | CPU | 10 |
| **Total** | **~12 GFLOPS sustained** | **Within Pi 5 + Coral** | **5-10 fused** |

---

## 2. Sensor Fusion (Edge)

```
Thermal (WHAT: is it a vehicle/person/hot blob)
   + LiDAR (WHERE + DISTANCE: exact 3D position, 360 degree)
   + Radar  (HOW FAST: closing velocity, works in rain)
   + Stereo (WHERE IS THE ROAD: edges, turning points)
   + GPS    (WHERE AM I: fleet + haul-road mapping)
        |
        v
   Kalman filter fusion on Pi 5
   -> one confidence-weighted object list
        |
        v
   Collision logic (TTC, safe-distance by zone)
   -> 3-stage alerts + V2V broadcast + cloud dashboard
```

**Fusion details:**
- Kalman filter fuses all streams into single confidence-weighted track list (class, position, velocity, covariance)
- Never trust a single sensor: thermal fails on cold day, LiDAR fails in heavy rain, radar can't classify, camera can't see fog
- Fuse all -> robust system

---

## 3. Cooperative Perception (V2V Mesh)

### Dual-Protocol Design
- **ESP-NOW** (short-range, <150m): High-frequency track sharing between nearby dumpers, backup
- **LoRa SX1262** (long-range, 1-2km): Fleet-wide broadcast, relay through intermediate nodes, handles blind-hill corners and long haul roads

### Message Format
```json
{
  "vehicle_id": "DUMPER_042",
  "timestamp": 1725700000.123,
  "position": {"lat": 18.1234, "lon": 81.5678, "alt": 650},
  "heading": 135.2,
  "speed": 8.5,
  "detections": [
    {"id": "OBJ_001", "class": "dumper", "conf": 0.92,
     "rel_pos": {"x": 12.3, "y": -1.2, "z": 0},
     "rel_vel": {"vx": -2.1, "vy": 0.3}}
  ],
  "fog_level": 3,
  "alert_level": 1
}
```

**Result:** Dumper A sees what Dumper B sees 200m ahead — collective situational awareness.

---

## 4. Safety Logic (3-Stage)

| Stage | Distance (TTC) | Action |
|-------|----------------|--------|
| **Warn**  | >50m / >8s | Visual + audio on in-cabin display |
| **Alert** | 20-50m / 4-8s | Haptic (seat vibration) + persistent alert |
| **Intervene** | <20m / <4s | CAN-bus brake request signal (simulated via relay) |

---

## 5. Haul-Road Guidance

Stereo depth + GPS map matching -> project road edges, turning points, gradient onto in-cabin display. Operator sees the path even when invisible.

---

## 6. Command Center (Central Monitoring)

- **Live fleet map** (Mapbox): Real-time positions, heat signatures, alerts
- **3D Digital Twin** (Three.js): GLTF mine model, vehicle replay, fog zones, collision heatmap
- **KPI Dashboard**: Fleet utilization, cycle time, alert frequency, monsoon-day continuity

---

## 7. Differentiators vs Existing Solutions

| Competitor | Their Gap | Our Answer |
|------------|-----------|------------|
| Commercial (Hexagon/Cat/Komatsu) | $15-40k, closed ecosystem, no thermal | Open, affordable, **thermal-first** |
| Academic (Chaulya 2025, Springer) | 6 IR cams + radar only, no LiDAR, no V2V, single vehicle | **Thermal + LiDAR + Radar + Stereo fusion + V2V mesh + fleet dashboard** |
| Student (SafeHaul) | UWB-only ranging, no perception, no dashboard | **Full perception stack + cooperative mesh + 3D digital twin** |

**USP:** *Every dumper sees what the whole fleet sees — through fog, in 3D, on a live digital twin.*

---

## 8. Build Tiers (Hardware Availability Dependent)

| Tier | Thermal | LiDAR | Radar | Stereo | Cost (Rs) | Win Probability |
|------|---------|-------|-------|--------|-----------|-----------------|
| **A** | FLIR Lepton 3.5 | RPLidar A1 | LD2450 | Pi Cam v3 x2 | 35-40k | High |
| **B** | MLX90640 (32x24) | YDLIDAR X4 | LD2410 | Pi Cam v3 x2 | 25-30k | Medium-High |
| **C** | AMG8833 (8x8) | Stereo depth only | HC-SR04 x4 | Pi Cam v3 x2 | 10-15k | Medium |

---

## 9. Deployment Timeline

| Phase | Target | Deliverable |
|-------|--------|-------------|
| Internal (Sept 12) | PPT only | Architecture, sensor justification, fusion math, V2V design, mockups, timeline |
| PPT Submission | Selection committee | Test results (simulation), deployment plan, budget, risk mitigation |
| Grand Finale | Judges + NMDC | Working prototype on RC truck, fog chamber demo, live dashboard, digital twin |

---

## 10. Expected Outcomes Met

1. Improved safety of dumper operations during foggy conditions
2. Reduced collision and accident risk (3-stage safety + fused perception)
3. Improved haulage efficiency (road guidance + continued operation)
4. Enhanced fleet utilization (fog no longer fully halts ops)
5. Continuity of mining operations (thermal works where cameras fail)
6. Reduced production losses (operate at reduced-but-safe speeds vs full stop)
7. Real-time monitoring (command center + digital twin)
8. Scalable approach (modular edge unit, standard protocols, mesh scales)