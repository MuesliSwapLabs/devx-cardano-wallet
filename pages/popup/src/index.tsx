import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import '@src/index.css'; // We'll update this CSS below
import { useStorage } from '@extension/shared';
import { exampleThemeStorage, appStateStorage } from '@extension/storage';
import Popup from '@src/Popup';
import Onboarding from '@src/Onboarding';

const ThemeToggle = () => {
  const theme = useStorage(exampleThemeStorage);
  const isDark = theme === 'dark';

  return (
    <label
      htmlFor="theme-toggle"
      className="relative inline-block h-8 w-14 cursor-pointer rounded-full bg-gray-300 transition dark:bg-gray-600">
      <input
        type="checkbox"
        id="theme-toggle"
        className="peer sr-only"
        checked={isDark}
        onChange={() => exampleThemeStorage.toggle()}
      />
      <span className="absolute inset-y-0 start-0 m-1 size-6 rounded-full bg-white transition-all peer-checked:translate-x-6"></span>
    </label>
  );
};

function Root() {
  const theme = useStorage(exampleThemeStorage);
  const appState = useStorage(appStateStorage);
  const isDark = theme === 'dark';
  const iconUrl = isDark ? chrome.runtime.getURL('icon-dark.svg') : chrome.runtime.getURL('icon-light.svg');

  // Single source of truth for onboardingStep
  const [currentStep, setCurrentStep] = useState(() => {
    const storedStep = appStateStorage.getItem('onboardingStep');
    return storedStep !== undefined ? storedStep : 0;
  });

  // Function to move to the previous step
  const goToPreviousStep = async () => {
    const newStep = Math.max(0, currentStep - 1);
    setCurrentStep(newStep);
    await appStateStorage.setItem('onboardingStep', newStep);
  };

  // Function to update the step globally
  const goToNextStep = async () => {
    const newStep = currentStep + 1;
    setCurrentStep(newStep);
    await appStateStorage.setItem('onboardingStep', newStep);
  };

  const finishOnboarding = async () => {
    goToNextStep();
    await appStateStorage.setItem('onboarded', true);
  };

  // Function to reset onboarding step to 0
  const resetOnboarding = async () => {
    await appStateStorage.setItem('onboardingStep', 0);
    appStateStorage.unmarkOnboarded();
    setCurrentStep(0);
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="App dark:bg-gray-800 bg-slate-50 dark:text-white text-black flex flex-col h-screen">
        <header className="App-header flex items-center justify-between px-4 py-3">
          <img src={iconUrl} alt="icon" width="34" height="34" />
          <span className="mx-auto text-lg font-semibold">Welcome</span>
          <div className="scale-50 flex items-center">
            <ThemeToggle />
          </div>
        </header>

        <main className="p-4 flex-1 overflow-auto">
          {appState.onboarded ? (
            <Popup />
          ) : (
            // Pass currentStep and goToNextStep as props to Onboarding
            <Onboarding
              currentStep={currentStep}
              goToPreviousStep={goToPreviousStep}
              goToNextStep={goToNextStep}
              finishOnboarding={finishOnboarding}
            />
          )}
        </main>

        <footer className="App-footer p-4 border-t text-center">
          Current Step: {currentStep}
          <br />
          <button onClick={resetOnboarding}>Reset Onboarding</button>
        </footer>
      </div>
    </div>
  );
}

function init() {
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    throw new Error('Cannot find #app-container');
  }

  const root = createRoot(appContainer);
  root.render(<Root />);
}

init();
