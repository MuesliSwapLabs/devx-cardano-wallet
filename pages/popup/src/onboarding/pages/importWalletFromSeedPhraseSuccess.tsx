import { useNavigate } from 'react-router-dom';
import { useStorage, appStateStorage } from '@extension/storage';

import { PrimaryButton, SecondaryButton } from '@src/components/buttons';

function CreateNewWalletSuccess() {
  const navigate = useNavigate();
  //const warningIconUrl = chrome.runtime.getURL('warning.svg');
  const appState = useStorage(appStateStorage);

  // TODO: Implement
  const handleExportSeedPhraseClick = () => {
    alert('handleExportSeedPhraseClick not implemented yet.');
  };

  // TODO: Implement
  const handleExportAccountClick = () => {
    alert('handleExportAccountClick not implemented yet.');
  };

  const handleFinishOnboardingClick = async () => {
    await appStateStorage.markOnboarded();
    navigate('/');
  };

  return (
    <div className="h-full flex flex-col items-center">
      {/* Warning Section */}
      <div className="flex flex-row items-center text-green-600 font-bold mb-4">
        {/* <img src={warningIconUrl} alt="Warning icon" width="40" height="40" /> */}
        <h2 className="text-3xl mt-2">SUCCESS</h2>
      </div>
      <p className="text-center mb-4">Your wallet was successfully imported.</p>
      <p className="text-center mb-4">Export the seed phrase or the whole wallet (includes seed phrase)</p>
      <p className="text-center mb-4">You can do that later on at any time</p>

      {/* Buttons */}
      <div className="w-full mt-auto space-y-2">
        <SecondaryButton onClick={handleExportSeedPhraseClick} className="w-3/5">
          Export Seed Phrase
        </SecondaryButton>
        <SecondaryButton onClick={handleExportAccountClick} className="w-3/5">
          Export Account
        </SecondaryButton>
      </div>
      <div className="w-full mt-auto space-y-2">
        <PrimaryButton onClick={handleFinishOnboardingClick} className="w-3/5">
          Finish Onboarding
        </PrimaryButton>
      </div>
    </div>
  );
}

export default CreateNewWalletSuccess;
