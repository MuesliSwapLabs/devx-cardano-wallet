import React from 'react';
import { useNavigate } from 'react-router-dom';

interface AddWalletProps {}

const AddWallet = ({}: AddWalletProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Add Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Create/spoof a new wallet or import an existing account!</p>

      {/* New Wallet Section */}
      <div className="mt-6 w-full max-w-md">
        <h3 className="text-center text-base text-gray-500">New Wallet</h3>
        <div className="mt-2 flex justify-center">
          <button
            onClick={() => navigate('/onboarding/create-new-wallet')}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
            Create New Wallet
          </button>
        </div>
      </div>

      {/* Existing Wallet Section */}
      <div className="mt-6 w-full max-w-md">
        <h3 className="text-center text-base text-gray-500">Existing Wallet</h3>
        <div className="mt-2 flex flex-col space-y-4 items-center">
          <button
            onClick={() => alert('not implemented')}
            className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
            Import from Seed Phrase
          </button>
          <button
            onClick={() => alert('not implemented')}
            className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
            Import from DevX File
          </button>
          <button
            onClick={() => alert('not implemented')}
            className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
            Spoof Wallet
          </button>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex space-x-4">
        <button
          onClick={() => navigate('/onboarding')}
          className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition">
          Back
        </button>
        <button
          onClick={() => alert('not implemented')}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition">
          Next
        </button>
      </div>
    </div>
  );
};

export default AddWallet;
