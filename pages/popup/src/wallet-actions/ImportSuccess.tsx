// popup/src/pages/wallet-actions/ImportSuccess.tsx
import { useNavigate } from 'react-router-dom';
import { settingsStorage, onboardingStorage } from '@extension/storage';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';

function ImportSuccess() {
  const navigate = useNavigate();

  const handleFinishOnboardingClick = async () => {
    await settingsStorage.markOnboarded();
    await onboardingStorage.completeOnboarding();
    navigate('/', { replace: true });
  };

  const handleExportAccountClick = () => {
    alert('Export Account not implemented yet.');
  };

  return (
    <div className="h-full flex flex-col items-center text-center">
      <div className="flex-grow flex flex-col justify-center items-center">
        <div className="flex flex-row items-center text-green-600 font-bold mb-4">
          <h2 className="text-3xl mt-2">SUCCESS</h2>
        </div>
        <p className="mb-4">Your wallet was successfully imported.</p>
        <p className="text-center mb-4 text-sm text-gray-500">
          You can export your account details at any time in the settings.
        </p>
      </div>

      <div className="w-full mt-auto space-y-2 flex flex-col items-center">
        <SecondaryButton onClick={handleExportAccountClick} className="w-4/5">
          Export Account
        </SecondaryButton>
        <div className="pt-4 w-full flex justify-center">
          <PrimaryButton onClick={handleFinishOnboardingClick} className="w-4/5">
            Finish Onboarding
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

export default ImportSuccess;
