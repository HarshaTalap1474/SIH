"use client";

import { create } from "zustand";
import { useSensor } from "./virtualSensor";
import { useSim } from "./simStore";

export interface HardwareButtons {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  estop: boolean;
}

export interface HardwareState {
  connected: boolean;
  lastSeen: number;
  esp32Ip: string;
  buttons: HardwareButtons;
  setConnected: (connected: boolean) => void;
  setButtons: (buttons: Partial<HardwareButtons>) => void;
  setEsp32Ip: (ip: string) => void;
}

const CANDIDATE_ENDPOINTS = [
  process.env.NEXT_PUBLIC_ESP32_WS || "ws://esp32-adas.local:81/ws",
  "ws://192.168.0.103:81/ws",
  "ws://192.168.4.1:81/ws",
];

export const useHardwareStore = create<HardwareState>()((set) => ({
  connected: false,
  lastSeen: 0,
  esp32Ip: process.env.NEXT_PUBLIC_ESP32_WS || "ws://esp32-adas.local:81/ws",
  buttons: {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    estop: false,
  },
  setConnected: (connected) => set({ connected }),
  setButtons: (buttons) =>
    set((state) => ({ buttons: { ...state.buttons, ...buttons } })),
  setEsp32Ip: (esp32Ip) => set({ esp32Ip }),
}));

export class HardwareClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private shouldConnect = false;
  private candidateIndex = 0;
  private isCustomUrl = false;

  // MPU zero-tare offsets — captured by calling calibrate() while the board is flat
  private zeroPitch = 0;
  private zeroRoll = 0;

  /** Call this while the MPU is resting flat to zero out mounting bias. */
  public calibrate() {
    const s = useSensor.getState();
    this.zeroPitch = s.pitch;
    this.zeroRoll = s.roll;
    console.log(`[Hardware] MPU tare — zeroPitch=${this.zeroPitch.toFixed(2)}°, zeroRoll=${this.zeroRoll.toFixed(2)}°`);
  }

  public init() {
    if (typeof window === "undefined") return;
    this.connect();
  }

  public setCustomUrl(url: string) {
    this.isCustomUrl = true;
    useHardwareStore.getState().setEsp32Ip(url);
    this.disconnect();
    this.connect();
  }

  public connect() {
    this.shouldConnect = true;
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const url = this.isCustomUrl
      ? useHardwareStore.getState().esp32Ip
      : CANDIDATE_ENDPOINTS[this.candidateIndex % CANDIDATE_ENDPOINTS.length];

    useHardwareStore.getState().setEsp32Ip(url);

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnecting = false;
        useHardwareStore.getState().setConnected(true);
        console.log(`[Hardware] Connected to ESP32 (${url})`);
        this.resetWatchdog();
      };

      this.ws.onmessage = (event) => {
        this.resetWatchdog();
        try {
          const data = JSON.parse(event.data);

          if (data.mpu) {
            const rawPitch = Number(data.mpu.pitch) || 0;
            const rawRoll  = Number(data.mpu.roll)  || 0;
            const ax = Number(data.mpu.ax) || 0;
            const ay = Number(data.mpu.ay) || 0;
            const az = Number(data.mpu.az) || 0;

            // Apply zero-tare offsets (removes mounting bias) for sensor store
            const pitch = rawPitch - this.zeroPitch;
            const roll  = rawRoll  - this.zeroRoll;

            useSensor.getState().setHardwareData({
              pitch,
              roll,
              yaw: Number(data.mpu.yaw) || 0,
              ax,
              ay,
              az,
              anomaly: Boolean(data.mpu.anomaly),
            });

            // Camera look: use drift-free accel-only angles (atan2 on raw g-vectors).
            // These NEVER accumulate gyro error — they always track true physical tilt.
            // Apply the same zero-tare offsets so CAL MPU recentres the camera too.
            const accelRoll  = Math.atan2(ay, az) * (180 / Math.PI) - this.zeroRoll;
            const accelPitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI) - this.zeroPitch;

            // ±15° physical tilt -> ±30° camera yaw, ±20° camera pitch
            const lookYaw   = Math.max(-30, Math.min(30, (accelRoll  / 15) * 30));
            const lookPitch = Math.max(-20, Math.min(20, (accelPitch / 15) * 20));
            useSim.getState().setCameraLook(lookYaw, lookPitch);
          }

          if (data.btn) {
            useHardwareStore.getState().setButtons({
              throttle: Boolean(data.btn.throttle),
              brake: Boolean(data.btn.brake),
              left: Boolean(data.btn.left),
              right: Boolean(data.btn.right),
              estop: Boolean(data.btn.estop),
            });
          }

          useHardwareStore.setState({ lastSeen: Date.now(), connected: true });
        } catch {
          // ignore parsing error
        }
      };

      this.ws.onclose = () => {
        this.cleanupConnection();
        if (!this.isCustomUrl) {
          this.candidateIndex = (this.candidateIndex + 1) % CANDIDATE_ENDPOINTS.length;
        }
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.cleanupConnection();
      if (!this.isCustomUrl) {
        this.candidateIndex = (this.candidateIndex + 1) % CANDIDATE_ENDPOINTS.length;
      }
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.shouldConnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanupConnection();
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
    // 3 second watchdog for timeout/silence
    this.watchdogTimer = setTimeout(() => {
      console.warn("[Hardware] Heartbeat timeout (3s) — reverting to virtual pad");
      this.cleanupConnection();
      if (this.ws) {
        this.ws.close();
      }
    }, 3000);
  }

  private cleanupConnection() {
    this.ws = null;
    this.isConnecting = false;
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    useHardwareStore.getState().setConnected(false);
    // Fallback on disconnect/timeout
    useSensor.getState().setSource("virtual-pad");
    useSim.getState().setCameraLook(0, 0);
  }

  private scheduleReconnect() {
    if (!this.shouldConnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 3000);
  }
}

export const hwClient = new HardwareClient();
