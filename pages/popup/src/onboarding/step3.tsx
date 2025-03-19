import React from 'react';

interface Step3Props {
  goToPreviousStep: () => void;
  goToNextStep: () => void;
}

const Page3 = ({ goToPreviousStep, goToNextStep }: Step3Props) => (
  <div>
    <h2>Welcome!</h2>
    <p>This is step 3.</p>
    <div className="flex space-x-4 mt-4">
      <button onClick={goToPreviousStep} className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
        Back
      </button>
      <button onClick={goToNextStep} className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
        Next
      </button>
    </div>
  </div>
);

export default Page3;
