import { useState } from 'react';
import { Formik, Form, Field } from 'formik';
import ThemeToggle from './components/themeToggle';
import { settingsStorage, useStorage, walletsStorage } from '@extension/storage';
import { CancelButton } from '@src/components/buttons';
import FloatingLabelInput from './components/FloatingLabelInput';
import { ChevronUpIcon, ChevronDownIcon, TrashIcon } from '@heroicons/react/24/outline';

// --- Helper Functions (unchanged) ---
const maskApiKey = (key: string): string => {
  if (!key) return '';
  if (key.startsWith('mainnet')) {
    return key.substring(0, 13) + '********************';
  }
  if (key.startsWith('preprod')) {
    return key.substring(0, 12) + '********************';
  }
  return '********************';
};

const isValidBlockfrostKey = (key: string, network: 'Mainnet' | 'Preprod'): boolean => {
  if (!key) return false;
  const prefix = network === 'Mainnet' ? 'mainnet' : 'preprod';
  const expectedLength = 32;
  if (!key.startsWith(prefix)) return false;
  const secretPart = key.substring(prefix.length);
  if (secretPart.length !== expectedLength) return false;
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(secretPart);
};

// --- Main Settings Component ---
function Settings() {
  const settings = useStorage(settingsStorage);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);

  const handleDelete = (network: 'Mainnet' | 'Preprod') => {
    if (confirm(`Are you sure you want to delete the ${network} API key?`)) {
      if (network === 'Mainnet') {
        settingsStorage.setMainnetApiKey('');
      } else {
        settingsStorage.setPreprodApiKey('');
      }
    }
  };

  const handleResetOnboarding = () => {
    if (confirm('Are you sure you want to reset all data? This will delete all your wallets and cannot be undone.')) {
      walletsStorage.set([]);
      settingsStorage.unmarkOnboarded();
    }
  };

  if (!settings) {
    return null;
  }

  const mainnetKeyExists = !!settings.mainnetApiKey;
  const preprodKeyExists = !!settings.preprodApiKey;

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

      {/* Blockfrost API Keys Section */}
      <div>
        <h2 className="text-lg font-medium mb-2">Blockfrost API Keys</h2>
        <div className="flex flex-col space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          {/* --- Mainnet API Key --- */}
          <div>
            {mainnetKeyExists ? (
              // --- DISPLAY MODE ---
              <div className="flex items-center space-x-2">
                <div className="flex-grow">
                  <FloatingLabelInput
                    label="Mainnet API Key"
                    name="mainnetApiKey_display"
                    value={maskApiKey(settings.mainnetApiKey || '')}
                    disabled={true}
                  />
                </div>
                <button type="button" onClick={() => handleDelete('Mainnet')} className="p-1">
                  <TrashIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ) : (
              // --- INPUT MODE ---
              <Formik
                initialValues={{ mainnetInput: '' }}
                validate={values => {
                  if (values.mainnetInput && !isValidBlockfrostKey(values.mainnetInput, 'Mainnet')) {
                    return { mainnetInput: 'Invalid API key format' };
                  }
                  return {};
                }}
                // --- START OF CHANGE ---
                onSubmit={values => {
                  // This is triggered by the "Enter" key
                  if (isValidBlockfrostKey(values.mainnetInput, 'Mainnet')) {
                    settingsStorage.setMainnetApiKey(values.mainnetInput);
                  }
                }}>
                {/* --- END OF CHANGE --- */}
                {({ values, errors, handleBlur }) => (
                  <Form>
                    <Field name="mainnetInput">
                      {({ field }: any) => (
                        <FloatingLabelInput
                          {...field}
                          // This is triggered by defocusing (clicking away)
                          onBlur={e => {
                            handleBlur(e);
                            if (isValidBlockfrostKey(field.value, 'Mainnet')) {
                              settingsStorage.setMainnetApiKey(field.value);
                            }
                          }}
                          label="Mainnet API Key"
                          type="password"
                          error={!!errors.mainnetInput}
                        />
                      )}
                    </Field>
                    <div className="h-4 pt-1 px-1 text-xs">
                      {errors.mainnetInput ? (
                        <span className="text-red-500">{errors.mainnetInput}</span>
                      ) : (
                        values.mainnetInput && <span className="text-green-500">Correct format</span>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>

          {/* --- Preprod API Key --- */}
          <div>
            {preprodKeyExists ? (
              // --- DISPLAY MODE ---
              <div className="flex items-center space-x-2">
                <div className="flex-grow">
                  <FloatingLabelInput
                    label="Preprod API Key"
                    name="preprodApiKey_display"
                    value={maskApiKey(settings.preprodApiKey || '')}
                    disabled={true}
                  />
                </div>
                <button type="button" onClick={() => handleDelete('Preprod')} className="p-1">
                  <TrashIcon className="h-5 w-5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ) : (
              // --- INPUT MODE ---
              <Formik
                initialValues={{ preprodInput: '' }}
                validate={values => {
                  if (values.preprodInput && !isValidBlockfrostKey(values.preprodInput, 'Preprod')) {
                    return { preprodInput: 'Invalid API key format' };
                  }
                  return {};
                }}
                // --- START OF CHANGE ---
                onSubmit={values => {
                  // This is triggered by the "Enter" key
                  if (isValidBlockfrostKey(values.preprodInput, 'Preprod')) {
                    settingsStorage.setPreprodApiKey(values.preprodInput);
                  }
                }}>
                {/* --- END OF CHANGE --- */}
                {({ values, errors, handleBlur }) => (
                  <Form>
                    <Field name="preprodInput">
                      {({ field }: any) => (
                        <FloatingLabelInput
                          {...field}
                          // This is triggered by defocusing (clicking away)
                          onBlur={e => {
                            handleBlur(e);
                            if (isValidBlockfrostKey(field.value, 'Preprod')) {
                              settingsStorage.setPreprodApiKey(field.value);
                            }
                          }}
                          label="Preprod API Key"
                          type="password"
                          error={!!errors.preprodInput}
                        />
                      )}
                    </Field>
                    <div className="h-4 pt-1 px-1 text-xs">
                      {errors.preprodInput ? (
                        <span className="text-red-500">{errors.preprodInput}</span>
                      ) : (
                        values.preprodInput && <span className="text-green-500">Correct format</span>
                      )}
                    </div>
                  </Form>
                )}
              </Formik>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone (unchanged) */}
      <div>
        <h2 className="text-lg font-medium mb-2 text-red-500">Danger Zone</h2>
        <div className="bg-white dark:bg-gray-700 rounded-lg shadow">
          <button
            onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
            className="w-full flex justify-between items-center p-4 font-medium text-red-500">
            <span>Reset Application Data</span>
            {isDangerZoneOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
          </button>
          {isDangerZoneOpen && (
            <div className="px-4 pb-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Resetting will delete all wallets and application data permanently.
              </p>
              <div className="pt-4">
                <CancelButton onClick={handleResetOnboarding}>Reset All Data</CancelButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
