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
  lastSeen: number;
  portInfo: string;
  buttons: HardwareButtons;
  estopActive: boolean;
  setConnected: (connected: boolean) => void;
  setButtons: (buttons: Partial<HardwareButtons>) => void;
  setPortInfo: (info: string) => void;
  setEstopActive: (active: boolean) => void;
}

export const useHardwareStore = create<HardwareState>()((set) => ({
  connected: false,
  lastSeen: 0,
  portInfo: "",
  buttons: {
    throttle: false,
    brake: false,
    left: false,
    right: false,
    estop: false,
  },
  estopActive: false,
  setConnected: (connected) => set({ connected }),
  setButtons: (buttons) =>
    set((state) => ({ buttons: { ...state.buttons, ...buttons } })),
  setPortInfo: (portInfo) => set({ portInfo }),
  setEstopActive: (estopActive) => set({ estopActive }),
}));

/**
 * Splits a stream of text into lines on '\n' boundaries.
 * Used to chunk USB serial data into individual JSON payloads.
 */
class LineBreakTransformer implements Transformer<string, string> {
  private buf = "";

  transform(chunk: string, controller: TransformStreamDefaultController<string>) {
    this.buf += chunk;
    const lines = this.buf.split("\n");
    this.buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) controller.enqueue(trimmed);
    }
  }

  flush(controller: TransformStreamDefaultController<string>) {
    const trimmed = this.buf.trim();
    if (trimmed) controller.enqueue(trimmed);
  }
}

export class HardwareClient {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<string> | null = null;
  private readableStreamClosed: Promise<void> | null = null;
  private running = false;

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

  /** Whether Web Serial API is available in this browser */
  public isSupported(): boolean {
    return typeof navigator !== "undefined" && "serial" in navigator;
  }

  /**
   * Open the serial port picker and start reading.
   * MUST be called from a user-gesture event handler (click).
   */
  public async connect(): Promise<void> {
    if (!this.isSupported()) {
      console.warn("[Hardware] Web Serial API not supported in this browser");
      return;
    }

    // Already connected
    if (this.port && this.running) return;

    try {
      // Browser shows port picker (requires user gesture)
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 921600 });

      this.port = port;
      this.running = true;

      // Extract port info for display
      const info = port.getInfo();
      const label =
        info.usbVendorId && info.usbProductId
          ? `USB ${info.usbVendorId.toString(16)}:${info.usbProductId.toString(16)}`
          : "Serial Device";
      useHardwareStore.setState({ connected: true, portInfo: label });
      console.log(`[Hardware] Connected to ${label} (USB Serial @921600)`);

      // Start reading in background
      this.readLoop();
    } catch (err) {
      // User cancelled the picker or open failed
      console.warn("[Hardware] Connect failed:", err);
      this.cleanupConnection();
    }
  }

  /** Close the serial port and stop reading */
  public async disconnect(): Promise<void> {
    this.running = false;

    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.readableStreamClosed) {
        await this.readableStreamClosed.catch(() => { });
        this.readableStreamClosed = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {
      // ignore close errors
    }

    this.cleanupConnection();
    console.log("[Hardware] Disconnected");
  }

  /**
   * Background read loop: pipes port.readable through TextDecoder + LineBreak,
   * parses each JSON line, and feeds stores — identical data flow to the old
   * WebSocket onmessage handler.
   */
  private async readLoop(): Promise<void> {
    if (!this.port?.readable) return;

    const textDecoder = new TextDecoderStream();
    this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);

    const lineStream = textDecoder.readable.pipeThrough(
      new TransformStream(new LineBreakTransformer())
    );
    this.reader = lineStream.getReader();

    try {
      while (this.running) {
        const { value, done } = await this.reader.read();
        if (done) break;

        try {
          const data = JSON.parse(value);

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
          // ignore malformed JSON lines (calibration logs, boot messages, etc.)
        }
      }
    } catch (err) {
      // ReadableStream error (port disconnected, cable unplugged)
      console.warn("[Hardware] Read error (cable disconnected?):", err);
    } finally {
      this.reader = null;
      this.cleanupConnection();
    }
  }

  private cleanupConnection() {
    this.running = false;
    useHardwareStore.setState({ connected: false, portInfo: "" });
  }
}

export const hwClient = new HardwareClient();
