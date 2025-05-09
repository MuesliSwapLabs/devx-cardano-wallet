import { appStateStorage } from '@extension/storage';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '@src/components/buttons';

interface LegalAndAnalyticsProps {}

function LegalAndAnalytics({}: LegalAndAnalyticsProps) {
  const navigate = useNavigate();
  const warningIconUrl = chrome.runtime.getURL('warning.svg');
  const [countdown, setCountdown] = useState(4);
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
    appStateStorage.setItem('onboarding:LegalAndAnalyticsAccepted', true);
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Warning Section */}
      <div className="flex flex-col items-center text-red-600 font-bold mb-4">
        <img src={warningIconUrl} alt="Warning icon" width="40" height="40" />
        <h2 className="text-3xl mt-2">WARNING</h2>
      </div>

      <p className="text-center mb-4">DevX is a wallet aimed at developers and is not meant to be used for trading!</p>

      <p className="text-center mb-6">
        We assume no liability for damages arising from the use of this product/service.
      </p>

      {/* Legal Text */}
      <p className="mt-12 mb-1 text-center">
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

      {/* Button centered with countdown */}
      <div className="w-full mt-auto pt-6 flex justify-center">
        <PrimaryButton
          onClick={handleAgreeClick}
          disabled={!buttonEnabled}
          className={!buttonEnabled ? 'opacity-50 cursor-not-allowed' : ''}>
          {buttonEnabled ? 'I Agree' : `I Agree (${countdown})`}
        </PrimaryButton>
      </div>
    </div>
  );
}

export default LegalAndAnalytics;
