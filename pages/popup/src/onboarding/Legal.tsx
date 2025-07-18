import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// Import the unified settingsStorage
import { settingsStorage } from '@extension/storage';
import { PrimaryButton } from '@src/components/buttons';

/**
 * Legal is the component that shows the legal disclaimers
 * and terms of service links during onboarding.
 */
function Legal() {
  const navigate = useNavigate();
  const warningIconUrl = chrome.runtime.getURL('warning.svg');
  const [countdown, setCountdown] = useState(1);
  const [buttonEnabled, setButtonEnabled] = useState(false);

  // Start countdown on component mount
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prevCount => {
        if (prevCount <= 1) {
          clearInterval(timer);
          setButtonEnabled(true);
          return 0;
        }
        return prevCount - 1;
      });
    }, 1000);

    // Clean up timer on unmount
    return () => clearInterval(timer);
  }, []);

  // Handle clicking "I Agree"
  const handleAgreeClick = () => {
    // Use the convenience method on our new settings storage
    settingsStorage.markLegalAccepted();
    // Navigate to the next step in the onboarding flow
    navigate('/add-wallet');
  };

  return (
    <div className="flex flex-col items-center min-h-full">
      {/* Centered Warning and Text */}
      <div className="flex flex-col items-center flex-grow">
        {/* Warning Section */}
        <div className="flex flex-col items-center text-red-600 font-bold mb-4">
          <img src={warningIconUrl} alt="Warning icon" width="40" height="40" />
          <h2 className="text-3xl mt-2">WARNING</h2>
        </div>

        <p className="text-center mb-4">
          DevX is a wallet aimed at developers and is not meant to be used for trading!
        </p>

        <p className="text-center mb-6">
          We assume no liability for damages arising from the use of this product/service.
        </p>
      </div>

      {/* Bottom Section: Legal Text and Button */}
      <div className="w-full mt-auto flex flex-col items-center">
        {/* Legal Text at the very bottom */}
        <p className="text-center mt-4 mb-4">
          By continuing, you agree to our
          <a href="#" className="text-blue-600 hover:underline ml-1">
            Terms of Service
          </a>{' '}
          and
          <a href="#" className="text-blue-600 hover:underline ml-1">
            Privacy Policy
          </a>
          .
        </p>

        {/* Button */}
        <div className="w-full flex justify-center">
          <PrimaryButton
            onClick={handleAgreeClick}
            disabled={!buttonEnabled}
            className={!buttonEnabled ? 'opacity-50 cursor-not-allowed' : ''}>
            {buttonEnabled ? 'I Agree' : `I Agree (${countdown})`}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default Legal;
