// popup/src/pages/Settings.tsx
import ThemeToggle from '../components/ThemeToggle';
import { settingsStorage, useStorage, walletsStorage } from '@extension/storage';
import { CancelButton } from '@src/components/buttons';

/**
 * Settings page component.
 * Renders the content for the general application settings.
 */
function Settings() {
  // Use the new settingsStorage to get current settings
  const settings = useStorage(settingsStorage);
  const isMainnet = settings?.network === 'Mainnet';

  const handleResetOnboarding = () => {
    // This is a destructive action, so a confirmation might be wise in a real app.
    if (confirm('Are you sure you want to reset all data? This will delete all your wallets and cannot be undone.')) {
      // Clear the wallets array
      walletsStorage.set([]);
      // Use the convenience method on settingsStorage to reset the onboarding status
      settingsStorage.unmarkOnboarded();
      // The App.tsx component will automatically navigate the user back to onboarding.
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* General Settings */}
      <div>
        <h2 className="text-lg font-medium mb-2">General</h2>
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <span className="font-medium">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Network Settings */}
      <div>
        <h2 className="text-lg font-medium mb-2">Network</h2>
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <span className="font-medium">Active Network</span>

          {/* --- Start of Updated Big Toggle --- */}
          <label
            htmlFor="network-toggle"
            className="relative flex items-center w-44 h-10 rounded-full cursor-pointer p-1"
            style={{ backgroundColor: 'rgb(37, 46, 64)' }}>
            {/* Hidden checkbox to manage state */}
            <input
              type="checkbox"
              id="network-toggle"
              className="sr-only peer"
              checked={isMainnet}
              onChange={() => settingsStorage.toggleNetwork()}
            />

            {/* Sliding Thumb with your custom color */}
            <div
              className="absolute top-1 left-1 w-[calc(50%-4px)] h-8 rounded-full shadow-md transition-transform duration-300 ease-in-out peer-checked:translate-x-full"
              style={{ backgroundColor: 'rgb(83, 70, 255)' }}></div>

            {/* Text Labels with white active color */}
            <div className="relative z-10 w-1/2 text-center text-sm font-bold transition-colors duration-300 peer-checked:text-gray-400 text-white">
              Testnet
            </div>
            <div className="relative z-10 w-1/2 text-center text-sm font-bold transition-colors duration-300 text-gray-400 peer-checked:text-white">
              Mainnet
            </div>
          </label>
          {/* --- End of Updated Big Toggle --- */}
        </div>
      </div>

      {/* Danger Zone */}
      <div>
        <h2 className="text-lg font-medium mb-2 text-red-500">Danger Zone</h2>
        <div className="flex flex-col space-y-2 p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Resetting will delete all wallets and application data permanently.
          </p>
          <div className="pt-2">
            <CancelButton onClick={handleResetOnboarding}>Reset All Data</CancelButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
