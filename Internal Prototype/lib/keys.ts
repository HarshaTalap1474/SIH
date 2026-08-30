const pressed = new Set<string>()

interface KeyHandlers {
  onC?: () => void
  onR?: () => void
}

let handlers: KeyHandlers = {}
let initialized = false

export function initKeys(nextHandlers: KeyHandlers) {
  handlers = nextHandlers
  if (initialized) return
  initialized = true

  const down = (e: KeyboardEvent) => {
    if (e.repeat) return
    pressed.add(e.code)
    if (e.code === "KeyC") handlers.onC?.()
    if (e.code === "KeyR") handlers.onR?.()
  }
  const up = (e: KeyboardEvent) => pressed.delete(e.code)
  const clear = () => pressed.clear()

  window.addEventListener("keydown", down)
  window.addEventListener("keyup", up)
  window.addEventListener("blur", clear)
}

export function isKeyDown(code: string) {
  return pressed.has(code)
}