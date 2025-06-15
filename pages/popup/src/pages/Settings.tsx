// popup/src/pages/Settings.tsx
import ThemeToggle from '../components/ThemeToggle';
import { walletsStorage, appStateStorage } from '@extension/storage';
import { CancelButton } from '@src/components/buttons';

/**
 * Settings page component.
 * Renders the content for the general application settings.
 */
function Settings() {
  const handleResetOnboarding = () => {
    // This is a destructive action, so a confirmation might be wise in a real app.
    if (confirm('Are you sure you want to reset all data? This will delete all your wallets and cannot be undone.')) {
      // Clear the wallets array
      walletsStorage.set([]);
      // Reset the onboarding status
      appStateStorage.set({ onboarded: false });
      // The Root component will automatically navigate the user back to onboarding.
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      <div>
        <h2 className="text-lg font-medium mb-2">General</h2>
        <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <span className="font-medium">Theme</span>
          <ThemeToggle />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium mb-2 text-red-500">Danger Zone</h2>
        <div className="flex flex-col space-y-2 p-4 bg-white dark:bg-gray-700 rounded-lg shadow">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Resetting will delete all wallets and application data permanently.
          </p>
          <div className="pt-2">
            <CancelButton onClick={handleResetOnboarding}>Reset Onboarding & Wallets</CancelButton>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
