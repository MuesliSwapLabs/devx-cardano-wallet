import { useNavigate } from 'react-router-dom';
import { useStorage } from '@extension/shared';
import { appStateStorage } from '@extension/storage';

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
      <div className="mt-auto pt-6 flex flex-col justify-between space-y-4">
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={handleExportSeedPhraseClick}>
          Export Seed Phrase
        </button>
        <button
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          onClick={handleExportAccountClick}>
          Export Account
        </button>
        <button
          className="bg-gray-300 py-2 px-4 rounded hover:bg-gray-400 transition"
          onClick={handleFinishOnboardingClick}>
          Finish Onboarding
        </button>
      </div>
    </div>
  );
}

export default CreateNewWalletSuccess;
