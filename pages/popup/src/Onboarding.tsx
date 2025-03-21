import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appStateStorage } from '@extension/storage';
import { getCurrentPrice } from '@extension/shared/wallet';

const Onboarding = () => {
  const navigate = useNavigate();

  // Local state for checkbox
  const [acceptedWarning, setAcceptedWarning] = useState(() => {
    var warningAccepted = appStateStorage.getItem('onboarding:LegalAndAnalyticsAccepted');

    if (warningAccepted === undefined) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col items-center">
      <h1 className="text-2xl font-bold">Onboarding</h1>
      <p className="mt-2">Select an onboarding step:</p>
      <div className="mt-4 flex flex-col gap-4">
        Legal accepted: {String(acceptedWarning)}
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
        onClick={() => navigate(-1)}
        className="mt-6 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">
        Finish Onboarding
      </button>
    </div>
  );
};

export default Onboarding;
