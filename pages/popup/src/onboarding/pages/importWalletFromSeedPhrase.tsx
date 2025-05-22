import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

import { PrimaryButton, SecondaryButton, CancelButton } from '@src/components/buttons';

// Simple fuzzy search function
const fuzzySearch = (query, words) => {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  // Exact matches first, then starts with, then includes
  const exactMatches = words.filter(word => word === lowerQuery);
  const startsWithMatches = words.filter(word => word !== lowerQuery && word.startsWith(lowerQuery));
  const includesMatches = words.filter(word => !word.startsWith(lowerQuery) && word.includes(lowerQuery));

  return [...exactMatches, ...startsWithMatches, ...includesMatches];
};

// Function to highlight matching text in suggestions
const highlightMatch = (word, query) => {
  if (!query.trim()) return word;

  const lowerWord = word.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerWord.indexOf(lowerQuery);

  if (index === -1) return word;

  return (
    <>
      {word.substring(0, index)}
      <span className="font-bold">{word.substring(index, index + query.length)}</span>
      {word.substring(index + query.length)}
    </>
  );
};

const ImportNewWallet = () => {
  const [step, setStep] = useState(1);
  const [wordCount, setWordCount] = useState(15);
  const [suggestions, setSuggestions] = useState({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState({});
  const [BIP39_WORDS, setBIP39_WORDS] = useState<string[]>([]);
  const [scrollStates, setScrollStates] = useState({});
  const [validWords, setValidWords] = useState({});

  const navigate = useNavigate();

  // Load word list from file
  useEffect(() => {
    const BIP39_WORDSurl = chrome.runtime.getURL('BIP39_WORDS.txt');
    console.log('BIP39_WORDSurl', BIP39_WORDSurl);

    fetch(BIP39_WORDSurl)
      .then(response => response.text())
      .then(text => {
        const words = text
          .split('\n')
          .map(word => word.trim())
          .filter(word => word.length > 0);
        setBIP39_WORDS(words);
      })
      .catch(error => {
        console.error('Error loading word list:', error);
      });
  }, []);

  // Create validation schema dynamically based on word count and current step
  const createValidationSchema = (count, currentStep) => {
    const schema = {};

    // Step 2 validation - only validate seed words when on step 2 or 3
    if (currentStep >= 2) {
      for (let i = 0; i < count; i++) {
        schema[`word_${i}`] = Yup.string().required().oneOf(BIP39_WORDS, 'Invalid word');
      }
    }

    // Step 3 validation - only validate wallet details when on step 3
    if (currentStep >= 3) {
      schema.walletName = Yup.string().required('Wallet name is required');
      schema.walletPassword = Yup.string().when('skipPassword', {
        is: false,
        then: schema => schema.required('Password is required'),
      });
      schema.confirmPassword = Yup.string().when('skipPassword', {
        is: false,
        then: schema =>
          schema.required('Please confirm your password').oneOf([Yup.ref('walletPassword')], 'Passwords do not match'),
      });
      schema.skipPassword = Yup.boolean();
    }

    return Yup.object(schema);
  };

  // Create initial values dynamically
  const createInitialValues = count => {
    const seedWords = {};
    for (let i = 0; i < count; i++) {
      seedWords[`word_${i}`] = '';
    }

    return {
      ...seedWords,
      walletName: '',
      walletPassword: '',
      confirmPassword: '',
      skipPassword: false,
    };
  };

  const handleWordCountChange = count => {
    setWordCount(count);
    setSuggestions({});
    setActiveSuggestionIndex({});
    setScrollStates({});
    setValidWords({});
  };

  const handleScroll = (e, index) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const canScrollUp = scrollTop > 0;
    const canScrollDown = scrollTop < scrollHeight - clientHeight;

    setScrollStates(prev => ({
      ...prev,
      [index]: { canScrollUp, canScrollDown },
    }));
  };

  const handleWordChange = (index, value, setFieldValue) => {
    const fieldName = `word_${index}`;
    setFieldValue(fieldName, value);

    // Check if the word is valid and update styling
    const isValidWord = BIP39_WORDS.includes(value.trim().toLowerCase());
    setValidWords(prev => ({ ...prev, [index]: isValidWord }));

    if (value.trim()) {
      const matches = fuzzySearch(value.trim(), BIP39_WORDS);
      setSuggestions(prev => ({ ...prev, [index]: matches }));

      // Reset scroll state and set first item as default selected
      setTimeout(() => {
        const dropdown = document.getElementById(`suggestions-${index}`);
        if (dropdown) {
          const { scrollHeight, clientHeight } = dropdown;
          const canScrollDown = scrollHeight > clientHeight;
          setScrollStates(prev => ({
            ...prev,
            [index]: { canScrollUp: false, canScrollDown },
          }));
        }
      }, 0);

      // Set first suggestion as default active (instead of -1)
      setActiveSuggestionIndex(prev => ({ ...prev, [index]: 0 }));
    } else {
      setSuggestions(prev => ({ ...prev, [index]: [] }));
      setScrollStates(prev => ({ ...prev, [index]: {} }));
      setActiveSuggestionIndex(prev => ({ ...prev, [index]: -1 }));
    }
  };

  const handleSuggestionClick = (index, word, setFieldValue) => {
    const fieldName = `word_${index}`;
    setFieldValue(fieldName, word);
    setSuggestions(prev => ({ ...prev, [index]: [] }));
    setValidWords(prev => ({ ...prev, [index]: true }));

    // Defocus the input
    const input = document.querySelector(`input[name="${fieldName}"]`);
    if (input) {
      input.blur();
    }
  };

  const handleKeyDown = (e, index, setFieldValue) => {
    const currentSuggestions = suggestions[index] || [];
    const currentActive = activeSuggestionIndex[index] ?? -1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Loop to beginning if at end
      const newIndex = currentActive < currentSuggestions.length - 1 ? currentActive + 1 : 0;
      setActiveSuggestionIndex(prev => ({ ...prev, [index]: newIndex }));

      // Scroll logic
      setTimeout(() => {
        const dropdown = document.getElementById(`suggestions-${index}`);
        const buttons = dropdown?.querySelectorAll('button');
        if (buttons && buttons[newIndex]) {
          const button = buttons[newIndex];
          const container = dropdown;

          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const indicatorHeight = 24;

          const bottomIndicatorTop = containerRect.bottom - indicatorHeight;
          if (buttonRect.bottom > bottomIndicatorTop) {
            const scrollAmount = buttonRect.bottom - bottomIndicatorTop + 4;
            container.scrollTop += scrollAmount;
          }

          const topIndicatorBottom = containerRect.top + indicatorHeight;
          if (buttonRect.top < topIndicatorBottom) {
            const scrollAmount = topIndicatorBottom - buttonRect.top + 4;
            container.scrollTop -= scrollAmount;
          }
        }
      }, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Loop to end if at beginning
      const newIndex = currentActive > 0 ? currentActive - 1 : currentSuggestions.length - 1;
      setActiveSuggestionIndex(prev => ({ ...prev, [index]: newIndex }));

      // Scroll logic
      setTimeout(() => {
        const dropdown = document.getElementById(`suggestions-${index}`);
        const buttons = dropdown?.querySelectorAll('button');
        if (buttons && buttons[newIndex]) {
          const button = buttons[newIndex];
          const container = dropdown;

          const buttonRect = button.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();

          const indicatorHeight = 24;

          const topIndicatorBottom = containerRect.top + indicatorHeight;
          if (buttonRect.top < topIndicatorBottom) {
            const scrollAmount = topIndicatorBottom - buttonRect.top + 4;
            container.scrollTop -= scrollAmount;
          }

          const bottomIndicatorTop = containerRect.bottom - indicatorHeight;
          if (buttonRect.bottom > bottomIndicatorTop) {
            const scrollAmount = buttonRect.bottom - bottomIndicatorTop + 4;
            container.scrollTop += scrollAmount;
          }
        }
      }, 0);
    } else if (e.key === 'Enter' && currentActive >= 0) {
      e.preventDefault();
      const selectedWord = currentSuggestions[currentActive];
      handleSuggestionClick(index, selectedWord, setFieldValue);
    } else if (e.key === 'Escape') {
      setSuggestions(prev => ({ ...prev, [index]: [] }));
      setActiveSuggestionIndex(prev => ({ ...prev, [index]: -1 }));
    }
  };

  const validateStep2 = values => {
    const emptyFields = [];
    for (let i = 0; i < wordCount; i++) {
      if (!values[`word_${i}`] || !values[`word_${i}`].trim()) {
        emptyFields.push(i);
      }
    }
    return emptyFields.length === 0;
  };

  const handleNext = (values, { setSubmitting }) => {
    if (step === 2 && !validateStep2(values)) {
      setSubmitting(false);
      return;
    }
    setStep(prev => prev + 1);
    setSubmitting(false);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleImport = values => {
    const seedPhrase = [];
    for (let i = 0; i < wordCount; i++) {
      seedPhrase.push(values[`word_${i}`]);
    }

    console.log('Importing with:', {
      wordCount,
      seedPhrase,
      walletName: values.walletName,
      walletPassword: values.skipPassword ? '' : values.walletPassword,
      hasPassword: !values.skipPassword,
    });

    // Simulate import
    alert('Not implemented yet. Redirecting to success anyway.');
    navigate('/onboarding/import-wallet-from-seed-phrase-success');
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  const stepSubtitle = {
    1: 'Choose Wallet Type',
    2: 'Enter Seed Phrase',
    3: 'Enter Wallet Details',
  }[step];

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium mb-1">Import Wallet</h2>
      <p className="text-white text-sm mb-6">
        Step {step}/3 — {stepSubtitle}
      </p>

      <Formik
        initialValues={createInitialValues(wordCount)}
        validationSchema={createValidationSchema(wordCount, step)}
        onSubmit={step === 3 ? handleImport : handleNext}
        enableReinitialize={true}>
        {({ values, errors, touched, setFieldValue, setFieldError, setFieldTouched, isSubmitting }) => (
          <Form className="w-full max-w-sm flex flex-col h-full">
            {/* Step 1: Choose Word Count */}
            {step === 1 && (
              <div className="flex flex-col items-center">
                <p className="text-center text-gray-600 mb-4">How many words does your seed phrase have?</p>
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => handleWordCountChange(15)}
                    className={`py-2 px-4 rounded border ${
                      wordCount === 15 ? 'bg-blue-600 text-white' : 'border-gray-400'
                    }`}>
                    15 Words
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWordCountChange(24)}
                    className={`py-2 px-4 rounded border ${
                      wordCount === 24 ? 'bg-blue-600 text-white' : 'border-gray-400'
                    }`}>
                    24 Words
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Enter Seed Phrase */}
            {step === 2 && (
              <div className="w-full">
                <p className="text-center text-gray-600 mb-4">Enter your {wordCount}-word seed phrase</p>
                <div className="grid grid-cols-3 gap-2 relative">
                  {Array.from({ length: wordCount }).map((_, idx) => {
                    const fieldName = `word_${idx}`;
                    const hasError = errors[fieldName] && touched[fieldName];
                    const currentSuggestions = suggestions[idx] || [];
                    const activeIndex = activeSuggestionIndex[idx] ?? -1;

                    return (
                      <div key={idx} className="relative">
                        <Field
                          name={fieldName}
                          type="text"
                          className={`p-2 rounded border w-full ${
                            validWords[idx]
                              ? 'bg-blue-100 border-transparent'
                              : hasError
                                ? 'border-red-500'
                                : 'border-gray-300'
                          } dark:text-black`}
                          placeholder={`Word ${idx + 1}`}
                          onChange={e => handleWordChange(idx, e.target.value, setFieldValue)}
                          onKeyDown={e => handleKeyDown(e, idx, setFieldValue)}
                          onClick={e => {
                            // If field has valid word, clear it and reset styling
                            if (validWords[idx]) {
                              setFieldValue(fieldName, '');
                              setValidWords(prev => ({ ...prev, [idx]: false }));
                            }
                          }}
                          onFocus={e => {
                            // Show suggestions again when refocusing if there's a value
                            if (e.target.value.trim() && !validWords[idx]) {
                              const matches = fuzzySearch(e.target.value.trim(), BIP39_WORDS);
                              setSuggestions(prev => ({ ...prev, [idx]: matches }));
                              setActiveSuggestionIndex(prev => ({ ...prev, [idx]: 0 }));

                              // Reset scroll state
                              setTimeout(() => {
                                const dropdown = document.getElementById(`suggestions-${idx}`);
                                if (dropdown) {
                                  const { scrollHeight, clientHeight } = dropdown;
                                  const canScrollDown = scrollHeight > clientHeight;
                                  setScrollStates(prev => ({
                                    ...prev,
                                    [idx]: { canScrollUp: false, canScrollDown },
                                  }));
                                }
                              }, 0);
                            }
                          }}
                          onBlur={() => {
                            // Auto-select the active suggestion if there is one
                            const currentSuggestions = suggestions[idx] || [];
                            const activeIndex = activeSuggestionIndex[idx] ?? -1;

                            if (currentSuggestions.length > 0 && activeIndex >= 0) {
                              const selectedWord = currentSuggestions[activeIndex];
                              setFieldValue(fieldName, selectedWord);
                              setValidWords(prev => ({ ...prev, [idx]: true }));
                            }

                            // Clear suggestions after a small delay
                            setTimeout(() => {
                              setSuggestions(prev => ({ ...prev, [idx]: [] }));
                            }, 200);
                          }}
                          autoComplete="off"
                        />

                        {/* Suggestions Dropdown */}
                        {currentSuggestions.length > 0 && (
                          <div
                            className="absolute z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-hidden"
                            style={{ top: 'calc(100% + 4px)', left: 0 }}>
                            {/* Top scroll indicator - absolutely positioned */}
                            {scrollStates[idx]?.canScrollUp && (
                              <div className="absolute top-0 left-0 right-0 z-20 flex justify-center py-1 bg-white bg-opacity-90 pointer-events-none">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-gray-400"></div>
                              </div>
                            )}

                            {/* Scrollable content */}
                            <div
                              id={`suggestions-${idx}`}
                              className="max-h-32 overflow-y-auto"
                              style={{
                                scrollbarWidth: 'none',
                                msOverflowStyle: 'none',
                              }}
                              onScroll={e => handleScroll(e, idx)}>
                              {currentSuggestions.map((word, suggestionIdx) => {
                                const isActive = activeIndex === suggestionIdx;

                                return (
                                  <button
                                    key={word}
                                    type="button"
                                    className={`w-full text-left px-3 py-1 text-sm dark:text-black ${
                                      isActive ? 'bg-gray-200' : 'hover:bg-gray-100'
                                    }`}
                                    onMouseDown={e => e.preventDefault()} // Prevent blur
                                    onMouseEnter={() => {
                                      // Mouse hover updates the same state that keyboard uses
                                      setActiveSuggestionIndex(prev => ({ ...prev, [idx]: suggestionIdx }));
                                    }}
                                    onMouseLeave={() => {
                                      // Don't clear on mouse leave - let the state persist
                                    }}
                                    onClick={() => handleSuggestionClick(idx, word, setFieldValue)}>
                                    {highlightMatch(word, values[fieldName] || '')}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Bottom scroll indicator - absolutely positioned */}
                            {scrollStates[idx]?.canScrollDown && (
                              <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center py-1 bg-white bg-opacity-90 pointer-events-none">
                                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-400"></div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Global error message for missing words */}
                {Object.keys(errors).some(key => key.startsWith('word_') && touched[key]) && (
                  <p className="text-red-500 text-sm mt-2 text-center">Please fill out missing words</p>
                )}
              </div>
            )}

            {/* Step 3: Wallet Details */}
            {step === 3 && (
              <div className="w-full">
                <div className="mb-4">
                  <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
                    Wallet Name <span className="text-red-500">*</span>
                  </label>
                  <Field
                    type="text"
                    id="walletName"
                    name="walletName"
                    className={`mt-1 block w-full border rounded-md p-2 dark:text-black ${
                      errors.walletName && touched.walletName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="My Wallet"
                  />
                  <ErrorMessage name="walletName" component="p" className="text-red-500 text-sm mt-1" />
                </div>

                <div className="mb-2">
                  <label htmlFor="walletPassword" className="block text-sm font-medium text-gray-700">
                    Password {!values.skipPassword && <span className="text-red-500">*</span>}
                  </label>
                  <Field
                    type="password"
                    id="walletPassword"
                    name="walletPassword"
                    disabled={values.skipPassword}
                    className={`mt-1 block w-full border ${
                      errors.walletPassword && touched.walletPassword ? 'border-red-500' : 'border-gray-300'
                    } rounded-md p-2 dark:text-black ${values.skipPassword ? 'bg-gray-100' : ''}`}
                    placeholder={values.skipPassword ? 'Password disabled' : 'Enter password'}
                  />
                  <ErrorMessage name="walletPassword" component="p" className="text-red-500 text-sm mt-1" />
                </div>

                <div className="mb-2">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password {!values.skipPassword && <span className="text-red-500">*</span>}
                  </label>
                  <Field
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    disabled={values.skipPassword}
                    className={`mt-1 block w-full border ${
                      errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    } rounded-md p-2 dark:text-black ${values.skipPassword ? 'bg-gray-100' : ''}`}
                    placeholder={values.skipPassword ? 'Password disabled' : 'Confirm password'}
                  />
                  <ErrorMessage name="confirmPassword" component="p" className="text-red-500 text-sm mt-1" />
                </div>

                {/* Password Skip Option */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <Field
                      type="checkbox"
                      name="skipPassword"
                      className="w-4 h-4"
                      onChange={e => {
                        const checked = e.target.checked;
                        setFieldValue('skipPassword', checked);
                        if (checked) {
                          setFieldValue('walletPassword', '');
                          setFieldValue('confirmPassword', '');
                          setFieldError('walletPassword', undefined);
                          setFieldError('confirmPassword', undefined);
                          setFieldTouched('walletPassword', false);
                          setFieldTouched('confirmPassword', false);
                        }
                      }}
                    />
                    <span className="text-sm text-gray-700">
                      I understand the security risks — create wallet without a password
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-auto flex justify-center space-x-4">
              <CancelButton type="button" onClick={handleCancel}>
                Cancel
              </CancelButton>
              {step > 1 && (
                <SecondaryButton type="button" onClick={handleBack}>
                  Back
                </SecondaryButton>
              )}
              {step < 3 && (
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  Next
                </PrimaryButton>
              )}
              {step === 3 && (
                <PrimaryButton type="submit" disabled={isSubmitting}>
                  Import
                </PrimaryButton>
              )}
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ImportNewWallet;
