export type TourStage = "idle" | "welcome" | "tour" | "completed";

export type TooltipPlacement = "right" | "bottom" | "left" | "top" | "center";

export interface TourStepConfig {
  id: string;
  stepNumber: number;
  totalSteps: number;
  targetSelector: string;
  title: string;
  description: string;
  placement: TooltipPlacement;
  highlightPadding?: number;
  badgeText?: string;
  interactiveHint?: string;
  scrollTargetIntoView?: boolean;
}
