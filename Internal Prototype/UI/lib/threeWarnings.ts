import { setConsoleFunction, getConsoleFunction } from "three";

const CLOCK_DEPRECATED =
  "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.";

let installed = false;

function install() {
  if (installed) return;
  installed = true;

  const originalWarn = console.warn;
  const originalError = console.error;
  const originalLog = console.log;

  setConsoleFunction((type: "log" | "warn" | "error", message: string, ...rest: unknown[]) => {
    if (type === "warn" && message === CLOCK_DEPRECATED) return;

    const target =
      type === "error" ? originalError : type === "log" ? originalLog : originalWarn;
    target(message, ...rest);
  });
}

export function silenceThreeClockWarning() {
  if (typeof window === "undefined") return;
  if (!getConsoleFunction()) install();
}
