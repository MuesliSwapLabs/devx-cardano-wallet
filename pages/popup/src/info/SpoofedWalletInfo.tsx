import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SecondaryButton } from '@src/components/buttons';

const SpoofedWalletInfo = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 min-h-full">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-4">About Spoofed Wallets</h1>

        <div className="space-y-4 text-gray-700 dark:text-gray-300 text-left">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <h2 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Read-Only Access</h2>
            <p className="text-sm">
              Spoofed wallets are read-only wallets that allow you to monitor blockchain activity for any Cardano
              address without having access to the private keys.
            </p>
          </div>

          <div>
            <h2 className="font-semibold mb-2">What you can do:</h2>
            <ul className="list-disc list-outside space-y-1 text-sm ml-6">
              <li>View current balance and assets</li>
              <li>Monitor transaction history</li>
              <li>Track UTXOs</li>
              <li>Watch for incoming transactions</li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold mb-2">What you cannot do:</h2>
            <ul className="list-disc list-outside space-y-1 text-sm ml-6">
              <li>Send ADA or tokens</li>
              <li>Sign transactions</li>
              <li>Interact with DApps</li>
              <li>Access private keys or seed phrases</li>
            </ul>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h2 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">💡 Perfect for:</h2>
            <ul className="list-disc list-outside space-y-1 text-sm ml-6">
              <li>Monitoring cold storage wallets</li>
              <li>Tracking public treasury addresses</li>
              <li>Following other wallets' activity</li>
              <li>Testing and development purposes</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <SecondaryButton onClick={() => navigate(-1)} className="w-full">
          Got it
        </SecondaryButton>
      </div>
    </div>
  );
};

export default SpoofedWalletInfo;
