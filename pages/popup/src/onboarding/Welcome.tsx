import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PrimaryButton } from '../components/buttons';
import { devxSettings } from '@extension/storage';

/**
 * Welcome is the initial landing page for the onboarding flow.
 * Its only job is to display a welcome message and navigate the user
 * to the next step (the legal screen).
 */
const Welcome = () => {
  const navigate = useNavigate();
  const [testResult, setTestResult] = useState<string>('');

  // Initialize onboarding on mount
  useEffect(() => {
    const initOnboarding = async () => {
      await devxSettings.startOnboarding();
      await devxSettings.goToStep('welcome');
    };
    initOnboarding();
  }, []);

  // Test offscreen WASM functionality
  const testOffscreenWasm = async () => {
    setTestResult('Testing...');
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TEST_OFFSCREEN_WASM',
      });

      console.log('Response from background:', response);

      if (!response) {
        setTestResult('❌ No response from background script');
        return;
      }

      if (response.success) {
        setTestResult(`✅ Success! Generated root key: ${response.rootKey?.slice(0, 16)}...`);
      } else {
        setTestResult(`❌ Error: ${response.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Frontend error:', error);
      setTestResult(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="flex h-full flex-col items-center text-center">
      <div className="flex grow flex-col justify-center">
        <h1 className="text-2xl font-bold">Welcome!</h1>
        <p className="mt-2">Thank you for installing DevX wallet.</p>
        <p className="mt-2">
          DevX is a wallet created for developers. Its goal is to create an easy way for developers to interact with the
          blockchain.
        </p>

        {/* Development Test Section */}
        <div className="mt-6 rounded border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
          <p className="text-sm font-medium">Development Test</p>
          <button
            onClick={testOffscreenWasm}
            className="mt-2 rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
            disabled={testResult === 'Testing...'}>
            Test Offscreen WASM
          </button>
          {testResult && <p className="mt-2 text-xs break-words">{testResult}</p>}
        </div>
      </div>

      <div className="mt-auto w-full pt-6">
        <PrimaryButton
          onClick={async () => {
            await devxSettings.goToStep('legal');
            navigate('/onboarding/legal');
          }}
          className="w-full">
          Continue
        </PrimaryButton>
      </div>
    </div>
  );
};

export default Welcome;
