import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';

const AddWallet = () => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Add Wallet</h2>
      <p className="text-center text text-white-800 mt-2">Create/spoof a new wallet or import an existing account!</p>

      {/* New Wallet Section */}
      <div className="mt-10 w-full items-center">
        <div className="mt-2 flex justify-center">
          <PrimaryButton onClick={() => navigate('/onboarding/create-new-wallet')} className="w-3/5">
            Create New Wallet
          </PrimaryButton>
        </div>
      </div>

      <h3 className="mt-10 text-center text-base text-white-500">or</h3>

      {/* Existing Wallet Section */}
      <div className="mt-10 w-full flex flex-col space-y-4 items-center">
        <SecondaryButton onClick={() => navigate('/onboarding/import-wallet-from-seed-phrase')} className="w-3/5">
          Import from Seed Phrase
        </SecondaryButton>

        <SecondaryButton onClick={() => alert('not implemented')} className="w-3/5">
          Import from DevX File
        </SecondaryButton>

        <div className="w-3/5 flex items-center relative">
          <SecondaryButton onClick={() => navigate('/onboarding/spoof-wallet')} className="w-full">
            Spoof Wallet
          </SecondaryButton>

          {/* Help Icon positioned absolute to the right */}
          <div
            className="absolute right-[-24px] w-5 h-5 rounded-full bg-white border border-gray-300 flex items-center justify-center text-gray-500 cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}>
            ?
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute right-[-28px] top-[-80px] w-64 bg-gray-800 text-white p-2 rounded shadow-lg z-10">
              <p className="text-sm">
                Spoof an existing wallet for read-only access. You won't have real access to the wallet.
              </p>
              <div className="absolute bottom-[-6px] right-[10px] w-3 h-3 bg-gray-800 transform rotate-45"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWallet;
