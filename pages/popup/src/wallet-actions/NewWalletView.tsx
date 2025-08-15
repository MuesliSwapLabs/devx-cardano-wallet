import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';
import { onboardingStorage } from '@extension/storage';

const AddWallet = () => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);

  // Set onboarding state when this screen loads
  useEffect(() => {
    const updateOnboardingState = async () => {
      await onboardingStorage.goToStep('select-method');
      await onboardingStorage.setCurrentRoute('/add-wallet');
    };
    updateOnboardingState();
  }, []);

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Add Wallet</h2>
      <p className="mt-2">Create/spoof a new wallet or import an existing account!</p>

      {/* New Wallet Section */}
      <div className="mt-10 w-full items-center">
        <div className="mt-2 flex justify-center">
          <PrimaryButton onClick={() => navigate('/create-new-wallet')} className="w-3/5">
            Create New Wallet
          </PrimaryButton>
        </div>
      </div>

      <h3 className="mt-10 text-center text-base text-white-500">or</h3>

      {/* Existing Wallet Section */}
      <div className="mt-10 w-full flex flex-col space-y-4 items-center">
        <SecondaryButton onClick={() => navigate('/import-wallet-from-seed-phrase')} className="w-3/5">
          Import from Seed Phrase
        </SecondaryButton>

        <SecondaryButton onClick={() => alert('not implemented')} className="w-3/5">
          Import from DevX File
        </SecondaryButton>

        <div className="w-3/5 flex items-center relative">
          <SecondaryButton onClick={() => navigate('/spoof-wallet')} className="w-full">
            Spoof Wallet
          </SecondaryButton>

          {/* Help Icon positioned absolute to the right */}
          <div
            className="absolute right-[-24px] w-4 h-4 rounded-full bg-transparent border border-black text-black dark:border-white dark:text-white flex items-center justify-center cursor-help"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}>
            ?
          </div>

          {/* Tooltip */}
          {showTooltip && (
            <div className="absolute right-[-42px] top-[-77px] w-64 bg-gray-800 text-white p-2 dark:border dark:border-white rounded shadow-lg z-10">
              <p className="text-sm">
                Spoof an existing wallet, giving you read-only access to its funds and transactions.
              </p>
              <div className="absolute bottom-[-6px] right-[20px] w-3 h-3 bg-gray-800 dark:border-b dark:border-r dark:border-b-white dark:border-r-white transform rotate-45"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddWallet;
