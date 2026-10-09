"use client";

import { create } from "zustand";
import { useSensor } from "./virtualSensor";

export interface HardwareButtons {
  throttle: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  estop: boolean;
}

export interface HardwareState {
  connected: boolean;
  connecting: boolean;
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

// Canonical mDNS WebSocket endpoint from ESP32 firmware (esp32-adas.local:81/ws)
export const DEFAULT_MDNS_ENDPOINT = "ws://esp32-adas.local:81/ws";

export const useHardwareStore = create<HardwareState>()((set) => ({
  connected: false,
  connecting: true,
  lastSeen: 0,
  esp32Ip: process.env.NEXT_PUBLIC_ESP32_WS || DEFAULT_MDNS_ENDPOINT,
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
  private handshakeTimer: NodeJS.Timeout | null = null;
  private supervisorTimer: NodeJS.Timeout | null = null;
  private shouldConnect = true;
  private isCustomUrl = false;
  private generation = 0;
  private listenersAttached = false;

  // Zero-tare offsets for MPU6050
  private zeroPitch = 0;
  private zeroRoll = 0;
  private zeroYaw = 0;
  private lastRawYaw = 0;

  /** Tare MPU6050 to zero out mounting offsets */
  public calibrate() {
    const s = useSensor.getState();
    this.zeroPitch = s.pitch;
    this.zeroRoll = s.roll;
    this.zeroYaw = this.lastRawYaw;
    console.log(
      `[Hardware] MPU Tare: Pitch=${this.zeroPitch.toFixed(1)}°, Roll=${this.zeroRoll.toFixed(1)}°`
    );
  }

  public init() {
    if (typeof window === "undefined") return;

    if (!this.listenersAttached) {
      this.listenersAttached = true;
      // Re-connect aggressively when browser comes online or tab becomes visible
      window.addEventListener("online", () => this.triggerImmediateReconnect());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          this.triggerImmediateReconnect();
        }
      });

      // Background supervisor loop: ensures the client is always actively listening
      this.supervisorTimer = setInterval(() => {
        if (
          this.shouldConnect &&
          !this.ws &&
          !this.isConnecting &&
          !useHardwareStore.getState().connected
        ) {
          this.connect();
        }
      }, 2000);
    }

    this.connect();
  }

  public setCustomUrl(url: string) {
    this.isCustomUrl = true;
    useHardwareStore.getState().setUsingCustomUrl(true);
    useHardwareStore.getState().setEsp32Ip(url);
    this.disconnect(true);
    this.connect();
  }

  public clearCustomUrl() {
    this.isCustomUrl = false;
    useHardwareStore.getState().setUsingCustomUrl(false);
    useHardwareStore.getState().setEsp32Ip(DEFAULT_MDNS_ENDPOINT);
    this.disconnect(true);
    this.connect();
  }

  private triggerImmediateReconnect() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.cleanupConnection();
      this.connect();
    }
  }

  public connect() {
    this.shouldConnect = true;

    // Already connected and operational
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Already in the middle of a fresh handshake
    if (this.isConnecting && this.ws && this.ws.readyState === WebSocket.CONNECTING) {
      return;
    }

    this.cleanupConnection();
    this.isConnecting = true;
    this.generation++;
    const gen = this.generation;

    const endpoint = this.isCustomUrl
      ? useHardwareStore.getState().esp32Ip
      : DEFAULT_MDNS_ENDPOINT;

    useHardwareStore.setState({ esp32Ip: endpoint, connecting: true });

    try {
      const socket = new WebSocket(endpoint);
      this.ws = socket;

      // 2.5-second handshake watchdog: if browser hangs during mDNS resolution, abort and retry
      this.handshakeTimer = setTimeout(() => {
        if (gen !== this.generation) return;
        if (socket.readyState !== WebSocket.OPEN) {
          try {
            socket.close();
          } catch {
            // ignore
          }
          this.cleanupConnection();
          this.scheduleReconnect(800);
        }
      }, 2500);

      socket.onopen = () => {
        if (gen !== this.generation) return;
        this.clearHandshakeTimer();
        this.isConnecting = false;
        useHardwareStore.setState({ connected: true, connecting: false });
        console.log(`[Hardware] Connected to ESP32 mDNS (${endpoint})`);
        this.resetWatchdog();
      };

      socket.onmessage = (event) => {
        if (gen !== this.generation) return;
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

            useSensor.getState().setHardwareData({
              pitch: rawPitch - this.zeroPitch,
              roll: rawRoll - this.zeroRoll,
              yaw: rawYaw,
              ax,
              ay,
              az,
              anomaly: Boolean(data.mpu.anomaly),
            });
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
          // ignore telemetry frame parse error
        }
      };

      socket.onclose = () => {
        if (gen !== this.generation) return;
        this.clearHandshakeTimer();
        this.cleanupConnection();
        this.scheduleReconnect(1000);
      };

      socket.onerror = () => {
        if (gen !== this.generation) return;
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.cleanupConnection();
      this.scheduleReconnect(1000);
    }
  }

  public disconnect(keepSupervising = false) {
    this.shouldConnect = keepSupervising;
    this.generation++;
    this.clearHandshakeTimer();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
    this.cleanupConnection();
  }

  private resetWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
    }
    const gen = this.generation;

    // 2.5 second watchdog for continuous 50Hz telemetry packets
    this.watchdogTimer = setTimeout(() => {
      if (gen !== this.generation || !this.ws) return;
      console.warn("[Hardware] Telemetry timeout (2.5s) — reconnecting mDNS...");
      const socket = this.ws;
      this.cleanupConnection();
      try {
        socket.close();
      } catch {
        // ignore
      }
      this.scheduleReconnect(500);
    }, 2500);
  }

  private clearHandshakeTimer() {
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
  }

  private cleanupConnection() {
    this.ws = null;
    this.isConnecting = false;
    this.clearHandshakeTimer();
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    useHardwareStore.setState({ connected: false, connecting: this.shouldConnect });
  }

  private scheduleReconnect(delayMs = 1000) {
    if (!this.shouldConnect || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }
}

export const hwClient = new HardwareClient();
