import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { PrimaryButton, SecondaryButton, CancelButton } from '@src/components/buttons';

const ImportNewWallet = () => {
  const [step, setStep] = useState(1); // 1 = word count, 2 = phrase, 3 = name/password
  const [wordCount, setWordCount] = useState<15 | 24>(15);
  const [seedWords, setSeedWords] = useState<string[]>(Array(15).fill(''));
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skipPassword, setSkipPassword] = useState(false);
  const [seedWordError, setSeedWordError] = useState(false);
  const [walletNameError, setWalletNameError] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isStepValid, setIsStepValid] = useState(true); // For Next button state

  const navigate = useNavigate();

  // Check if current step is valid whenever form inputs change
  useEffect(() => {
    if (step === 1) {
      // Step 1 is always valid as a selection is pre-made
      setIsStepValid(true);
    } else if (step === 2) {
      // Check if all seed words are filled
      const allFilled = seedWords.every(word => word.trim() !== '');
      setIsStepValid(allFilled);
    } else if (step === 3) {
      // Check if wallet name is filled and password requirements are met
      const nameValid = walletName.trim() !== '';
      const passwordsMatch = walletPassword === confirmPassword;
      const passwordValid = skipPassword || (walletPassword.trim() !== '' && passwordsMatch);

      setIsStepValid(nameValid && passwordValid);

      // Clear or set password error message based on input
      if (!skipPassword && walletPassword && confirmPassword && !passwordsMatch) {
        setPasswordError('Passwords do not match. Please check and try again.');
      } else {
        setPasswordError('');
      }
    }
  }, [step, seedWords, walletName, walletPassword, confirmPassword, skipPassword]);

  const handleWordCountChange = (count: 15 | 24) => {
    setWordCount(count);
    setSeedWords(Array(count).fill(''));
    setSeedWordError(false);
  };

  const handleSeedWordChange = (index: number, value: string) => {
    const updated = [...seedWords];
    updated[index] = value.trim();
    setSeedWords(updated);
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

  const handleNext = () => {
    if (step === 2) {
      const hasEmpty = seedWords.some(word => !word.trim());
      if (hasEmpty) {
        setSeedWordError(true);
        return;
      }
    }

    if (step === 3) {
      if (!walletName.trim()) {
        setWalletNameError(true);
        return;
      }

      if (!skipPassword) {
        if (!walletPassword.trim()) {
          setPasswordError('Password is required unless disabled.');
          return;
        }

        if (walletPassword !== confirmPassword) {
          setPasswordError('Passwords do not match. Please check and try again.');
          return;
        }
      }
    }

    setSeedWordError(false);
    setWalletNameError(false);
    setPasswordError('');
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleImport = () => {
    if (!walletName.trim()) {
      setWalletNameError(true);
      return;
    }

    if (!skipPassword) {
      if (!walletPassword.trim()) {
        setPasswordError('Password is required unless disabled.');
        return;
      }

      if (walletPassword !== confirmPassword) {
        setPasswordError('Passwords do not match. Please check and try again.');
        return;
      }
    }

    const seedPhrase = seedWords;
    console.log('Importing with:', {
      wordCount,
      seedPhrase,
      walletName,
      walletPassword: skipPassword ? '' : walletPassword,
      hasPassword: !skipPassword,
    });

    // Simulate import
    // chrome.runtime.sendMessage({ type: 'importNewWallet', seedPhrase }, response => {
    //   navigate('/onboarding/import-wallet-from-seed-phrase-success');
    // });

    alert('Not implemented yet. Redirecting to success anyway.');
    navigate('/onboarding/import-wallet-from-seed-phrase-success');
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  const stepSubtitle = {
    1: 'Choose Wallet Type',
    2: 'Enter Seed Phrase',
    3: 'Enter Wallet Details',
  }[step];

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium mb-1">Import Wallet</h2>
      <p className="text-white text-sm mb-6">
        Step {step}/3 — {stepSubtitle}
      </p>

      {/* Step 1: Choose Word Count */}
      {step === 1 && (
        <div className="flex flex-col items-center">
          <p className="text-center text-gray-600 mb-4">How many words does your seed phrase have?</p>
          <div className="flex space-x-4">
            <button
              onClick={() => handleWordCountChange(15)}
              className={`py-2 px-4 rounded border ${wordCount === 15 ? 'bg-blue-600 text-white' : 'border-gray-400'}`}>
              15 Words
            </button>
            <button
              onClick={() => handleWordCountChange(24)}
              className={`py-2 px-4 rounded border ${wordCount === 24 ? 'bg-blue-600 text-white' : 'border-gray-400'}`}>
              24 Words
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Enter Seed Phrase */}
      {step === 2 && (
        <div className="w-full max-w-sm">
          <p className="text-center text-gray-600 mb-4">Enter your {wordCount}-word seed phrase</p>
          <div className="grid grid-cols-3 gap-2">
            {seedWords.map((word, idx) => (
              <input
                key={idx}
                type="text"
                value={word}
                onChange={e => handleSeedWordChange(idx, e.target.value)}
                className={`p-2 rounded border ${seedWordError && !word.trim() ? 'border-red-500' : 'border-gray-300'} dark:text-black`}
                placeholder={`Word ${idx + 1}`}
              />
            ))}
          </div>
          {seedWordError && <p className="text-red-500 text-sm mt-2">Add all words</p>}
        </div>
      )}

      {/* Step 3: Wallet Details */}
      {step === 3 && (
        <div className="w-full max-w-sm">
          <div className="mb-4">
            <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
              Wallet Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="walletName"
              value={walletName}
              onChange={e => setWalletName(e.target.value)}
              className={`mt-1 block w-full border rounded-md p-2 dark:text-black ${
                walletNameError ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="My Wallet"
            />
            {walletNameError && <p className="text-red-500 text-sm mt-1">Wallet name is required</p>}
          </div>

          <div className="mb-2">
            <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700">
              Password {!skipPassword && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              id="walletPassword"
              value={walletPassword}
              onChange={e => setWalletPassword(e.target.value)}
              disabled={skipPassword}
              className={`mt-1 block w-full border ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              } rounded-md p-2 dark:text-black ${skipPassword ? 'bg-gray-100' : ''}`}
              placeholder={skipPassword ? 'Password disabled' : 'Enter password'}
            />
          </div>

          <div className="mb-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
              Confirm Password {!skipPassword && <span className="text-red-500">*</span>}
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              disabled={skipPassword}
              className={`mt-1 block w-full border ${
                passwordError ? 'border-red-500' : 'border-gray-300'
              } rounded-md p-2 dark:text-black ${skipPassword ? 'bg-gray-100' : ''}`}
              placeholder={skipPassword ? 'Password disabled' : 'Confirm password'}
            />
            {passwordError && <p className="text-red-500 text-sm mt-1">{passwordError}</p>}
          </div>

          {/* Password Skip Option */}
          <div className="mb-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" checked={skipPassword} onChange={handlePasswordToggle} className="w-4 h-4" />
              <span className="text-sm text-gray-700">
                I understand the security risks — create wallet without a password
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-auto space-x-4">
        <CancelButton onClick={handleCancel}>Cancel</CancelButton>
        {step > 1 && <SecondaryButton onClick={handleBack}>Back</SecondaryButton>}
        {step < 3 && (
          <PrimaryButton
            onClick={handleNext}
            disabled={!isStepValid}
            className={!isStepValid ? 'opacity-50 cursor-not-allowed' : ''}>
            Next
          </PrimaryButton>
        )}
        {step === 3 && (
          <PrimaryButton
            onClick={handleImport}
            disabled={!isStepValid}
            className={!isStepValid ? 'opacity-50 cursor-not-allowed' : ''}>
            Import
          </PrimaryButton>
        )}
      </div>
    </div>
  );
};

export default ImportNewWallet;
