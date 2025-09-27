// popup/src/layouts/OnboardingLayout.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { useStorage, devxSettings } from '@extension/storage';
import ThemeToggle from '../components/themeToggle';

function OnboardingLayout() {
  // Use the unified settings storage
  const settings = useStorage(devxSettings);
  const location = useLocation();
  const isDark = settings?.theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // Calculate progress from current URL
  const calculateProgress = (pathname: string): number => {
    if (pathname === '/onboarding' || pathname === '/onboarding/') return 0;
    if (pathname === '/onboarding/legal') return 20;
    if (pathname === '/add-wallet') return 40;
    if (pathname.includes('/create-') || pathname.includes('/import-') || pathname.includes('/spoof-')) {
      if (pathname.includes('/api-key')) return 80;
      if (pathname.includes('/success')) return 90;
      return 60; // form pages
    }
    return 0;
  };

  const progress = calculateProgress(location.pathname);

  return (
    <>
      <header className="relative flex items-center justify-between border-b border-gray-300 px-4 py-3 dark:border-gray-600">
        <img src={iconUrl} alt="icon" width="34" height="34" />
        <span className="absolute left-1/2 -translate-x-1/2 text-2xl font-semibold">Onboarding</span>
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
      <footer className="border-t border-gray-300 p-4 text-center dark:border-gray-600">
        <div className="flex items-center justify-center">
          <div className="text-sm">Onboarding Progress ({Math.round(progress)}%)</div>
          <div className="relative ml-3 h-2 w-32 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 rounded-full bg-blue-500 transition-all duration-300 ease-in-out"
              style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default OnboardingLayout;
