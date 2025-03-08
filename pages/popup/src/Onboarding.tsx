import { useState, useEffect } from 'react';
import { appStateStorage } from '@extension/storage';
import LegalAndAnalytics from './onboarding/legalAndAnalytics';
import Step2 from './onboarding/step2'; // Example additional page

const resetOnboarding = () => {};

const Onboarding = () => {
  // Default step is 0 if not found in storage
  const [currentStep, setCurrentStep] = useState(0);

  // Load onboarding step from storage on mount
  useEffect(() => {
    const storedStep = appStateStorage.getItem('onboardingStep');
    if (storedStep !== undefined) {
      setCurrentStep(storedStep);
    }
  }, []);

  // Function to move to the next step & save it in storage
  const goToNextStep = async () => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    await appStateStorage.setItem('onboardingStep', newStep); // Persist in storage
  };

  // Function to go back a step (if needed)
  const goToPreviousStep = async () => {
    const newStep = Math.max(0, currentStep - 1);
    setCurrentStep(newStep);
    await appStateStorage.setItem('onboardingStep', newStep); // Persist in storage
  };

  // Function to reset onboarding step to 0
  const resetOnboarding = async () => {
    await appStateStorage.setItem('onboardingStep', 0); // Reset in storage
    setCurrentStep(0); // Reset state
  };

  return (
    <>
      {currentStep === 0 && <LegalAndAnalytics goToNextStep={goToNextStep} />}
      {currentStep === 1 && <Step2 goToNextStep={goToNextStep} goToPreviousStep={goToPreviousStep} />}
      <button onClick={resetOnboarding}>Reset Onboarding</button>
      {/* Add more steps dynamically */}
    </>
  );
};

export default Onboarding;
