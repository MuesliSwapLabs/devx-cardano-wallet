import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, CancelButton } from '@src/components/buttons';

const SpoofWallet = () => {
  const [walletName, setWalletName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [walletNameError, setWalletNameError] = useState('');
  const [walletAddressError, setWalletAddressError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);

  const navigate = useNavigate();

  // Check form validity whenever input changes
  useEffect(() => {
    const nameValid = walletName.trim() !== '';
    const addressValid = walletAddress.trim() !== '';

    // Both fields are mandatory
    setIsFormValid(nameValid && addressValid);
  }, [walletName, walletAddress]);

  const handleSpoofWallet = () => {
    let hasError = false;

    if (!walletName.trim()) {
      setWalletNameError('Wallet name is required.');
      hasError = true;
    } else {
      setWalletNameError('');
    }

    if (!walletAddress.trim()) {
      setWalletAddressError('Wallet address is required.');
      hasError = true;
    } else {
      setWalletAddressError('');
    }

    if (hasError) return;

    const spoofedWallet = {
      name: walletName,
      address: walletAddress,
      hasPassword: false,
    };

    //TODO: Implement
    // chrome.runtime.sendMessage({ type: 'SpoofWallet', spoofedWallet }, response => {
    //   navigate('/onboarding/spoof-wallet-success');
    // });

    alert('Not implemented yet. Redirecting to success anyway.');
    navigate('/onboarding/spoof-wallet-success'); // remove this line when implementing the above
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Spoof a wallet!</p>

      {/* Wallet Name */}
      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
          Wallet Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="walletName"
          value={walletName}
          onChange={e => setWalletName(e.target.value)}
          className={`mt-1 block w-full border ${walletNameError ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 dark:text-black`}
          placeholder="My Wallet"
        />
        {walletNameError && <p className="text-red-500 text-sm mt-1">{walletNameError}</p>}
      </div>

      {/* Wallet Address */}
      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
          Wallet Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="walletAddress"
          value={walletAddress}
          onChange={e => setWalletAddress(e.target.value)}
          className={`mt-1 block w-full border ${walletAddressError ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 dark:text-black`}
          placeholder="Wallet Address"
        />
        {walletAddressError && <p className="text-red-500 text-sm mt-1">{walletAddressError}</p>}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-auto flex space-x-4">
        <CancelButton onClick={handleCancel}>Cancel</CancelButton>
        <PrimaryButton
          onClick={handleSpoofWallet}
          disabled={!isFormValid}
          className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}>
          Spoof Wallet
        </PrimaryButton>
      </div>
    </div>
  );
};

export default SpoofWallet;
