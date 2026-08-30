const pressed = new Set<string>();

interface KeyHandlers {
  onC?: () => void;
  onR?: () => void;
  onH?: () => void;
  onF?: () => void;
}

let handlers: KeyHandlers = {};
let initialized = false;

export function initKeys(nextHandlers: KeyHandlers) {
  handlers = nextHandlers;
  if (initialized) return;
  initialized = true;

  const down = (e: KeyboardEvent) => {
    // Ignore key presses if user is focused on an input element
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    if (e.repeat) return;
    pressed.add(e.code);

    if (e.code === "KeyC") handlers.onC?.();
    if (e.code === "KeyR") handlers.onR?.();
    if (e.code === "KeyH") handlers.onH?.();
    if (e.code === "KeyF") handlers.onF?.();
  };

  const up = (e: KeyboardEvent) => pressed.delete(e.code);
  const clear = () => pressed.clear();

  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", clear);
}

export function isKeyDown(code: string) {
  // Support both WASD and Arrow keys
  if (code === "KeyW") return pressed.has("KeyW") || pressed.has("ArrowUp");
  if (code === "KeyS") return pressed.has("KeyS") || pressed.has("ArrowDown");
  if (code === "KeyA") return pressed.has("KeyA") || pressed.has("ArrowLeft");
  if (code === "KeyD") return pressed.has("KeyD") || pressed.has("ArrowRight");
  return pressed.has(code);
}