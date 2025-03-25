import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { PrimaryButton, CancelButton } from '@src/components/buttons';
interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleCreate = () => {
    if (!walletName.trim()) {
      setError('Wallet name is required.');
      return;
    }
    setError('');
    // Replace alert with your wallet creation logic as needed
    alert(`New wallet created: ${walletName}`);
    const newWallet = {
      name: walletName,
      password: walletPassword,
    };
    console.log('Creating new wallet:', newWallet);
    chrome.runtime.sendMessage({ type: 'createNewWallet', newWallet }, response => {
      console.log('Response:', response);
      navigate('/onboarding/create-new-wallet-success');
    });
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">New Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Create a new wallet!</p>

      {/* Input Section */}
      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
          Enter Wallet Name
        </label>
        <input
          type="text"
          id="walletName"
          value={walletName}
          onChange={e => setWalletName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 dark:text-black"
          placeholder="My Wallet"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="mt-4 w-full max-w-sm  dark:text-black-700">
        <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700">
          Optional Password
        </label>
        <input
          type="password"
          id="walletPassword"
          value={walletPassword}
          onChange={e => setWalletPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2 dark:text-black"
          placeholder="Optional password"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-auto flex space-x-4">
        <CancelButton onClick={handleCancel}>Cancel</CancelButton>
        <PrimaryButton onClick={handleCreate}>Create</PrimaryButton>
      </div>
    </div>
  );
};

export default CreateNewWallet;
