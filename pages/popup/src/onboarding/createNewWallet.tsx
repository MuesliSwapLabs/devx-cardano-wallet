import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton, CancelButton } from '@src/components/buttons';

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skipPassword, setSkipPassword] = useState(false);
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const navigate = useNavigate();

  // Check form validity whenever inputs change
  useEffect(() => {
    const nameValid = walletName.trim() !== '';
    const passwordsMatch = walletPassword === confirmPassword;
    const passwordValid = skipPassword || (walletPassword.trim() !== '' && passwordsMatch);

    setIsFormValid(nameValid && passwordValid);

    // Clear or set password error message based on input
    if (!skipPassword && walletPassword && confirmPassword && !passwordsMatch) {
      setPasswordError('Passwords do not match. Please check and try again.');
    } else {
      setPasswordError('');
    }
  }, [walletName, walletPassword, confirmPassword, skipPassword]);

  const handleCreate = () => {
    // Check for empty wallet name
    if (!walletName.trim()) {
      setNameError('Wallet name is required.');
      return;
    }

    // Check for password requirement
    if (!skipPassword && !walletPassword.trim()) {
      setPasswordError('Password is required unless disabled.');
      return;
    }

    // Final password match check before submission
    if (!skipPassword && walletPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please check and try again.');
      return;
    }

    setNameError('');

    // Create wallet data
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
      // Clear passwords when skipping
      setWalletPassword('');
      setConfirmPassword('');
    }
    setPasswordError('');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">New Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Create a new wallet!</p>

      {/* Input Section */}
      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
          Enter Wallet Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="walletName"
          value={walletName}
          onChange={e => setWalletName(e.target.value)}
          className={`mt-1 block w-full border ${nameError ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 dark:text-black`}
          placeholder="My Wallet"
        />
        {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
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
          className={`mt-1 block w-full border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 dark:text-black ${skipPassword ? 'bg-gray-100' : ''}`}
          placeholder={skipPassword ? 'Password disabled' : 'Enter password'}
        />
      </div>

      <div className="mt-2 w-full max-w-sm">
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password {!skipPassword && <span className="text-red-500">*</span>}
        </label>
        <input
          type="password"
          id="confirmPassword"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          disabled={skipPassword}
          className={`mt-1 block w-full border ${passwordError ? 'border-red-500' : 'border-gray-300'} rounded-md p-2 dark:text-black ${skipPassword ? 'bg-gray-100' : ''}`}
          placeholder={skipPassword ? 'Password disabled' : 'Confirm password'}
        />
        {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
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
