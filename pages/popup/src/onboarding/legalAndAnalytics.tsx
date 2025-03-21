import { appStateStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LegalAndAnalyticsProps {}

function LegalAndAnalytics({}: LegalAndAnalyticsProps) {
  const navigate = useNavigate();
  const warningIconUrl = chrome.runtime.getURL('warning.svg');

  // Local state for checkbox
  const [acceptedWarning, setAcceptedWarning] = useState(false);
  const [showError, setShowError] = useState(false); // Track if error message should show

  // Load stored value on component mount
  useEffect(() => {
    const storedValue = appStateStorage.getItem('acceptedWarning');
    if (storedValue !== undefined) {
      setAcceptedWarning(storedValue);
    }
  }, []);

  // Toggle function that updates storage
  const handleCheckboxChange = async () => {
    const newValue = !acceptedWarning;
    setAcceptedWarning(newValue);
    setShowError(false); // Hide error when checkbox is checked
    await appStateStorage.setItem('acceptedWarning', newValue); // Persist the change
  };

  // Handle clicking "I Agree"
  const handleAgreeClick = () => {
    if (!acceptedWarning) {
      setShowError(true); // Show error if checkbox is not checked
      return;
    }

    appStateStorage.setItem('onboarding:LegalAndAnalyticsAccepted', true);
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Warning Section */}
      <div className="flex flex-col items-center text-red-600 font-bold mb-4">
        <img src={warningIconUrl} alt="Warning icon" width="40" height="40" />
        <h2 className="text-3xl mt-2">WARNING</h2>
      </div>
      <p className="text-center mb-4">
        DevX is a wallet aimed towards development and is not meant to be used for trading!
      </p>

      {/* Checkbox + Error Message */}
      <div className="flex flex-col">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4" checked={acceptedWarning} onChange={handleCheckboxChange} />
          <span className="text-sm">I understand the warning above.</span>
        </label>

        {showError && <p className="text-red-500 text-sm mt-1">Click the box before continuing.</p>}
      </div>

      {/* Legal & Analytics Section */}
      <h2 className="text-3xl font-bold mt-12 mb-2">Legal & Analytics</h2>
      <p className="mb-1">
        By clicking "I agree," you agree to our
        <a href="#" className="text-blue-600 hover:underline ml-1">
          Terms of Service
        </a>{' '}
        and
        <a href="#" className="text-blue-600 hover:underline ml-1">
          Privacy Policy
        </a>
        .
      </p>

      {/* Buttons */}
      <div className="mt-auto pt-6 flex justify-between space-x-3">
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={handleAgreeClick}>
          I Agree
        </button>
        <button
          className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition"
          onClick={() => navigate('/onboarding')}>
          Back to Onboarding
        </button>
      </div>
    </div>
  );
}

export default LegalAndAnalytics;
