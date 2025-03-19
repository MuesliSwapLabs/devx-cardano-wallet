import React from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingProps {
  currentStep: number;
  finishOnboarding: () => void;
}

const Onboarding = ({ currentStep, finishOnboarding }: OnboardingProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold">Onboarding</h1>
      <p className="mt-2">Select an onboarding step:</p>
      <div className="mt-4 flex flex-col gap-4">
        <button
          onClick={() => navigate('/onboarding/legal-and-analytics')}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
          Legal & Analytics
        </button>
        <button
          onClick={() => navigate('/onboarding/add-wallet')}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
          Add Wallet
        </button>
        {/* You can add more buttons here for additional steps (e.g. step3, step4, etc.) */}
      </div>
      <button
        onClick={finishOnboarding}
        className="mt-6 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">
        Finish Onboarding
      </button>
      <p className="mt-4">Current Step: {currentStep}</p>
    </div>
  );
};

export default Onboarding;
