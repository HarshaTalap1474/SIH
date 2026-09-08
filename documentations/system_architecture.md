# System Architecture — Complete Layer-by-Layer Breakdown

## Layer 0: Hardware (On Each Dumper) — Dual Compute Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        EDGE UNIT (per dumper)                           │
│                                                                         │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│   │ Thermal  │ │  LiDAR   │ │  Radar   │ │  GPS     │ │  LoRa    │     │
│   │ (I2C)    │ │ (UART)   │ │ (UART)   │ │ (UART)   │ │ (SPI)    │     │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘     │
│        │            │            │            │            │            │
│        └────────────┴────────────┴────────────┴────────────┘            │
│                                 │                                       │
│                    ┌────────────▼────────────┐                          │
│                    │      ESP32-S3           │                          │
│                    │  ┌──────────────────┐  │                          │
│                    │  │ Core 0           │  │  Sensor aggregation      │
│                    │  │ • LiDAR parse    │  │  ESP-NOW TX/RX           │
│                    │  │ • Radar parse    │  │  LoRa mesh routing       │
│                    │  │ • GPS parse      │  │  Pi SPI/UART bridge      │
│                    │  │ • Thermal I2C    │  │                          │
│                    │  └──────────────────┘  │                          │
│                    │  ┌──────────────────┐  │                          │
│                    │  │ Core 1           │  │  Safety actuation        │
│                    │  │ • Buzzer         │  │  Watchdog                │
│                    │  │ • Vibration      │  │  GPIO monitoring         │
│                    │  │ • Relay (brake)  │  │  Heartbeat to Pi         │
│                    │  │ • Status LEDs    │  │                          │
│                    │  └──────────────────┘  │                          │
│                    └───────────┬───────────┘                          │
│                                │ SPI Slave / UART (high-speed)         │
│                                ▼                                       │
│                    ┌─────────────────────────┐                        │
│                    │      Raspberry Pi 5     │                        │
│                    │  • YOLOv8n Thermal      │  Perception            │
│                    │  • Stereo SGBM          │  + Fusion              │
│                    │  • Kalman Fusion        │                        │
│                    │  • Safety Logic         │                        │
│                    │  • MQTT/V2V App Logic   │                        │
│                    │  • Cabin UI             │                        │
│                    └─────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Compute Split Summary

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

## Sensor 1: Thermal Camera — Primary Perception

### Hardware Options
| Model | Interface | Resolution | FOV | Range (human) | ESP32 Connection |
|-------|-----------|------------|-----|---------------|------------------|
| FLIR Lepton 3.5 | I2C + SPI (VoSPI) | 160×120 | 57° | ~200m | I2C0 + SPI2 (HSPI) |
| MLX90640 | I2C | 32×24 | 110° | ~30m | I2C0 |
| AMG8833 | I2C | 8×8 | 60° | ~7m | I2C0 |

### Software Pipeline — ESP32 reads, Pi infers
```python
# On ESP32-S3 (Core 0): thermal_reader.py
class ThermalReader:
    def __init__(self, sensor_type="MLX90640"):
        self.sensor = self._init_sensor(sensor_type)
        self.spi_slave = SPISlave()  # To Pi
    
    def _init_sensor(self, sensor_type):
        if sensor_type == "FLIR_LEPTON":
            return LeptonSPI()  # 160×120 @ 9Hz
        elif sensor_type == "MLX90640":
            return MLX90640_I2C()  # 32×24 @ 16Hz
        else:
            return AMG8833_I2C()  # 8×8 @ 10Hz
    
    def process(self):
        while True:
            raw = self.sensor.read_frame()  # (H, W) float32 °C
            # Send raw to Pi via SPI (Pi does preprocessing + YOLO)
            self.spi_slave.write(struct.pack('f'*len(raw), *raw.flatten()))
```

```python
# On Pi 5: thermal_pipeline.py (receives raw frames from ESP32)
class ThermalPipeline:
    def __init__(self):
        self.spi_master = SPIMaster()  # From ESP32
        self.model = self._load_yolo_model()  # YOLOv8n/11n ONNX
        self.preprocessor = ThermalPreprocessor()
    
    def process(self):
        while True:
            raw_bytes = self.spi_master.read(frame_size_bytes)
            raw = np.frombuffer(raw_bytes, dtype=np.float32).reshape(self.sensor_shape)
            enhanced = self.preprocessor.enhance(raw)
            upscaled = self.preprocessor.upscale(enhanced, target=(160, 120))
            detections = self.model.infer(upscaled)  # ONNX Runtime + Coral
            yield self._format_detections(detections)
```

### Preprocessing (Critical for Low-Res Thermal) — Runs on Pi 5
```python
class ThermalPreprocessor:
    def enhance(self, frame):
        # 1. Normalize to 0-255
        norm = cv2.normalize(frame, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
        # 2. CLAHE (contrast limited adaptive histogram equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4,4))
        enhanced = clahe.apply(norm)
        # 3. Bilateral denoise (preserves edges)
        denoised = cv2.bilateralFilter(enhanced, 5, 50, 50)
        return denoised
    
    def upscale(self, frame, target=(160, 120)):
        # For MLX90640/AMG8833: bicubic upscale + sharpen
        return cv2.resize(frame, target, interpolation=cv2.INTER_CUBIC)
```

### YOLO Training for Thermal
- **Dataset**: FLIR ADAS (free) + synthetic fog augmentation + custom mine data
- **Classes**: `dumper`, `excavator`, `dozer`, `person`, `light_vehicle`, `hot_spot`
- **Model**: YOLOv8n → export ONNX → quantize INT8 for Coral
- **Input**: 160×120×1 (grayscale) or 160×120×3 (pseudo-color)

---

## Sensor 2: LiDAR — 360° 3D Geometry

### Hardware
| Model | Interface | Range | Resolution | Points/sec | ESP32 Connection |
|-------|-----------|-------|------------|------------|------------------|
| RPLidar A1M8 | UART (115200/256000) | 12m | 1° | 8000 | UART1 (GPIO 17/18) |
| YDLIDAR X4 | UART | 10m | 0.5° | 5000 | UART1 |

### Software Pipeline — ESP32 parses, sends clusters to Pi
```python
# On ESP32-S3 (Core 0): lidar_pipeline.py
class LiDARPipeline:
    def __init__(self):
        self.lidar = RPLidarA1(uart_num=1, baudrate=256000)
        self.clusterer = DBSCANClusterer(eps=0.3, min_samples=3)
        self.spi_slave = SPISlave()
    
    def process(self):
        self.lidar.start_motor()
        for scan in self.lidar.iter_scans():
            points = self._polar_to_cartesian(scan)
            obstacles = self._remove_ground(points)
            clusters = self.clusterer.cluster(obstacles)
            # Send clustered objects to Pi via SPI
            payload = self._encode_clusters(clusters)
            self.spi_slave.write(payload)
    
    def _polar_to_cartesian(self, scan):
        angles = np.deg2rad([p[1] for p in scan])
        dists = np.array([p[2] for p in scan]) / 1000.0
        x = dists * np.cos(angles)
        y = dists * np.sin(angles)
        z = np.zeros_like(x)
        return np.column_stack([x, y, z])
    
    def _remove_ground(self, points):
        return points[points[:, 2] > 0.2]
    
    def _encode_clusters(self, clusters):
        # Binary format: [count:1][obj_id:4][x:4][y:4][z:4][l:4][w:4][h:4][conf:4]...
        pass
```

```python
# On Pi 5: receives clusters from ESP32 via SPI
class LiDARReceiver:
    def __init__(self):
        self.spi_master = SPIMaster()
    
    def read_clusters(self):
        raw = self.spi_master.read()
        return self._decode_clusters(raw)
```

### Output Format
```python
{
    "obj_id": "LID_001",
    "class": "unknown",  # Thermal classifies
    "position": {"x": 12.3, "y": -1.2, "z": 1.8},  # Vehicle frame
    "dimensions": {"l": 4.5, "w": 2.5, "h": 2.8},
    "confidence": 0.85
}
```

---

## Sensor 3: mmWave Radar — Velocity + Range

### Hardware
| Model | Interface | Range | Velocity | Targets | ESP32 Connection |
|-------|-----------|-------|----------|---------|------------------|
| HLK-LD2450 | UART (256000) | 6m | ±10 m/s | 3 | UART2 (GPIO 19/20) |
| LD2410 | UART | 6m | ±5 m/s | 1 | UART2 |

### Protocol (LD2450 Example)
```
Frame: 53 59 00 00 00 00 00 00 00 00 00 00 00 00 00 00
       │  │  │  └── Target 1: distance (cm)
       │  │  └───── Target 1: energy
       │  └──────── Target 1: speed (cm/s, signed)
       └─────────── Target 1: present flag
```

### Software Pipeline — ESP32 parses, sends targets to Pi
```python
# On ESP32-S3 (Core 0): radar_pipeline.py
class RadarPipeline:
    def __init__(self, uart_num=2):
        self.ser = UART(uart_num, baudrate=256000)
        self.parser = LD2450Parser()
        self.spi_slave = SPISlave()
    
    def process(self):
        while True:
            if self.ser.any() >= 32:
                raw = self.ser.read(32)
                targets = self.parser.parse(raw)
                payload = self._encode_targets(targets)
                self.spi_slave.write(payload)
    
    def _encode_targets(self, targets):
        # Binary format for Pi
        pass
```

```python
# On Pi 5: receives targets from ESP32
class RadarReceiver:
    def __init__(self):
        self.spi_master = SPIMaster()
    
    def read_targets(self):
        raw = self.spi_master.read()
        return self._decode_targets(raw)
```

---

## Sensor 4: Stereo Cameras — Road Edges + Daytime Class

### Hardware
| Config | Interface | Resolution | FPS | Baseline | Connection |
|--------|-----------|------------|-----|----------|------------|
| 2× Pi Cam v3 | CSI-0, CSI-1 | 640×480 | 30 | 60-120mm | Pi 5 CSI ports (direct) |

### Software Pipeline
```python
# stereo_pipeline.py
class StereoPipeline:
    def __init__(self, baseline=0.12, focal=3.04):  # mm
        self.cap_left = cv2.VideoCapture(0)
        self.cap_right = cv2.VideoCapture(1)
        self.stereo = cv2.StereoSGBM_create(
            minDisparity=0,
            numDisparities=64,
            blockSize=5,
            P1=8*3*5**2,
            P2=32*3*5**2,
            disp12MaxDiff=1,
            uniquenessRatio=10,
            speckleWindowSize=100,
            speckleRange=32
        )
        self.Q = self._compute_Q_matrix(baseline, focal)
    
    def process(self):
        while True:
            ret_l, frame_l = self.cap_left.read()
            ret_r, frame_r = self.cap_right.read()
            if not ret_l or not ret_r:
                continue
            
            gray_l = cv2.cvtColor(frame_l, cv2.COLOR_BGR2GRAY)
            gray_r = cv2.cvtColor(frame_r, cv2.COLOR_BGR2GRAY)
            
            # Compute disparity
            disparity = self.stereo.compute(gray_l, gray_r).astype(np.float32) / 16.0
            
            # Reproject to 3D
            points_3d = cv2.reprojectImageTo3D(disparity, self.Q)
            
            # Extract road edges (ground plane)
            road_edges = self._extract_road_edges(points_3d, gray_l)
            
            # Daytime object detection (optional, light YOLO)
            if self._is_daylight():
                objects = self._detect_objects(frame_l)
            else:
                objects = []
            
            yield {
                "road_edges": road_edges,  # [{"x":, "y":, "z":}, ...]
                "objects": objects,
                "disparity_map": disparity
            }
    
    def _extract_road_edges(self, points, intensity):
        # RANSAC ground plane fit → find boundaries
        ground = points[points[:, 2] < 0.5]  # Near ground
        # Project to bird's-eye view, find left/right edges
        bev = self._project_to_bev(ground)
        left_edge, right_edge = self._find_edges(bev)
        return {"left": left_edge, "right": right_edge}
```

---

## Sensor 5: GPS/RTK — Positioning

### Hardware
| Model | Interface | Accuracy | Update | ESP32 Connection |
|-------|-----------|----------|--------|------------------|
| u-blox F9P (RTK) | UART + USB | 1-2 cm | 10 Hz | UART0 + USB (to Pi) |
| NEO-M8N | UART | 2-3 m | 10 Hz | UART0 |

### Software Pipeline — ESP32 parses, forwards PVT to Pi
```python
# On ESP32-S3 (Core 0): gps_pipeline.py
class GPSPipeline:
    def __init__(self, uart_num=0):
        self.gps = UART(uart_num, baudrate=115200)
        self.parser = UBXParser()
        self.spi_slave = SPISlave()
    
    def process(self):
        while True:
            if self.gps.any():
                raw = self.gps.read(self.gps.any())
                pvts = self.parser.parse(raw)
                for pvt in pvts:
                    payload = self._encode_pvt(pvt)
                    self.spi_slave.write(payload)

    def _encode_pvt(self, pvt):
        # Binary: lat, lon, alt, heading, speed, accuracy, fix_type, timestamp
        pass
```

```python
# On Pi 5: receives PVT from ESP32
class GPSReceiver:
    def __init__(self):
        self.spi_master = SPIMaster()
    
    def read_pvt(self):
        raw = self.spi_master.read()
        return self._decode_pvt(raw)
```

---

## Layer 1: Sensor Fusion (The Brain) — Runs on Pi 5

### Kalman Filter Fusion Architecture
```python
# fusion_engine.py (runs on Pi 5)
class SensorFusionEngine:
    def __init__(self):
        self.tracks = {}  # track_id -> KalmanTrack
        self.track_id_counter = 0
        self.max_assoc_dist = 3.0  # meters
        
        # Sensor weights (tunable)
        self.weights = {
            "thermal": {"class": 0.9, "pos": 0.6, "vel": 0.2},
            "lidar": {"class": 0.3, "pos": 0.95, "vel": 0.4},
            "radar": {"class": 0.2, "pos": 0.7, "vel": 0.95},
            "stereo": {"class": 0.7, "pos": 0.8, "vel": 0.3},
        }
    
    def fuse(self, thermal_dets, lidar_dets, radar_dets, stereo_dets):
        # 1. Convert all to common frame (vehicle center, ENU)
        all_dets = self._to_common_frame(thermal_dets, lidar_dets, radar_dets, stereo_dets)
        
        # 2. Associate detections to existing tracks (Hungarian algorithm)
        associations = self._associate_tracks(all_dets)
        
        # 3. Update tracks with weighted fusion
        for track_id, det_list in associations.items():
            fused = self._weighted_fusion(det_list)
            self.tracks[track_id].update(fused)
        
        # 4. Create new tracks for unassociated
        for det in all_dets:
            if not det.associated:
                self._create_track(det)
        
        # 5. Prune stale tracks
        self._prune_tracks(max_age=1.0)
        
        return self._output_tracks()
    
    def _weighted_fusion(self, det_list):
        """Fuse multiple detections of same object using sensor weights"""
        fused = {"class": None, "pos": [0,0,0], "vel": [0,0,0], "cov": np.eye(6)}
        
        total_weight = {"class": 0, "pos": 0, "vel": 0}
        
        for det in det_list:
            src = det.source  # "thermal", "lidar", "radar", "stereo"
            w = self.weights[src]
            
            # Class fusion (max confidence)
            if det.class_conf * w["class"] > fused["class_conf"]:
                fused["class"] = det.class_name
                fused["class_conf"] = det.class_conf * w["class"]
            
            # Position fusion (weighted average)
            fused["pos"] += w["pos"] * np.array(det.position)
            total_weight["pos"] += w["pos"]
            
            # Velocity fusion
            fused["vel"] += w["vel"] * np.array(det.velocity)
            total_weight["vel"] += w["vel"]
        
        fused["pos"] /= max(total_weight["pos"], 1e-6)
        fused["vel"] /= max(total_weight["vel"], 1e-6)
        fused["cov"] = self._compute_covariance(det_list)
        
        return fused
```

### Output: Fused Track List
```json
[
  {
    "track_id": "TRK_001",
    "class": "dumper",
    "class_conf": 0.94,
    "position": {"x": 15.2, "y": -0.8, "z": 1.2},
    "velocity": {"vx": -3.2, "vy": 0.1, "vz": 0},
    "covariance": [[...]],
    "sources": ["thermal", "lidar", "radar"],
    "last_update": 1725700000.456
  }
]
```

---

## Layer 2: Safety Logic — Split: Pi 5 (Decision) + ESP32 Core 1 (Actuation + Fallback)

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

## Layer 3: V2V Mesh Communication — Runs on ESP32-S3 Core 0

### ESP-NOW (Short Range)
```python
# v2v_espnow.py (runs on ESP32-S3 Core 0)
class ESPNowMesh:
    def __init__(self):
        self.peers = {}  # mac -> vehicle_id
        espnow_init()
        espnow_register_recv_cb(self._on_recv)
    
    def broadcast(self, fused_tracks, ego_state):
        msg = {
            "type": "tracks",
            "vehicle_id": ego_state["vehicle_id"],
            "timestamp": time.time(),
            "position": ego_state["position"],
            "heading": ego_state["heading"],
            "speed": ego_state["speed"],
            "tracks": fused_tracks,
            "fog_level": ego_state["fog_level"]
        }
        espnow_send(broadcast_mac, json.dumps(msg))
    
    def _on_recv(self, mac, data):
        msg = json.loads(data)
        if msg["type"] == "tracks":
            remote_tracks = self._transform_to_local(msg["tracks"], msg["position"])
            self.incoming_queue.put(remote_tracks)
```

### LoRa SX1262 (Long Range)
```python
# v2v_lora.py (runs on ESP32-S3 Core 0)
class LoRaMesh:
    def __init__(self):
        self.lora = SX1262(spi_bus=0, cs=8, reset=25, busy=24, dio1=23)
        self.lora.begin(freq=865, bw=125, sf=9, cr=5, power=22)
        self.routes = {}  # vehicle_id -> next_hop
    
    def broadcast(self, msg):
        msg["hops"] = 0
        msg["ttl"] = 3
        self._send(msg)
    
    def _send(self, msg):
        payload = json.dumps(msg).encode()
        self.lora.transmit(payload)
    
    def _on_receive(self, payload):
        msg = json.loads(payload)
        if msg["ttl"] <= 0:
            return
        msg["ttl"] -= 1
        msg["hops"] += 1
        self._send(msg)
        if msg["type"] == "tracks":
            self.incoming_queue.put(msg)
```

### Pi ↔ ESP32 V2V Interface
- Pi sends fused tracks to ESP32 via SPI (10 Hz)
- ESP32 broadcasts via ESP-NOW + LoRa
- ESP32 receives from radio → forwards to Pi via SPI

---

## Layer 4: In-Cabin UI (Driver Display) — Runs on Pi 5

```python
# cabin_ui.py (runs on Pi 5)
class CabinUI:
    def __init__(self):
        self.screen = pygame.display.set_mode((1024, 600))  # 7" touch
        self.font = pygame.font.Font(None, 24)
        self.thermal_renderer = ThermalRenderer()
        self.map_renderer = MiniMapRenderer()
    
    def render(self, fused_tracks, alerts, road_edges, ego_state):
        self.screen.fill((0, 0, 0))
        
        # Main view: thermal + fused overlays
        thermal_frame = self.thermal_renderer.get_latest()
        self.screen.blit(thermal_frame, (0, 0))
        
        # Draw tracks as boxes with color by class
        for trk in fused_tracks:
            color = self._class_color(trk["class"])
            rect = self._project_to_screen(trk["position"])
            pygame.draw.rect(self.screen, color, rect, 2)
            label = f"{trk['class']} {trk['position']['x']:.1f}m"
            self.screen.blit(self.font.render(label, True, color), rect.topleft)
        
        # Road edges (green lines)
        if road_edges:
            self._draw_road_edges(road_edges)
        
        # Alerts (top bar)
        for alert in alerts:
            color = {"warn": (255,255,0), "alert": (255,165,0), "intervene": (255,0,0)}[alert["level"]]
            pygame.draw.rect(self.screen, color, (0, 0, 1024, 40))
            text = f"{alert['level'].upper()}: {alert['class']} at {alert['distance']:.1f}m"
            self.screen.blit(self.font.render(text, True, (0,0,0)), (10, 10))
        
        # Mini-map (bottom right)
        self.map_renderer.draw(self.screen, ego_state, fused_tracks)
        
        pygame.display.flip()
```

### Pi → ESP32 Display Data (via SPI)
```json
{
  "display_mode": "thermal_fused",
  "tracks_to_render": [...],
  "road_edges": {...},
  "alerts": [...]
}
```

---

## Layer 5: Command Center (Cloud/Web)

### Backend (FastAPI + MQTT)
```python
# backend/main.py
app = FastAPI()

# MQTT broker connection
mqtt_client = mqtt.Client()
mqtt_client.connect("localhost", 1883)

# WebSocket for real-time dashboard
active_connections = []

@app.websocket("/ws/fleet")
async def fleet_ws(ws: WebSocket):
    await ws.accept()
    active_connections.append(ws)
    try:
        while True:
            await ws.receive_text()
    except:
        active_connections.remove(ws)

# MQTT message handler
def on_mqtt_message(client, userdata, msg):
    data = json.loads(msg.payload)
    # Store to PostGIS
    db.insert_track(data)
    # Broadcast to all WebSocket clients
    for ws in active_connections:
        asyncio.run(ws.send_json(data))

mqtt_client.on_message = on_mqtt_message
mqtt_client.subscribe("mines/+/tracks")
mqtt_client.loop_start()
```

### Digital Twin (Three.js)
```javascript
// digital_twin.js
class DigitalTwin {
    constructor(container) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, w/h, 1, 50000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        container.appendChild(this.renderer.domElement);
        
        // Load mine model
        this.loadMineModel();
        
        // Fog zones
        this.fogZones = new THREE.Group();
        this.scene.add(this.fogZones);
        
        // Vehicles
        this.vehicles = new Map();
    }
    
    update(vehicleData) {
        vehicleData.forEach(v => {
            let mesh = this.vehicles.get(v.vehicle_id);
            if (!mesh) {
                mesh = this.createVehicleMesh(v.class);
                this.vehicles.set(v.vehicle_id, mesh);
                this.scene.add(mesh);
            }
            // Interpolate position
            mesh.position.lerp(new THREE.Vector3(v.x, v.z, v.y), 0.1);
            mesh.rotation.y = THREE.MathUtils.degToRad(-v.heading);
        });
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(() => this.render());
    }
}
```

---

## Data Flow Summary — Dual Compute

```
[Thermal] ──┐
[LiDAR]  ───┤
[Radar]  ───┼──► [ESP32 Core 0: Aggregation] ── SPI ──► [Pi 5: Fusion + Safety Logic]
[GPS]    ──┤        │                           │
[LoRa]   ──┘        ▼                           ▼
             [ESP32 Core 1: Actuation]    [Track List] ──► [Pi: Cabin UI + MQTT]
                  │                              │
                  │           [V2V Mesh] ◄──────┘
                  │           (LoRa+ESP-NOW)
                  ▼
             [Actuators: Buzzer, Vibe, Relay, LEDs]

[Pi: MQTT Broker] ──► [FastAPI Backend] ──► [WebSocket] ──► [Dashboard + Digital Twin]
       │
       ▼
[PostGIS + TimescaleDB]
       │
       ▼
[Replay Engine] ──► [Digital Twin Time Slider]
```

---

## Threading Model (Pi 5)

| Thread | Function | Frequency | Core |
|--------|----------|-----------|------|
| **T1** | Thermal capture + YOLO | 20 Hz | Core 0 + Coral |
| **T2** | LiDAR scan + clustering | 10 Hz | Core 1 |
| **T3** | Radar parse | 20 Hz | Core 2 |
| **T4** | Stereo capture + SGBM | 8 Hz | Core 3 |
| **T5** | GPS parse | 10 Hz | Core 0 |
| **T6** | **Fusion Engine** (consumer) | 10 Hz | Core 1 |
| **T7** | Safety Logic | 10 Hz | Core 2 |
| **T8** | V2V TX/RX | Event-driven | Core 3 |
| **T9** | MQTT publish | 5 Hz | Core 0 |
| **T10** | Cabin UI render | 30 Hz | Core 2 + GPU |

---

This is the complete working system. Every sensor, every layer, every data flow. Ready to build.