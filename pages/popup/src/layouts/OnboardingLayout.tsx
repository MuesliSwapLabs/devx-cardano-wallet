// popup/src/layouts/OnboardingLayout.tsx
import { Outlet } from 'react-router-dom';
import { useStorage, settingsStorage, onboardingStorage } from '@extension/storage';
import ThemeToggle from '../components/themeToggle';

function OnboardingLayout({ children }) {
  // Use the new unified settings storage
  const settings = useStorage(settingsStorage);
  const onboardingState = useStorage(onboardingStorage);
  const isDark = settings?.theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // Get progress from onboarding state, default to 0 if not available
  const progress = onboardingState?.progress || 0;

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 relative border-b border-gray-300 dark:border-gray-600">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <span className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-semibold">Onboarding</span>
        <ThemeToggle />
      </header>
      <main className="p-4 flex-1 overflow-auto">{children ? children : <Outlet />}</main>
      <footer className="p-4 border-t border-gray-300 dark:border-gray-600 text-center">
        <div className="flex justify-center items-center">
          <div className="text-sm">Onboarding Progress ({Math.round(progress)}%)</div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full ml-3 relative">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default OnboardingLayout;
