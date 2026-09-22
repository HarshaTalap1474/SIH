import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "reset"
  | "camera"
  | "headlight"
  | "fog"
  | "rain"
  | "plug"
  | "crosshair"
  | "power"
  | "bolt"
  | "alert"
  | "check"
  | "steerLeft"
  | "steerRight"
  | "steerUp"
  | "gauge";

const PATHS: Record<IconName, ReactNode> = {
  reset: (
    <>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  headlight: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </>
  ),
  fog: (
    <>
      <path d="M17 14a4 4 0 1 0-.3-8A5.5 5.5 0 0 0 7 7.5 4 4 0 0 0 8 14" />
      <path d="M6 19h12M9 22h6" />
    </>
  ),
  rain: (
    <>
      <path d="M17 12a4 4 0 1 0-.3-8A5.5 5.5 0 0 0 7 7.5 4 4 0 0 0 8 12" />
      <path d="M8 19l1-2M12 19l1-2M16 19l1-2" />
    </>
  ),
  plug: (
    <>
      <path d="M12 22v-5" />
      <path d="M9 8V2M15 8V2" />
      <path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  power: (
    <>
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.77.04" />
    </>
  ),
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
  alert: (
    <>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  steerLeft: <path d="M15 18l-6-6 6-6" />,
  steerRight: <path d="M9 18l6-6-6-6" />,
  steerUp: <path d="M18 15l-6-6-6 6" />,
  gauge: (
    <>
      <path d="M12 14l4-4" />
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
    </>
  ),
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
}

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {PATHS[name]}
    </svg>
  );
}