import { useState, useEffect } from 'react';
import { appStateStorage } from '@extension/storage';
import LegalAndAnalytics from './onboarding/legalAndAnalytics';
import Step2 from './onboarding/step2';
import Step3 from './onboarding/step3';
import Step4 from './onboarding/step4';
import Step5 from './onboarding/step5';

interface OnboardingProps {
  currentStep: number;
  goToPreviousStep: () => void;
  goToNextStep: () => void;
  finishOnboarding: () => void;
}

const Onboarding = ({ currentStep, goToPreviousStep, goToNextStep, finishOnboarding }: OnboardingProps) => {
  return (
    <>
      {currentStep === 0 && <LegalAndAnalytics goToNextStep={goToNextStep} />}
      {currentStep === 1 && <Step2 goToPreviousStep={goToPreviousStep} goToNextStep={goToNextStep} />}
      {currentStep === 2 && <Step3 goToPreviousStep={goToPreviousStep} goToNextStep={goToNextStep} />}
      {currentStep === 3 && <Step4 goToPreviousStep={goToPreviousStep} goToNextStep={goToNextStep} />}
      {currentStep === 4 && <Step5 goToPreviousStep={goToPreviousStep} finishOnboarding={finishOnboarding} />}
      {/* Add more steps as needed */}
    </>
  );
};

export default Onboarding;
