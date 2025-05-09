import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appStateStorage } from '@extension/storage';
import { getCurrentPrice } from '@extension/shared/wallet';

import { PrimaryButton } from '../components/buttons';

const Onboarding = () => {
  const navigate = useNavigate();

  // Local state for checkbox
  const [acceptedWarning] = useState(() => {
    const warningAccepted = appStateStorage.getItem('onboarding:LegalAndAnalyticsAccepted');
    return warningAccepted !== undefined;
  });

  // State to toggle debug section visibility
  const [debugOpen, setDebugOpen] = useState(false);

  return (
    <div className="flex flex-col items-center h-full">
      <h1 className="text-2xl font-bold">Welcome!</h1>
      <p className="mt-2">Thank you for installing DevX wallet.</p>
      <p className="mt-2">
        DevX is a wallet created for developers. Its goal is to create an easy way for developers to interact with the
        blockchain.
      </p>
      <div className="w-full mt-auto pt-6 flex justify-between space-y-4">
        <PrimaryButton onClick={() => navigate('/onboarding/legal-and-analytics')} className="w-full">
          Continue
        </PrimaryButton>
      </div>

      <br />
      <br />
      <br />
      <br />
      <br />

      {/* Debug section with expandable functionality */}
      <div className="w-full max-w-md">
        <button
          onClick={() => setDebugOpen(!debugOpen)}
          className="w-full bg-gray-200 rounded hover:bg-gray-300 transition text-left">
          <span className="text font-bold">DEBUG STUFF: (click)</span>
        </button>
        {debugOpen && (
          <div className="mt-2 p-4 border border-gray-300 rounded">
            <p className="mt-2">Select an onboarding step:</p>
            <div className="mt-4 flex flex-col gap-4">
              <p>Legal accepted: {String(acceptedWarning)}</p>
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
            </div>
            <button
              onClick={() => navigate(-1)}
              className="mt-6 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">
              Finish Onboarding
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
