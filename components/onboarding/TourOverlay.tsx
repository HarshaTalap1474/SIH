"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TourStepConfig } from "./types";
import { TourTooltip } from "./TourTooltip";
import { useTourStore } from "./useTourStore";

interface TourOverlayProps {
  step: TourStepConfig;
}

export function TourOverlay({ step }: TourOverlayProps) {
  const { nextStep, prevStep, skipTour, currentStepIndex } = useTourStore();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Measure target DOM element
  const measureTarget = useCallback(() => {
    if (typeof window === "undefined") return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step.targetSelector]);

  // Scroll into view once when step changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step.scrollTargetIntoView) {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [step.id, step.targetSelector, step.scrollTargetIntoView]);

  useEffect(() => {
    // Initial measurement after short delay for scroll/drawer to settle
    measureTarget();

    let retries = 0;
    const interval = setInterval(() => {
      measureTarget();
      retries++;
      if (retries > 6) clearInterval(interval);
    }, 150);

    // Continuous update on resize or scroll
    const handleScrollOrResize = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        measureTarget();
      });
    };

    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      clearInterval(interval);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [measureTarget, step.id]);

  // Keyboard navigation: Enter / Right -> Next, Left -> Prev, Escape -> Skip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        skipTour();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft" && currentStepIndex > 0) {
        e.preventDefault();
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextStep, prevStep, skipTour, currentStepIndex]);

  const padding = step.highlightPadding ?? 6;

  // Cutout coordinates
  let cutout = { x: 0, y: 0, width: 0, height: 0, active: false };
  if (targetRect && typeof window !== "undefined") {
    const x = Math.max(0, targetRect.left - padding);
    const y = Math.max(0, targetRect.top - padding);
    const width = Math.min(window.innerWidth - x, targetRect.width + padding * 2);
    const height = Math.min(window.innerHeight - y, targetRect.height + padding * 2);

    cutout = { x, y, width, height, active: true };
  }

  return (
    <>
      {/* 4-DIV SPOTLIGHT BACKDROP: Dims entire interface while leaving target 100% clickable & unblocked */}
      {cutout.active ? (
        <div className="fixed inset-0 z-[60] pointer-events-none animate-in fade-in duration-200">
          {/* Top backdrop */}
          <div
            className="fixed top-0 left-0 right-0 bg-[#020612]/75 pointer-events-auto backdrop-blur-[0.5px] transition-all duration-200"
            style={{ height: `${cutout.y}px` }}
          />
          {/* Bottom backdrop */}
          <div
            className="fixed left-0 right-0 bottom-0 bg-[#020612]/75 pointer-events-auto backdrop-blur-[0.5px] transition-all duration-200"
            style={{ top: `${cutout.y + cutout.height}px` }}
          />
          {/* Left backdrop */}
          <div
            className="fixed left-0 bg-[#020612]/75 pointer-events-auto backdrop-blur-[0.5px] transition-all duration-200"
            style={{
              top: `${cutout.y}px`,
              width: `${cutout.x}px`,
              height: `${cutout.height}px`,
            }}
          />
          {/* Right backdrop */}
          <div
            className="fixed right-0 bg-[#020612]/75 pointer-events-auto backdrop-blur-[0.5px] transition-all duration-200"
            style={{
              top: `${cutout.y}px`,
              left: `${cutout.x + cutout.width}px`,
              height: `${cutout.height}px`,
            }}
          />

          {/* TARGET HIGHLIGHT OUTLINE */}
          <div
            style={{
              left: `${cutout.x}px`,
              top: `${cutout.y}px`,
              width: `${cutout.width}px`,
              height: `${cutout.height}px`,
            }}
            className="fixed rounded-lg border-2 border-amber-400/90 shadow-[0_0_0_1px_rgba(0,0,0,0.6),0_0_24px_rgba(245,158,11,0.35)] pointer-events-none z-[65] transition-all duration-200 ease-out"
          />
        </div>
      ) : (
        /* Fallback dim backdrop when target is not yet found */
        <div className="fixed inset-0 bg-[#020612]/70 backdrop-blur-[0.5px] z-[60] pointer-events-auto animate-in fade-in duration-200" />
      )}

      {/* POPOVER TOOLTIP */}
      <TourTooltip
        step={step}
        targetRect={targetRect}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        isFirstStep={currentStepIndex === 0}
        isLastStep={currentStepIndex === step.totalSteps - 1}
      />
    </>
  );
}
