"""
Standalone Real-Time WebSocket & HTTP Inference Server
Streams ADAS Collision Avoidance & Path Guidance Telemetry between TinyML Model & UI.
"""

import asyncio
import json
import os
import sys
import time
import websockets
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading

from tinyml_model import TinyMLCollisionModel

# ANSI Colors for clean terminal visualization
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"

PORT = 8765
WEIGHTS_PATH = os.path.join(os.path.dirname(__file__), "tinyml_weights.npz")


class ADASInferenceServer:
    def __init__(self, weights_path: str = WEIGHTS_PATH):
        print("=" * 75)
        print(f"  {CYAN}{BOLD}MINING DUMPER TRUCK — REAL-TIME TINYML ADAS INFERENCE SERVER{RESET}")
        print("=" * 75)
        print(f"  • Loading model weights from: {weights_path}")
        
        self.model = TinyMLCollisionModel()
        if os.path.exists(weights_path):
            self.model.load(weights_path)
            file_kb = os.path.getsize(weights_path) / 1024.0
            print(f"  • {GREEN}Model weights successfully loaded ({file_kb:.2f} KB).{RESET}")
        else:
            print(f"  • {YELLOW}Weights not found. Training model automatically...{RESET}")
            from train import train_model
            train_model(epochs=35)
            self.model.load(weights_path)

        self.total_frames = 0
        self.total_interventions = 0
        self.last_status = "SAFE"
        self.last_log_time = 0

    async def handle_telemetry(self, websocket):
        client_ip = websocket.remote_address
        print(f"\n{GREEN}[+] 3D UI Client Connected: {client_ip}{RESET}")
        print(f"  {CYAN}Streaming ADAS telemetry and raycast perception loop...{RESET}\n")

        try:
            async for message in websocket:
                t_start = time.perf_counter()
                self.total_frames += 1

                try:
                    data = json.loads(message)
                except Exception:
                    continue

                # Perform TinyML inference
                decision = self.model.predict(data)
                t_elapsed_ms = (time.perf_counter() - t_start) * 1000.0
                decision["inference_latency_ms"] = round(t_elapsed_ms, 3)

                # Send decision back to UI
                await websocket.send(json.dumps(decision))

                # Terminal telemetry logging (log every status transition or periodic heartbeat)
                current_status = decision["collision_risk"]
                speed = data.get("speed_kmh", 0.0)
                dist = decision["closest_obstacle_m"]
                ttc = decision["ttc_seconds"]
                e_brake = decision["emergency_brake"]
                steer = decision["steering_guidance"]

                if e_brake and self.last_status != "CRITICAL":
                    self.total_interventions += 1

                now = time.time()
                status_changed = (current_status != self.last_status)
                heartbeat = (now - self.last_log_time) > 1.2

                if status_changed or heartbeat or e_brake:
                    self.last_status = current_status
                    self.last_log_time = now

                    if current_status == "CRITICAL":
                        badge = f"{RED}{BOLD}● CRITICAL [AEB BRAKE ACTIVE]{RESET}"
                    elif current_status == "CAUTION":
                        badge = f"{YELLOW}{BOLD}▲ CAUTION  [OBSTACLE NEAR]{RESET}"
                    else:
                        badge = f"{GREEN}✔ SAFE     [ROAD CLEAR]{RESET}"

                    steer_arrow = "◄ LEFT" if steer < -0.15 else ("RIGHT ►" if steer > 0.15 else "AHEAD ▲")

                    print(
                        f"[{time.strftime('%H:%M:%S')}] {badge} | "
                        f"Speed: {speed:4.1f} km/h | "
                        f"Dist: {dist:4.1f}m | "
                        f"TTC: {ttc:4.1f}s | "
                        f"Steer Assist: {steer_arrow:7s} | "
                        f"Latency: {t_elapsed_ms * 1000:4.1f}µs"
                    )

        except websockets.exceptions.ConnectionClosed:
            print(f"\n{YELLOW}[-] 3D UI Client Disconnected.{RESET}")
        except Exception as e:
            print(f"\n{RED}[!] WebSocket Error: {e}{RESET}")


async def start_server():
    server = ADASInferenceServer()
    print(f"\n{GREEN}{BOLD}[READY] WebSocket Server listening on: ws://localhost:{PORT}/ws/telemetry{RESET}")
    print(f"{CYAN}Open the 3D Mining Simulation in your browser to begin live telemetry.{RESET}\n")

    async with websockets.serve(server.handle_telemetry, "0.0.0.0", PORT):
        await asyncio.Future()  # run forever


if __name__ == "__main__":
    try:
        asyncio.run(start_server())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Inference Server stopped by user.{RESET}")
        sys.exit(0)
