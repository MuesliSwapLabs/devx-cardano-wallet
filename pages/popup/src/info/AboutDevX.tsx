import { useNavigate } from 'react-router-dom';
import { SecondaryButton } from '@src/components/buttons';

const AboutDevX = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full p-6">
      <div className="mb-8">
        <h1 className="mb-4 text-2xl font-bold">About DevX Wallet</h1>

        <div className="space-y-4 text-left text-gray-700 dark:text-gray-300">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
            <h2 className="mb-2 font-semibold text-blue-800 dark:text-blue-200">Developer Tool</h2>
            <p className="text-sm">
              DevX Wallet is a developer-focused tool for inspecting and monitoring Cardano wallets. It is not designed
              for sending or receiving transactions.
            </p>
          </div>

          <div>
            <h2 className="mb-2 font-semibold">What you can do:</h2>
            <ul className="ml-6 list-outside list-disc space-y-1 text-sm">
              <li>View wallet balances and assets</li>
              <li>Inspect transaction history</li>
              <li>Analyze UTXOs in detail</li>
              <li>Monitor multiple wallets</li>
              <li>Test dApp integrations via CIP-30</li>
            </ul>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <h2 className="mb-2 font-semibold">Receiving funds</h2>
            <p className="text-sm">
              While DevX Wallet doesn't have a send/receive UI, you can still receive funds by sharing your wallet
              address. Go to <span className="font-medium">Wallet Settings</span> to view and copy your addresses.
            </p>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
            <h2 className="mb-2 font-semibold text-yellow-800 dark:text-yellow-200">Not for production use</h2>
            <p className="text-sm">
              This wallet is intended for development and testing purposes. Do not use it to store significant funds.
            </p>
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

export default AboutDevX;
