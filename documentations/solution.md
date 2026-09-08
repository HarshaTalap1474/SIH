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

### Compute Split: ESP32-S3 (Sensor Hub + Safety) + Pi 5 8GB + Coral USB (AI + Fusion)

| Component | Role | Compute |
|-----------|------|---------|
| **ESP32-S3** (Dual-core Xtensa 240MHz) | Sensor aggregation (LiDAR, Radar, GPS, Thermal I2C), V2V mesh (ESP-NOW + LoRa), Safety actuation (buzzer, vibration, relay, LEDs), Pi watchdog, fallback safety | Core 0: sensors + radio; Core 1: safety (100Hz deterministic) |
| **Pi 5 8GB + Coral USB** | YOLOv8n thermal inference, Stereo SGBM, Kalman fusion, Safety logic (TTC/zones), Cabin UI, MQTT/Cloud, V2V app logic | 4 Cortex-A76 @ 2.4GHz + Coral TPU (13 TOPS INT8) |

### Pi 5 Pipeline Load (with Coral)
| Pipeline | Load | Optimization | Expected FPS |
|----------|------|--------------|--------------|
| Thermal YOLOv8n | ~4 GFLOPS | INT8 on Coral | 20-25 |
| Stereo SGBM (640x480) | ~8 GOPS | NEON + ROI | 8-10 |
| Kalman fusion (20 tracks) | Negligible | CPU | 20 |
| Safety logic (TTC/zones) | Negligible | CPU | 20 |
| Cabin UI (pygame) | Low | GPU | 30 |
| MQTT + WebSocket | Low | CPU | 10 |
| **Total** | **~12 GFLOPS sustained** | **Within Pi 5 + Coral** | **5-10 fused** |

### ESP32-S3 Responsibilities
| Core | Tasks | Rate |
|------|-------|------|
| **Core 0** | LiDAR UART parse, Radar UART parse, GPS UART parse, Thermal I2C read, ESP-NOW TX/RX, LoRa mesh routing, SPI/UART bridge to Pi | Event/10Hz |
| **Core 1** | Safety actuation (buzzer, vibration, relay, LEDs), Pi heartbeat watchdog (100ms timeout), Local fallback safety (LiDAR+Radar only), GPIO monitoring | 100Hz deterministic |

---

## 2. System Architecture — Dual Compute Split

### Data Flow
```
[Sensors] → ESP32-S3 (aggregate) → SPI/UART → Pi 5
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
              [Fusion + Safety Logic]    [Cabin UI + MQTT]
                         │
                         ▼
              {track_list, alert_level, commands}
                         │
                         ▼
              SPI/UART → ESP32 Core 1 → Actuators
```

### Decision Split (Critical)
| Decision Type | Where It Runs | Why |
|---------------|---------------|-----|
| **Perception (YOLO, stereo, fusion)** | Pi 5 | Heavy compute, Coral TPU, Python/NumPy |
| **Safety Logic (TTC, zones, alert level)** | **Pi 5** (primary) | Full fused picture, track history |
| **Actuation (buzzer, vibration, relay, LEDs)** | **ESP32 Core 1** only | <10ms latency, watchdog, survives Pi crash |
| **V2V Mesh Routing** | ESP32 Core 0 | Radio stack, real-time, independent of Pi |
| **Cloud/MQTT** | Pi 5 | TLS, JSON, WebSocket, full TCP/IP |

### Sensor Fusion (on Pi 5)
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
        |
        v
   Commands sent to ESP32 for actuation
```

**Fusion details:**
- Kalman filter fuses all streams into single confidence-weighted track list (class, position, velocity, covariance)
- Never trust a single sensor: thermal fails on cold day, LiDAR fails in heavy rain, radar can't classify, camera can't see fog
- Fuse all -> robust system

---

## 3. Cooperative Perception (V2V Mesh) — Runs on ESP32-S3 Core 0

### Dual-Protocol Design
- **ESP-NOW** (short-range, <150m): High-frequency track sharing between nearby dumpers, backup
- **LoRa SX1262** (long-range, 1-2km): Fleet-wide broadcast, relay through intermediate nodes, handles blind-hill corners and long haul roads

### ESP32 V2V Responsibilities
- ESP-NOW peer management + broadcast (Core 0)
- LoRa SX1262 SPI driver + mesh routing (Core 0)
- Message serialization/deserialization
- Forward fused tracks from Pi → radio; forward received tracks → Pi

### Message Format (Pi ↔ ESP32 ↔ Radio)
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

**Result:** Dumper A sees what Dumper B sees 200m ahead — collective situational awareness. ESP32 handles all radio timing; Pi provides fused tracks.

---

## 4. Safety Logic — Split: Pi 5 (Decision) + ESP32 Core 1 (Actuation + Fallback)

### Pi 5: Safety Decision Logic (10 Hz)
```python
# safety_logic.py (runs on Pi 5)
class SafetyLogic:
    def __init__(self):
        self.zones = {
            "warn": {"distance": 50, "ttc": 8},
            "alert": {"distance": 20, "ttc": 4},
            "intervene": {"distance": 10, "ttc": 2}
        }
    
    def evaluate(self, tracks, ego_speed):
        alerts = []
        for trk in tracks:
            rel_pos = np.array([trk["position"]["x"], trk["position"]["y"]])
            rel_vel = np.array([trk["velocity"]["vx"], trk["velocity"]["vy"]])
            
            distance = np.linalg.norm(rel_pos)
            closing_speed = -np.dot(rel_pos, rel_vel) / (distance + 1e-6)
            ttc = distance / max(closing_speed, 0.1)
            
            if distance < self.zones["intervene"]["distance"] or ttc < self.zones["intervene"]["ttc"]:
                level = "intervene"
            elif distance < self.zones["alert"]["distance"] or ttc < self.zones["alert"]["ttc"]:
                level = "alert"
            elif distance < self.zones["warn"]["distance"] or ttc < self.zones["warn"]["ttc"]:
                level = "warn"
            else:
                continue
            
            alerts.append({
                "track_id": trk["track_id"],
                "level": level,
                "distance": distance,
                "ttc": ttc,
                "position": trk["position"],
                "class": trk["class"]
            })
        
        return alerts
```

### Pi → ESP32 Command (Sent at 10 Hz via SPI/UART)
```json
{
  "alert_level": "alert",           // "none" | "warn" | "alert" | "intervene"
  "target_tracks": [...],           // For cabin display
  "brake_request": false,           // CAN/relay signal
  "display_mode": "thermal_fused",
  "timestamp": 1725700000.123
}
```

### ESP32 Core 1: Actuation + Watchdog (100 Hz Deterministic)
```c
// safety_task.c (FreeRTOS task on ESP32 Core 1)
void safety_task(void *pv) {
    PiCommand_t pi_cmd = { .alert_level = NONE };
    uint32_t last_pi_heartbeat = 0;
    
    while (1) {
        // 1. Check Pi heartbeat (watchdog)
        if (xTaskGetTickCount() - last_pi_heartbeat > pdMS_TO_TICKS(100)) {
            // FALLBACK: Run minimal safety from raw LiDAR/radar (no fusion)
            run_local_safety_fallback();
        } else {
            // NORMAL: Execute Pi's decision
            execute_pi_command(pi_cmd);
        }
        vTaskDelay(pdMS_TO_TICKS(10));  // 100Hz
    }
}

void execute_pi_command(PiCommand_t *cmd) {
    // Drive actuators per alert level
    switch (cmd->alert_level) {
        case WARN:
            buzzer_beep(500, 1000);  led_set(WARN_LED, 1); break;
        case ALERT:
            buzzer_beep(200, 300);   led_set(ALERT_LED, 1); vibration_on(); break;
        case INTERVENE:
            buzzer_on();             led_set(INTERVENE_LED, 1); 
            vibration_on();          relay_brake_on(); break;
        default:
            all_off();
    }
}
```

### Why This Split?
| Scenario | What Happens |
|----------|--------------|
| **Normal** | Pi fuses → decides alert level → ESP32 drives actuators |
| **Pi crashes/freezes** | ESP32 watchdog triggers (100ms) → runs local safety from raw LiDAR/radar → keeps buzzer/relay working |
| **High CPU on Pi** | Safety actuation still runs on ESP32 at 100Hz, no jitter |
| **V2V message** | ESP32 Core 0 handles instantly, doesn't wait for Pi |

> **Golden Rule:** Linux (Pi) = "What should we do?" (planning, perception, fusion)  
> **RTOS/MCU (ESP32) = "Do it now, reliably" (actuation, watchdog, radio)

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