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

export const useHardwareStore = create<HardwareState>()((set) => ({
  connected: false,
  lastSeen: 0,
  esp32Ip: process.env.NEXT_PUBLIC_ESP32_WS || "ws://192.168.0.103:81/ws",
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

  public init() {
    if (typeof window === "undefined") return;
    this.connect();
  }

  public connect() {
    this.shouldConnect = true;
    if (this.ws || this.isConnecting) return;
    this.isConnecting = true;

    const url = useHardwareStore.getState().esp32Ip;

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
            useSensor.getState().setHardwareData({
              pitch: Number(data.mpu.pitch) || 0,
              roll: Number(data.mpu.roll) || 0,
              yaw: Number(data.mpu.yaw) || 0,
              ax: Number(data.mpu.ax) || 0,
              ay: Number(data.mpu.ay) || 0,
              az: Number(data.mpu.az) || 0,
              anomaly: Boolean(data.mpu.anomaly),
            });

            // Map MPU roll/pitch to cockpit look offsets
            // Roll (-30..+30°) -> Camera Look Yaw (-45..+45°)
            // Pitch (-30..+30°) -> Camera Look Pitch (-30..+30°)
            const roll = Number(data.mpu.roll) || 0;
            const pitch = Number(data.mpu.pitch) || 0;
            const lookYaw = Math.max(-45, Math.min(45, (roll / 30) * 45));
            const lookPitch = Math.max(-30, Math.min(30, pitch));
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
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch {
      this.cleanupConnection();
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
