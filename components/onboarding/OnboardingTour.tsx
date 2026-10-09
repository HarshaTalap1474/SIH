"use client";

import { useEffect } from "react";
import { useTourStore } from "./useTourStore";
import { TOUR_STEPS } from "./tourConfig";
import { WelcomeModal } from "./WelcomeModal";
import { TourOverlay } from "./TourOverlay";
import { CompletedModal } from "./CompletedModal";

export function OnboardingTour() {
  const { stage, isOpen, currentStepIndex, hasCheckedStorage, initializeTour } =
    useTourStore();

  useEffect(() => {
    initializeTour();
  }, [initializeTour]);

  if (!hasCheckedStorage || !isOpen || stage === "idle") {
    return null;
  }

  if (stage === "welcome") {
    return <WelcomeModal />;
  }

  if (stage === "tour") {
    const currentStep = TOUR_STEPS[currentStepIndex];
    if (!currentStep) return null;
    return <TourOverlay key={currentStep.id} step={currentStep} />;
  }

  if (stage === "completed") {
    return <CompletedModal />;
  }

  return null;
}
