// popup/src/layouts/OnboardingLayout.tsx
import { Outlet } from 'react-router-dom';
import { useStorage, exampleThemeStorage } from '@extension/storage';
import ThemeToggle from '../components/ThemeToggle';

/**
 * OnboardingLayout is now a simpler "shell" component.
 * It provides the consistent header and footer for any nested route.
 */
function OnboardingLayout({ children }) {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  return (
    <>
      <header className="flex items-center justify-between px-4 py-3 relative border-b border-gray-300 dark:border-gray-600">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <span className="absolute left-1/2 transform -translate-x-1/2 text-2xl font-semibold">Onboarding</span>
        <ThemeToggle />
      </header>

      {/* The <Outlet> now renders the specific page component (e.g., AddWallet) from App.tsx */}
      <main className="p-4 flex-1 overflow-auto">{children ? children : <Outlet />}</main>

      <footer className="p-4 border-t border-gray-300 dark:border-gray-600 text-center">
        <div className="flex justify-center items-center">
          <div className="text-sm">Onboarding Progress</div>
          <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full ml-3">
            <div className="h-2 bg-blue-500 rounded-full" style={{ width: '50%' }}></div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default OnboardingLayout;
