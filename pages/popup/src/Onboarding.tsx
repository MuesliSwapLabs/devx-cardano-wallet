import { useState } from 'react';
import { appStateStorage } from '@extension/storage';

const Page1 = () => (
  <div>
    <h2>Welcome!</h2>
    <p>This is step 1.</p>
  </div>
);
const Page2 = () => (
  <div>
    <h2>Profile Setup</h2>
    <p>This is step 2.</p>
  </div>
);
const Page3 = () => (
  <div>
    <h2>Preferences</h2>
    <p>This is step 3.</p>
  </div>
);
const Page4 = () => (
  <div>
    <h2>Additional Info</h2>
    <p>This is step 4.</p>
  </div>
);
const Page5 = () => (
  <div>
    <h2>Summary</h2>
    <p>This is step 5.</p>
  </div>
);

const Onboarding = () => {
  const [step, setStep] = useState(0);

  const pages = [<Page1 />, <Page2 />, <Page3 />, <Page4 />, <Page5 />];

  const nextStep = () => {
    if (step < pages.length - 1) {
      setStep(step + 1);
    } else {
      // Final step reached, mark as onboarded
      appStateStorage.markOnboarded();
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div>
      {/* Render the current page */}
      {pages[step]}

      <div style={{ marginTop: '20px' }}>
        {step > 0 && <button onClick={prevStep}>Back</button>}
        <button onClick={nextStep} style={{ marginLeft: '10px' }}>
          {step === pages.length - 1 ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default Onboarding;
