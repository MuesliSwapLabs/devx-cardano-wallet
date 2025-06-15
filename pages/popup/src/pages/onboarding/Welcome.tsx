import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { appStateStorage } from '@extension/storage';

import { PrimaryButton } from '../../components/buttons';

const Onboarding = () => {
  const navigate = useNavigate();

  // Local state for checkbox
  const [acceptedWarning] = useState(() => {
    const warningAccepted = appStateStorage.getItem('onboarding:LegalAndAnalyticsAccepted');
    return warningAccepted !== undefined;
  });

  return (
    <div className="flex flex-col items-center h-full">
      <h1 className="text-2xl font-bold">Welcome!</h1>
      <p className="mt-2">Thank you for installing DevX wallet.</p>
      <p className="mt-2">
        DevX is a wallet created for developers. Its goal is to create an easy way for developers to interact with the
        blockchain.
      </p>
      <div className="w-full mt-auto pt-6 flex justify-between space-y-4">
        <PrimaryButton onClick={() => navigate('/onboarding/legal')} className="w-full">
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Onboarding;
