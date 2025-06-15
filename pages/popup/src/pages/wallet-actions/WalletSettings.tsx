import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStorage, walletsStorage } from '@extension/storage';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import FloatingLabelInput from '../../components/FloatingLabelInput';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';
import type { Wallet } from '@extension/shared';

// Define the possible views for this component
type View = 'menu' | 'rename' | 'change-password' | 'add-password' | 'reveal-seed';

const WalletSettings = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const wallets = useStorage(walletsStorage);

  // State for the current view and the revealed seed phrase
  const [currentView, setCurrentView] = useState<View>('menu');
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);

  const currentWallet = wallets?.find((w: Wallet) => w.id === walletId);

  if (!currentWallet) {
    return <div className="text-center p-4">Wallet not found.</div>;
  }

  // --- Handlers for Form Submissions ---

  const handleRevealSeedSubmit = (values: { password?: string }, { setSubmitting, setFieldError }) => {
    const payload = {
      id: walletId,
      // Pass the password only if the wallet is expected to have one
      password: currentWallet.hasPassword ? values.password : undefined,
    };

    chrome.runtime.sendMessage({ type: 'GET_DECRYPTED_SECRET', payload }, response => {
      setSubmitting(false);
      if (response?.success) {
        setRevealedSeed(response.secret);
      } else {
        // If password validation fails, show an error on the password field
        setFieldError('password', response?.error || 'Failed to decrypt seed.');
      }
    });
  };

  const handleRenameSubmit = (values: { walletName: string }, { setSubmitting }) => {
    // ... (unchanged)
  };

  const handleAddPasswordSubmit = (values: any, { setSubmitting }) => {
    // ... (unchanged)
  };

  const handleChangePasswordSubmit = (values: any, { setSubmitting, setFieldError }) => {
    // This handler will now use the same GET_DECRYPTED_SECRET message to validate the password
    const payload = { id: walletId, password: values.currentPassword.trim() };

    chrome.runtime.sendMessage({ type: 'GET_DECRYPTED_SECRET', payload }, validationResponse => {
      if (validationResponse?.success) {
        // Password is correct, now we can change it
        const changePayload = {
          id: walletId,
          currentPassword: values.currentPassword.trim(),
          newPassword: values.newPassword.trim(),
        };
        chrome.runtime.sendMessage({ type: 'CHANGE_PASSWORD', payload: changePayload }, changeResponse => {
          setSubmitting(false);
          if (changeResponse?.success) {
            alert('Password changed successfully!');
            setCurrentView('menu');
          } else {
            alert(`Error: ${changeResponse?.error}`);
          }
        });
      } else {
        setFieldError('currentPassword', 'Incorrect current password');
        setSubmitting(false);
      }
    });
  };

  // --- Function to Render the Correct View ---

  const renderContent = () => {
    switch (currentView) {
      case 'rename':
      // ... (unchanged)

      case 'add-password':
      // ... (unchanged)

      case 'change-password':
      // ... (unchanged)

      case 'reveal-seed':
        // If the seed has been revealed, display it.
        if (revealedSeed) {
          return (
            <div className="flex flex-col h-full">
              <div className="flex-grow">
                <p className="text-sm text-gray-600 dark:text-gray-300">Your secret seed phrase is:</p>
                <div className="mt-2 p-4 bg-gray-100 dark:bg-gray-700 rounded-md break-words font-mono text-center">
                  {revealedSeed}
                </div>
                <p className="text-xs text-red-500 mt-4">Do not share this phrase with anyone. Store it securely.</p>
              </div>
              <div className="mt-auto flex justify-center">
                <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                  Back to Settings
                </SecondaryButton>
              </div>
            </div>
          );
        }
        // If the wallet has a password, ask for it first.
        if (currentWallet.hasPassword) {
          return (
            <Formik
              initialValues={{ password: '' }}
              validationSchema={Yup.object({ password: Yup.string().required('Password is required.') })}
              onSubmit={handleRevealSeedSubmit}>
              {({ errors, touched, isSubmitting }) => (
                <Form className="flex flex-col h-full">
                  <p className="text-center mb-4">Enter your password to reveal the seed phrase.</p>
                  <div className="flex-grow">
                    <FloatingLabelInput
                      name="password"
                      label="Password"
                      type="password"
                      required
                      error={touched.password && !!errors.password}
                    />
                    <ErrorMessage name="password" component="p" className="text-red-500 text-sm mt-1" />
                  </div>
                  <div className="mt-auto flex justify-center space-x-4">
                    <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                      Back
                    </SecondaryButton>
                    <PrimaryButton type="submit" disabled={isSubmitting}>
                      Reveal
                    </PrimaryButton>
                  </div>
                </Form>
              )}
            </Formik>
          );
        }
        // If no password, reveal it directly (but still with a confirmation click).
        return (
          <div className="flex flex-col h-full items-center">
            <p className="text-center mb-4">This wallet is not password protected. Reveal the seed phrase?</p>
            <div className="mt-auto flex justify-center space-x-4">
              <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                Back
              </SecondaryButton>
              <PrimaryButton
                onClick={() =>
                  handleRevealSeedSubmit({ password: undefined }, { setSubmitting: () => {}, setFieldError: () => {} })
                }>
                Yes, Reveal
              </PrimaryButton>
            </div>
          </div>
        );

      case 'menu':
      default:
        return (
          <div className="flex flex-col space-y-2">
            <SecondaryButton className="w-full" onClick={() => setCurrentView('rename')}>
              Rename Wallet
            </SecondaryButton>
            {currentWallet.hasPassword ? (
              <SecondaryButton className="w-full" onClick={() => setCurrentView('change-password')}>
                Change Password
              </SecondaryButton>
            ) : (
              <SecondaryButton className="w-full" onClick={() => setCurrentView('add-password')}>
                Add Password
              </SecondaryButton>
            )}
            {/* --- NEW EXPORT BUTTON LOGIC --- */}
            {currentWallet.type === 'SPOOFED' ? (
              <div className="w-full p-2 text-center text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded">
                Spoofed wallets do not have a seed phrase.
              </div>
            ) : (
              <SecondaryButton className="w-full" onClick={() => setCurrentView('reveal-seed')}>
                Export Seed Phrase
              </SecondaryButton>
            )}
          </div>
        );
    }
  };

  return <div className="flex flex-col h-full">{renderContent()}</div>;
};

export default WalletSettings;
