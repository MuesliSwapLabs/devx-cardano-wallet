import React from 'react';

interface Step5Props {
  goToPreviousStep: () => void;
  finishOnboarding: () => void;
}

const Page5 = ({ goToPreviousStep, finishOnboarding }: Step5Props) => (
  <div>
    <h2>Welcome!</h2>
    <p>This is step 5.</p>
    <div className="flex space-x-4 mt-4">
      <button onClick={goToPreviousStep} className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
        Back
      </button>
      <button
        onClick={finishOnboarding}
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
        Finish Onboarding
      </button>
    </div>
  </div>
);

export default Page5;
