import React from 'react';
import { useNavigate } from 'react-router-dom';

import { PrimaryButton, SecondaryButton } from '@src/components/buttons';

const AddWallet = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Add Wallet</h2>
      <p className="text-center text text-white-800 mt-2">Create/spoof a new wallet or import an existing account!</p>

      {/* New Wallet Section */}
      <div className="mt-10 w-full items-center">
        <div className="mt-2">
          <PrimaryButton onClick={() => navigate('/onboarding/create-new-wallet')} className="w-3/5">
            Create New Wallet
          </PrimaryButton>
        </div>
      </div>

      <h3 className="mt-10 text-center text-base text-white-500">or</h3>

      {/* Existing Wallet Section */}
      <div className="mt-10  w-full flex flex-col space-y-4 items-center">
        <SecondaryButton onClick={() => navigate('/onboarding/import-wallet-from-seed-phrase')} className="w-3/5">
          Import from Seed Phrase
        </SecondaryButton>
        <SecondaryButton onClick={() => alert('not implemented')} className="w-3/5">
          Import from DevX File
        </SecondaryButton>
        <SecondaryButton onClick={() => navigate('/onboarding/spoof-wallet')} className="w-3/5">
          Spoof Wallet
        </SecondaryButton>
      </div>
    </div>
  );
};

export default AddWallet;
