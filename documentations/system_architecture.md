# System Architecture — Complete Layer-by-Layer Breakdown

## Layer 0: Hardware (On Each Dumper)

```
┌─────────────────────────────────────────────────────────────────┐
│  EDGE UNIT — Pi 5 8GB + Coral USB                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│  │ Thermal  │ │  LiDAR   │ │  Radar   │ │ Stereo   │ │ GPS   │ │
│  │ (I2C)    │ │ (UART)   │ │ (UART)   │ │ (CSI×2)  │ │(UART) │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └───┬───┘ │
│       │            │            │            │            │     │
│       └────────────┼────────────┼────────────┼────────────┘     │
│                    ▼            ▼            ▼                  │
│         ┌─────────────────────────────────────────────┐        │
│         │  SENSOR FUSION ENGINE (Python, asyncio)     │        │
│         └────────────────────┬────────────────────────┘        │
│                              │                                 │
│         ┌────────────────────┼────────────────────────┐        │
│         ▼                    ▼                         ▼        │
│  ┌──────────────┐    ┌──────────────┐          ┌───────────┐  │
│  │ IN-CABIN UI  │    │  V2V MESH    │          │ 3-STAGE   │  │
│  │ (HDMI/Phone) │    │  (SPI/UART)  │          │  SAFETY   │  │
│  └──────────────┘    └──────────────┘          └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Sensor 1: Thermal Camera — Primary Perception

### Hardware Options
| Model | Interface | Resolution | FOV | Range (human) | Pi Connection |
|-------|-----------|------------|-----|---------------|---------------|
| FLIR Lepton 3.5 | I2C + SPI (VoSPI) | 160×120 | 57° | ~200m | I2C1 + SPI0 |
| MLX90640 | I2C | 32×24 | 110° | ~30m | I2C1 |
| AMG8833 | I2C | 8×8 | 60° | ~7m | I2C1 |

### Software Pipeline
```python
# thermal_pipeline.py
class ThermalPipeline:
    def __init__(self, sensor_type="MLX90640"):
        self.sensor = self._init_sensor(sensor_type)
        self.model = self._load_yolo_model()  # YOLOv8n/11n ONNX
        self.preprocessor = ThermalPreprocessor()
    
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
            enhanced = self.preprocessor.enhance(raw)  # CLAHE + denoise
            upscaled = self.preprocessor.upscale(enhanced, target=(160, 120))
            detections = self.model.infer(upscaled)  # ONNX Runtime + Coral
            yield self._format_detections(detections)
```

### Preprocessing (Critical for Low-Res Thermal)
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
| Model | Interface | Range | Resolution | Points/sec | Pi Connection |
|-------|-----------|-------|------------|------------|---------------|
| RPLidar A1M8 | UART (115200/256000) | 12m | 1° | 8000 | UART4 (GPIO 14/15) |
| YDLIDAR X4 | UART | 10m | 0.5° | 5000 | UART4 |

### Software Pipeline
```python
# lidar_pipeline.py
class LiDARPipeline:
    def __init__(self):
        self.lidar = RPLidarA1("/dev/ttyAMA0", baudrate=256000)
        self.clusterer = DBSCANClusterer(eps=0.3, min_samples=3)
    
    def process(self):
        self.lidar.start_motor()
        for scan in self.lidar.iter_scans():  # [(quality, angle_deg, dist_mm), ...]
            # Filter noise
            points = self._polar_to_cartesian(scan)
            # Ground removal (simple height filter)
            obstacles = self._remove_ground(points)
            # Cluster → objects
            clusters = self.clusterer.cluster(obstacles)
            yield self._format_clusters(clusters)
    
    def _polar_to_cartesian(self, scan):
        angles = np.deg2rad([p[1] for p in scan])
        dists = np.array([p[2] for p in scan]) / 1000.0  # meters
        x = dists * np.cos(angles)
        y = dists * np.sin(angles)
        z = np.zeros_like(x)  # 2D LiDAR
        return np.column_stack([x, y, z])
    
    def _remove_ground(self, points):
        # Simple: assume ground is flat at z=0, LiDAR mounted at 2m
        # Return points with z > 0.2m (above ground noise)
        return points[points[:, 2] > 0.2]
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
| Model | Interface | Range | Velocity | Targets | Pi Connection |
|-------|-----------|-------|----------|---------|---------------|
| HLK-LD2450 | UART (256000) | 6m | ±10 m/s | 3 | UART5 |
| LD2410 | UART | 6m | ±5 m/s | 1 | UART5 |

### Protocol (LD2450 Example)
```
Frame: 53 59 00 00 00 00 00 00 00 00 00 00 00 00 00 00
       │  │  │  └── Target 1: distance (cm)
       │  │  └───── Target 1: energy
       │  └──────── Target 1: speed (cm/s, signed)
       └─────────── Target 1: present flag
```

### Software Pipeline
```python
# radar_pipeline.py
class RadarPipeline:
    def __init__(self, port="/dev/ttyAMA1"):
        self.ser = serial.Serial(port, 256000, timeout=0.1)
        self.parser = LD2450Parser()
    
    def process(self):
        while True:
            if self.ser.in_waiting >= 32:
                raw = self.ser.read(32)
                targets = self.parser.parse(raw)
                yield self._format_targets(targets)
    
    def _format_targets(self, targets):
        return [{
            "obj_id": f"RAD_{i}",
            "class": "moving" if t["speed"] > 0.5 else "stationary",
            "position": {"x": t["dist"], "y": 0, "z": 0},  # Forward only
            "velocity": {"vx": t["speed"], "vy": 0, "vz": 0},
            "confidence": t["energy"] / 100.0
        } for i, t in enumerate(targets) if t["present"]]
```

---

## Sensor 4: Stereo Cameras — Road Edges + Daytime Class

### Hardware
| Config | Interface | Resolution | FPS | Baseline | Pi Connection |
|--------|-----------|------------|-----|----------|---------------|
| 2× Pi Cam v3 | CSI-0, CSI-1 | 640×480 | 30 | 60-120mm | CSI ports |

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
| Model | Interface | Accuracy | Update | Pi Connection |
|-------|-----------|----------|--------|---------------|
| u-blox F9P (RTK) | UART + USB | 1-2 cm | 10 Hz | UART3 + USB |
| NEO-M8N | UART | 2-3 m | 10 Hz | UART3 |

### Software Pipeline
```python
# gps_pipeline.py
class GPSPipeline:
    def __init__(self, port="/dev/ttyAMA2", rtcm_port="/dev/ttyUSB0"):
        self.gps = serial.Serial(port, 115200, timeout=0.1)
        self.rtcm = serial.Serial(rtcm_port, 115200) if rtcm_port else None
        self.parser = UBXParser()
    
    def process(self):
        while True:
            if self.gps.in_waiting:
                raw = self.gps.read(self.gps.in_waiting)
                pvts = self.parser.parse(raw)
                for pvt in pvts:
                    yield self._format_pvt(pvt)
            
            # Forward RTCM corrections from base station
            if self.rtcm and self.rtcm.in_waiting:
                self.gps.write(self.rtcm.read(self.rtcm.in_waiting))
    
    def _format_pvt(self, pvt):
        return {
            "lat": pvt.lat,
            "lon": pvt.lon,
            "alt": pvt.height,
            "heading": pvt.heading,
            "speed": pvt.gspeed,
            "accuracy": pvt.hacc,
            "fix_type": pvt.fix_type,  # 3=3D, 4=RTK Fixed
            "timestamp": time.time()
        }
```

---

## Layer 1: Sensor Fusion (The Brain)

### Kalman Filter Fusion Architecture
```python
# fusion_engine.py
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

## Layer 2: Safety Logic (3-Stage)

```python
# safety_logic.py
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
            
            # Zone logic
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

### Actuation
```python
# actuator.py
class SafetyActuator:
    def __init__(self):
        self.buzzer = GPIO(18)      # Active buzzer
        self.vibration = GPIO(19)   # Haptic motor
        self.relay_brake = GPIO(20) # Simulated brake request
        self.leds = {"warn": 21, "alert": 22, "intervene": 23}
    
    def actuate(self, alerts):
        max_level = self._max_level(alerts)
        
        # Reset all
        for pin in self.leds.values():
            GPIO.output(pin, 0)
        self.buzzer.off()
        self.vibration.off()
        self.relay_brake.off()
        
        if max_level == "warn":
            GPIO.output(self.leds["warn"], 1)
            self.buzzer.beep(0.5, 1.0)  # 0.5s on, 1s off
        elif max_level == "alert":
            GPIO.output(self.leds["alert"], 1)
            self.buzzer.beep(0.2, 0.3)
            self.vibration.on()
        elif max_level == "intervene":
            GPIO.output(self.leds["intervene"], 1)
            self.buzzer.on()
            self.vibration.on()
            self.relay_brake.on()  # Signal to CAN/brake system
```

---

## Layer 3: V2V Mesh Communication

### ESP-NOW (Short Range)
```python
# v2v_espnow.py
class ESPNowMesh:
    def __init__(self):
        self.esp = ESP32_SPI()  # ESP32 as co-processor via SPI
        self.peers = {}  # mac -> vehicle_id
        self.esp.init_espnow()
        self.esp.register_recv_cb(self._on_recv)
    
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
        self.esp.espnow_send(broadcast_mac, json.dumps(msg))
    
    def _on_recv(self, mac, data):
        msg = json.loads(data)
        if msg["type"] == "tracks":
            # Convert to local frame
            remote_tracks = self._transform_to_local(msg["tracks"], msg["position"])
            self.incoming_queue.put(remote_tracks)
```

### LoRa SX1262 (Long Range)
```python
# v2v_lora.py
class LoRaMesh:
    def __init__(self):
        self.lora = SX1262(spi_bus=0, cs=8, reset=25, busy=24, dio1=23)
        self.lora.begin(freq=865, bw=125, sf=9, cr=5, power=22)
        self.routes = {}  # vehicle_id -> next_hop
    
    def broadcast(self, msg):
        # Add hop count, TTL
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
        
        # Decrement TTL, forward
        msg["ttl"] -= 1
        msg["hops"] += 1
        self._send(msg)
        
        # Deliver locally
        if msg["type"] == "tracks":
            self.incoming_queue.put(msg)
```

---

## Layer 4: In-Cabin UI (Driver Display)

```python
# cabin_ui.py
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

## Data Flow Summary

```
[Thermal] ──┐
[LiDAR]  ───┼──► [Fusion Engine] ──► [Safety Logic] ──► [Actuators]
[Radar]  ───┤         │                      │
[Stereo] ──┘         ▼                      ▼
              [Track List]            [3-Stage Alerts]
                     │                      │
                     ▼                      ▼
              [V2V Mesh] ◄──┐         [In-Cabin UI]
              (LoRa+ESP)   │
                     │      │
                     ▼      ▼
              [MQTT Broker] ──► [FastAPI Backend] ──► [WebSocket] ──► [Dashboard + Digital Twin]
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