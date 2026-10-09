"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Sparkles, Check } from "lucide-react";
import { TourStepConfig } from "./types";

interface TourTooltipProps {
  step: TourStepConfig;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

export function TourTooltip({
  step,
  targetRect,
  onNext,
  onPrev,
  onSkip,
  isFirstStep,
  isLastStep,
}: TourTooltipProps) {
  const [viewport, setViewport] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateSize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const isMobile = viewport.width < 640;

  // Compute tooltip position & arrow direction
  const position = useMemo(() => {
    const vWidth = typeof window !== "undefined" ? window.innerWidth : viewport.width;
    const vHeight = typeof window !== "undefined" ? window.innerHeight : viewport.height;
    const tooltipWidth = Math.min(360, vWidth - 32);
    const tooltipHeight = 250;
    const margin = 14;

    if (!targetRect || isMobile) {
      // Mobile or fallback: bottom sheet card
      const isTargetAtBottom = targetRect ? targetRect.top > vHeight * 0.6 : false;
      return {
        style: isTargetAtBottom
          ? {
              position: "fixed" as const,
              top: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: `${tooltipWidth}px`,
              maxHeight: "calc(100vh - 32px)",
              zIndex: 75,
            }
          : {
              position: "fixed" as const,
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              width: `${tooltipWidth}px`,
              maxHeight: "calc(100vh - 32px)",
              zIndex: 75,
            },
        arrow: "none" as const,
      };
    }

    let calculatedLeft = 0;
    let calculatedTop = 0;
    let arrowDir: "left" | "right" | "top" | "bottom" = "left";

    // 1. Placement: RIGHT
    if (step.placement === "right") {
      if (targetRect.right + tooltipWidth + margin < vWidth) {
        calculatedLeft = targetRect.right + margin;
        calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        arrowDir = "left";
      } else {
        // Fallback: place on left or below
        calculatedLeft = targetRect.left - tooltipWidth - margin;
        calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        arrowDir = "right";
      }
    }
    // 2. Placement: LEFT
    else if (step.placement === "left") {
      if (targetRect.left - tooltipWidth - margin > 16) {
        calculatedLeft = targetRect.left - tooltipWidth - margin;
        calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        arrowDir = "right";
      } else {
        // Fallback: place on right
        calculatedLeft = targetRect.right + margin;
        calculatedTop = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        arrowDir = "left";
      }
    }
    // 3. Placement: BOTTOM
    else if (step.placement === "bottom") {
      if (targetRect.bottom + tooltipHeight + margin < vHeight) {
        calculatedTop = targetRect.bottom + margin;
        calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowDir = "top";
      } else {
        // Fallback: place on top
        calculatedTop = targetRect.top - tooltipHeight - margin;
        calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowDir = "bottom";
      }
    }
    // 4. Placement: TOP
    else if (step.placement === "top") {
      if (targetRect.top - tooltipHeight - margin > 16) {
        calculatedTop = targetRect.top - tooltipHeight - margin;
        calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowDir = "bottom";
      } else {
        calculatedTop = targetRect.bottom + margin;
        calculatedLeft = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        arrowDir = "top";
      }
    }

    // Safety clamping within viewport
    const clampedLeft = Math.max(16, Math.min(vWidth - tooltipWidth - 16, calculatedLeft));
    const clampedTop = Math.max(16, Math.min(vHeight - tooltipHeight - 16, calculatedTop));

    return {
      style: {
        position: "fixed" as const,
        left: `${clampedLeft}px`,
        top: `${clampedTop}px`,
        width: `${tooltipWidth}px`,
        maxHeight: "calc(100vh - 32px)",
        zIndex: 75,
      },
      arrow: arrowDir,
    };
  }, [targetRect, step.placement, viewport, isMobile]);

  return (
    <div
      style={position.style}
      role="region"
      aria-label={`Tour step ${step.stepNumber}: ${step.title}`}
      className="rounded-xl border border-slate-700/90 bg-[#0d131f]/95 shadow-[0_12px_40px_rgba(0,0,0,0.7)] backdrop-blur-md p-4 text-slate-100 transition-all duration-200 select-none animate-in fade-in-50 zoom-in-95"
    >
      {/* Top subtle highlight line */}
      <div className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

      {/* Header: Progress, Badge & Close */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-400">
            {step.stepNumber} of {step.totalSteps}
          </span>
          {step.badgeText && (
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {step.badgeText}
            </span>
          )}
        </div>

        <button
          onClick={onSkip}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 transition-colors cursor-pointer"
          title="Skip Tour"
          aria-label="Skip Tour"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title */}
      <h3 className="text-sm font-bold text-white tracking-tight mb-1 flex items-center gap-1.5">
        <span>{step.title}</span>
      </h3>

      {/* Description */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3">
        {step.description}
      </p>

      {/* Interactive Action Hint (if any) */}
      {step.interactiveHint && (
        <div className="mb-3 flex items-center gap-1.5 rounded border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300">
          <Sparkles className="h-3 w-3 shrink-0 text-amber-400" />
          <span>{step.interactiveHint}</span>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/70">
        <button
          onClick={onSkip}
          className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer font-medium"
        >
          Skip Tour
        </button>

        <div className="flex items-center gap-2">
          {!isFirstStep && (
            <button
              onClick={onPrev}
              className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Back</span>
            </button>
          )}

          <button
            onClick={onNext}
            className="flex items-center gap-1 rounded-md bg-amber-400 px-3 py-1 text-xs font-bold text-black hover:bg-amber-300 shadow-sm shadow-amber-500/20 transition-all cursor-pointer"
          >
            <span>{isLastStep ? "Finish" : "Next"}</span>
            {isLastStep ? (
              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
