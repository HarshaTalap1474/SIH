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
  estopActive: boolean;
  usingCustomUrl: boolean;
  setConnected: (connected: boolean) => void;
  setButtons: (buttons: Partial<HardwareButtons>) => void;
  setEsp32Ip: (ip: string) => void;
  setEstopActive: (active: boolean) => void;
  setUsingCustomUrl: (usingCustomUrl: boolean) => void;
}

// Order matters: mDNS (.local) fails on Windows without Bonjour installed, so the
// static LAN IP is tried first (works when the ESP is on the local network), then
// mDNS (macOS/Linux), then the ESP's direct-Ap fallback IP.
const CANDIDATE_ENDPOINTS = [
  process.env.NEXT_PUBLIC_ESP32_WS || "ws://esp32-adas.local:81/ws"
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
  estopActive: false,
  usingCustomUrl: false,
  setConnected: (connected) => set({ connected }),
  setButtons: (buttons) =>
    set((state) => ({ buttons: { ...state.buttons, ...buttons } })),
  setEsp32Ip: (esp32Ip) => set({ esp32Ip }),
  setEstopActive: (estopActive) => set({ estopActive }),
  setUsingCustomUrl: (usingCustomUrl) => set({ usingCustomUrl }),
}));

export class HardwareClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private shouldConnect = false;
  private candidateIndex = 0;
  private isCustomUrl = false;
  // Exponential backoff for reconnect attempts (1s -> 2s -> 4s -> ... -> 15s cap)
  private backoffMs = 1000;
  // Generation tag: each connect() bumps this; stale WebSocket events (onclose/onerror
  // from an old socket) are ignored if their generation doesn't match the current one.
  private generation = 0;

  // MPU zero-tare offsets — captured by calling calibrate() while the board is flat
  private zeroPitch = 0;
  private zeroRoll = 0;
  private zeroYaw = 0;
  private lastRawYaw = 0;

  /** Call this while the MPU is resting flat to zero out mounting bias and yaw reference. */
  public calibrate() {
    const s = useSensor.getState();
    this.zeroPitch = s.pitch;
    this.zeroRoll = s.roll;
    this.zeroYaw = this.lastRawYaw;
    console.log(`[Hardware] MPU tare — zeroPitch=${this.zeroPitch.toFixed(2)}°, zeroRoll=${this.zeroRoll.toFixed(2)}°, zeroYaw=${this.zeroYaw.toFixed(2)}°`);
  }

  public init() {
    if (typeof window === "undefined") return;
    this.connect();
  }

  public setCustomUrl(url: string) {
    this.isCustomUrl = true;
    this.candidateIndex = 0;
    useHardwareStore.getState().setUsingCustomUrl(true);
    useHardwareStore.getState().setEsp32Ip(url);
    this.disconnect();
    this.connect();
  }

  /** Revert back to automatic candidate rotation (called by the HUD "Auto" button). */
  public clearCustomUrl() {
    if (!this.isCustomUrl) return;
    this.isCustomUrl = false;
    this.candidateIndex = 0;
    this.backoffMs = 1000;
    useHardwareStore.getState().setUsingCustomUrl(false);
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
      const gen = this.generation;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        if (gen !== this.generation) return; // stale socket
        this.isConnecting = false;
        this.backoffMs = 1000; // reset backoff on successful connect
        useHardwareStore.getState().setConnected(true);
        console.log(`[Hardware] Connected to ESP32 (${url})`);
        this.resetWatchdog();
      };

      this.ws.onmessage = (event) => {
        if (gen !== this.generation) return; // stale socket
        this.resetWatchdog();
        try {
          const data = JSON.parse(event.data);

          if (data.mpu) {
            const rawPitch = Number(data.mpu.pitch) || 0;
            const rawRoll = Number(data.mpu.roll) || 0;
            const rawYaw = Number(data.mpu.yaw) || 0;
            const ax = Number(data.mpu.ax) || 0;
            const ay = Number(data.mpu.ay) || 0;
            const az = Number(data.mpu.az) || 0;

            this.lastRawYaw = rawYaw;

            // Apply zero-tare offsets (removes mounting bias) for sensor store
            const pitch = rawPitch - this.zeroPitch;
            const roll = rawRoll - this.zeroRoll;

            useSensor.getState().setHardwareData({
              pitch,
              roll,
              yaw: rawYaw,
              ax,
              ay,
              az,
              anomaly: Boolean(data.mpu.anomaly),
            });

            // Roll maps directly: negative roll (tilt left) → look left, positive → look right.
            // CameraRig applies -lookYaw, so we pass roll as-is (not negated).
            const lookYaw = Math.max(-45, Math.min(45, (roll / 30) * 45));

            // Pitch: accel-only atan2 (never accumulates gyro error)
            const accelPitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI) - this.zeroPitch;
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
        // Ignore close events from a socket we've already replaced (stale generation).
        if (gen !== this.generation) return;
        this.cleanupConnection();
        if (!this.isCustomUrl) {
          this.candidateIndex = (this.candidateIndex + 1) % CANDIDATE_ENDPOINTS.length;
          // Bump backoff after a failed/closed attempt (unless the socket was the
          // one we just disconnected deliberately in disconnect()).
        }
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        if (gen !== this.generation) return; // stale socket
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
    // Bump the generation so the onclose from this deliberate close is ignored
    // (and won't schedule a reconnect or null out a freshly-created socket).
    this.generation++;
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
    const gen = this.generation;
    // 3 second watchdog for timeout/silence
    this.watchdogTimer = setTimeout(() => {
      if (gen !== this.generation || !this.ws) return; // stale/no socket
      console.warn("[Hardware] Heartbeat timeout (3s) — closing socket & reverting to virtual pad");
      // Close BEFORE cleanupConnection() so this.ws is still set; cleanupConnection()
      // then nulls it. (Old code closed after cleanup, leaking the socket.)
      const socket = this.ws;
      this.cleanupConnection();
      try {
        socket.close();
      } catch {
        // already closed
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
    // Exponential backoff: 1s -> 2s -> 4s -> ... -> capped at 15s. Reset on successful connect.
    const delay = Math.min(this.backoffMs, 15000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, 15000);
      this.connect();
    }, delay);
  }
}

export const hwClient = new HardwareClient();
