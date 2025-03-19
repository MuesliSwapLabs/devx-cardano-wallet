import React, { useState } from 'react';

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const [walletName, setWalletName] = useState('');
  const [walletPassword, setWalletPassword] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    if (!walletName.trim()) {
      setError('Wallet name is required.');
      return;
    }
    setError('');
    // Replace alert with your wallet creation logic as needed
    alert(`New wallet created: ${walletName}`);
  };

  const handleAbort = () => {
    // Replace alert with your abort logic if needed
    alert('Abort');
  };

  return (
    <div className="flex flex-col items-center">
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
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          placeholder="My Wallet"
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>

      <div className="mt-4 w-full max-w-sm">
        <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700">
          Optional Password
        </label>
        <input
          type="password"
          id="walletPassword"
          value={walletPassword}
          onChange={e => setWalletPassword(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md p-2"
          placeholder="Optional password"
        />
      </div>

      {/* Navigation Buttons */}
      <div className="mt-6 flex space-x-4">
        <button onClick={handleCreate} className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
          Create
        </button>
        <button onClick={handleAbort} className="bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition">
          Abort
        </button>
      </div>
    </div>
  );
};

export default CreateNewWallet;
