import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, CancelButton } from '@src/components/buttons';

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [skipPassword, setSkipPassword] = useState(false);
  const [error, setError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  // Check form validity whenever inputs change
  useEffect(() => {
    const nameValid = walletName.trim() !== '';
    const passwordValid = skipPassword || walletPassword.trim() !== '';
    setIsFormValid(nameValid && passwordValid);
  }, [walletName, walletPassword, skipPassword]);

  const handleCreate = () => {
    if (!walletName.trim()) {
      setError('Wallet name is required.');
      return;
    }

    if (!skipPassword && !walletPassword.trim()) {
      setError('Password is required unless disabled.');
      return;
    }

    setError('');
    // Replace alert with your wallet creation logic as needed
    alert(`New wallet created: ${walletName}`);
    const newWallet = {
      name: walletName,
      password: skipPassword ? '' : walletPassword,
      hasPassword: !skipPassword,
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

  const handlePasswordToggle = () => {
    setSkipPassword(!skipPassword);
    if (!skipPassword) {
      // Clear password when skipping
      setWalletPassword('');
    }
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
      </div>

      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700">
          Password {!skipPassword && <span className="text-red-500">*</span>}
        </label>
        <input
          type="password"
          id="walletPassword"
          value={walletPassword}
          onChange={e => setWalletPassword(e.target.value)}
          disabled={skipPassword}
          className={`mt-1 block w-full border border-gray-300 rounded-md p-2 dark:text-black ${skipPassword ? 'bg-gray-100' : ''}`}
          placeholder={skipPassword ? 'Password disabled' : 'Enter password'}
        />
      </div>

      {/* Password Skip Option */}
      <div className="mt-2 w-full max-w-sm">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" checked={skipPassword} onChange={handlePasswordToggle} className="w-4 h-4" />
          <span className="text-sm text-gray-700">
            I understand the security risks — create wallet without a password
          </span>
        </label>
      </div>

      {error && <p className="text-red-500 text-sm mt-3 w-full max-w-sm">{error}</p>}

      {/* Navigation Buttons */}
      <div className="mt-auto flex space-x-4">
        <CancelButton onClick={handleCancel}>Cancel</CancelButton>
        <PrimaryButton
          onClick={handleCreate}
          disabled={!isFormValid}
          className={!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}>
          Create
        </PrimaryButton>
      </div>
    </div>
  );
};

export default CreateNewWallet;
