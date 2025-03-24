import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ImportNewWallet = () => {
  const [step, setStep] = useState(1); // 1 = word count, 2 = phrase, 3 = name/password
  const [wordCount, setWordCount] = useState<15 | 24>(15);
  const [seedWords, setSeedWords] = useState<string[]>(Array(15).fill(''));
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [seedWordError, setSeedWordError] = useState(false);
  const [walletNameError, setWalletNameError] = useState(false);

  const navigate = useNavigate();

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
    }

    setSeedWordError(false);
    setWalletNameError(false);
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

    const seedPhrase = seedWords;
    console.log('Importing with:', {
      wordCount,
      seedPhrase,
      walletName,
      walletPassword,
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
    <div className="flex flex-col items-center">
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
              Wallet Name
            </label>
            <input
              type="text"
              id="walletName"
              value={walletName}
              onChange={e => setWalletName(e.target.value)}
              className={`mt-1 block w-full border rounded-md p-2 dark:text-black ${
                walletNameError && !walletName.trim() ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="My Wallet"
            />
            {walletNameError && <p className="text-red-500 text-sm mt-1">Wallet name is required</p>}
          </div>

          <div>
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
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="mt-6 flex space-x-4">
        {step > 1 && (
          <button onClick={handleBack} className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
            Back
          </button>
        )}
        {step < 3 && (
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
            Next
          </button>
        )}
        {step === 3 && (
          <button
            onClick={handleImport}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition">
            Import
          </button>
        )}
        <button onClick={handleCancel} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition">
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ImportNewWallet;
