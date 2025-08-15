import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { PrimaryButton } from '../components/buttons';
import { onboardingStorage } from '@extension/storage';

/**
 * Welcome is the initial landing page for the onboarding flow.
 * Its only job is to display a welcome message and navigate the user
 * to the next step (the legal screen).
 */
const Welcome = () => {
  const navigate = useNavigate();

  // Initialize onboarding on mount
  useEffect(() => {
    const initOnboarding = async () => {
      await onboardingStorage.startOnboarding();
      await onboardingStorage.goToStep('welcome');
      await onboardingStorage.setCurrentRoute('/onboarding');
    };
    initOnboarding();
  }, []);

  return (
    <div className="flex flex-col items-center h-full text-center">
      <div className="flex-grow flex flex-col justify-center">
        <h1 className="text-2xl font-bold">Welcome!</h1>
        <p className="mt-2">Thank you for installing DevX wallet.</p>
        <p className="mt-2">
          DevX is a wallet created for developers. Its goal is to create an easy way for developers to interact with the
          blockchain.
        </p>
      </div>

      <div className="w-full mt-auto pt-6">
        <PrimaryButton
          onClick={async () => {
            await onboardingStorage.goToStep('legal');
            navigate('/onboarding/legal');
          }}
          className="w-full">
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Welcome;
