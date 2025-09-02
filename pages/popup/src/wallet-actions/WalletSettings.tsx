import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStorage, walletsStorage } from '@extension/storage';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { PrimaryButton, SecondaryButton } from '@src/components/buttons';
import type { Wallet } from '@extension/shared';
import { TruncateWithCopy } from '@extension/shared';

// Define the possible views for this component
type View = 'menu' | 'rename' | 'change-password' | 'add-password' | 'reveal-seed';

const WalletSettings = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const walletsData = useStorage(walletsStorage);

  const [currentView, setCurrentView] = useState<View>('menu');
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);

  const wallets = walletsData?.wallets || [];
  const currentWallet = wallets.find((w: Wallet) => w.id === walletId);

  // Guard clause in case the wallet isn't found
  if (!currentWallet) {
    return <div className="p-4 text-center">Wallet not found.</div>;
  }

  // --- Handlers for Form Submissions ---

  const handleRenameSubmit = (values: { walletName: string }, { setSubmitting }) => {
    const payload = { id: walletId, name: values.walletName };
    chrome.runtime.sendMessage({ type: 'WALLET_RENAME', payload }, response => {
      setSubmitting(false);
      if (response?.success) {
        setCurrentView('menu'); // Return to the menu on success
      } else {
        console.error('Failed to update wallet name:', response?.error);
      }
    });
  };

  const handleAddPasswordSubmit = (values: { newPassword: string }, { setSubmitting }) => {
    const payload = { id: walletId, newPassword: values.newPassword };
    chrome.runtime.sendMessage({ type: 'ADD_PASSWORD', payload }, response => {
      setSubmitting(false);
      if (response?.success) {
        alert('Password added successfully!');
        setCurrentView('menu');
      } else {
        alert(`Error: ${response?.error}`);
      }
    });
  };

  const handleChangePasswordSubmit = (values: any, { setSubmitting, setFieldError }) => {
    const changePayload = {
      id: walletId,
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    };
    chrome.runtime.sendMessage({ type: 'CHANGE_PASSWORD', payload: changePayload }, response => {
      setSubmitting(false);
      if (response?.success) {
        alert('Password changed successfully!');
        setCurrentView('menu');
      } else {
        setFieldError('currentPassword', response?.error || 'Incorrect password');
      }
    });
  };

  const handleRevealSeedSubmit = (values: { password?: string }, { setSubmitting, setFieldError }) => {
    const payload = {
      id: walletId,
      password: currentWallet.hasPassword ? values.password : undefined,
    };

    chrome.runtime.sendMessage({ type: 'GET_DECRYPTED_SECRET', payload }, response => {
      setSubmitting(false);
      if (response?.success) {
        setRevealedSeed(response.secret);
      } else {
        setFieldError('password', response?.error || 'Failed to decrypt seed.');
      }
    });
  };

  // --- Function to Render the Correct View ---

  const renderContent = () => {
    switch (currentView) {
      case 'rename':
        return (
          <Formik
            initialValues={{ walletName: currentWallet.name }}
            validationSchema={Yup.object({ walletName: Yup.string().required('Wallet name is required.') })}
            onSubmit={handleRenameSubmit}>
            {({ errors, touched, isSubmitting }) => (
              <Form className="flex h-full flex-col">
                <div className="grow">
                  <FloatingLabelInput
                    name="walletName"
                    label="Wallet Name"
                    required
                    error={touched.walletName && !!errors.walletName}
                  />
                  <ErrorMessage name="walletName" component="p" className="mt-1 text-sm text-red-500" />
                </div>
                <div className="mt-auto flex justify-center space-x-4">
                  <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                    Back
                  </SecondaryButton>
                  <PrimaryButton type="submit" disabled={isSubmitting}>
                    Save
                  </PrimaryButton>
                </div>
              </Form>
            )}
          </Formik>
        );
      case 'add-password':
        return (
          <Formik
            initialValues={{ newPassword: '', confirmNewPassword: '' }}
            validationSchema={Yup.object({
              newPassword: Yup.string().required('Password is required.'),
              confirmNewPassword: Yup.string()
                .oneOf([Yup.ref('newPassword')], 'Passwords must match')
                .required('Please confirm your password.'),
            })}
            onSubmit={handleAddPasswordSubmit}>
            {({ errors, touched, isSubmitting }) => (
              <Form className="flex h-full flex-col">
                <div className="grow space-y-4">
                  <div>
                    <FloatingLabelInput
                      name="newPassword"
                      label="New Password"
                      type="password"
                      required
                      error={touched.newPassword && !!errors.newPassword}
                    />
                    <ErrorMessage name="newPassword" component="p" className="mt-1 text-xs text-red-500" />
                  </div>
                  <div>
                    <FloatingLabelInput
                      name="confirmNewPassword"
                      label="Confirm Password"
                      type="password"
                      required
                      error={touched.confirmNewPassword && !!errors.confirmNewPassword}
                    />
                    <ErrorMessage name="confirmNewPassword" component="p" className="mt-1 text-xs text-red-500" />
                  </div>
                </div>
                <div className="mt-auto flex justify-center space-x-4">
                  <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                    Back
                  </SecondaryButton>
                  <PrimaryButton type="submit" disabled={isSubmitting}>
                    Set Password
                  </PrimaryButton>
                </div>
              </Form>
            )}
          </Formik>
        );
      case 'change-password':
        return (
          <Formik
            initialValues={{ currentPassword: '', newPassword: '', confirmNewPassword: '' }}
            validationSchema={Yup.object({
              currentPassword: Yup.string().required('Current password is required.'),
              newPassword: Yup.string().required('New password is required.'),
              confirmNewPassword: Yup.string()
                .oneOf([Yup.ref('newPassword')], 'Passwords must match')
                .required('Please confirm your new password.'),
            })}
            onSubmit={handleChangePasswordSubmit}>
            {({ errors, touched, isSubmitting }) => (
              <Form className="flex h-full flex-col">
                <div className="grow space-y-4">
                  <div>
                    <FloatingLabelInput
                      name="currentPassword"
                      label="Current Password"
                      type="password"
                      required
                      error={touched.currentPassword && !!errors.currentPassword}
                    />
                    <ErrorMessage name="currentPassword" component="p" className="mt-1 text-xs text-red-500" />
                  </div>
                  <div>
                    <FloatingLabelInput
                      name="newPassword"
                      label="New Password"
                      type="password"
                      required
                      error={touched.newPassword && !!errors.newPassword}
                    />
                    <ErrorMessage name="newPassword" component="p" className="mt-1 text-xs text-red-500" />
                  </div>
                  <div>
                    <FloatingLabelInput
                      name="confirmNewPassword"
                      label="Confirm New Password"
                      type="password"
                      required
                      error={touched.confirmNewPassword && !!errors.confirmNewPassword}
                    />
                    <ErrorMessage name="confirmNewPassword" component="p" className="mt-1 text-xs text-red-500" />
                  </div>
                </div>
                <div className="mt-auto flex justify-center space-x-4">
                  <SecondaryButton type="button" onClick={() => setCurrentView('menu')}>
                    Back
                  </SecondaryButton>
                  <PrimaryButton type="submit" disabled={isSubmitting}>
                    Change Password
                  </PrimaryButton>
                </div>
              </Form>
            )}
          </Formik>
        );
      case 'reveal-seed':
        if (revealedSeed) {
          return (
            <div className="flex h-full flex-col">
              <div className="grow">
                <p className="text-sm text-gray-600 dark:text-gray-300">Your secret seed phrase is:</p>
                <div className="mt-2 break-words rounded-md bg-gray-100 p-4 text-center font-mono dark:bg-gray-700">
                  {revealedSeed}
                </div>
                <p className="mt-4 text-xs text-red-500">Do not share this phrase with anyone. Store it securely.</p>
              </div>
              <div className="mt-auto flex justify-center">
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setRevealedSeed(null);
                    setCurrentView('menu');
                  }}>
                  Back to Settings
                </SecondaryButton>
              </div>
            </div>
          );
        }
        return (
          <Formik
            initialValues={{ password: '' }}
            validationSchema={Yup.object({ password: Yup.string().required('Password is required.') })}
            onSubmit={handleRevealSeedSubmit}>
            {({ errors, touched, isSubmitting }) => (
              <Form className="flex h-full flex-col">
                <p className="mb-4 text-center">Enter your password to reveal the seed phrase.</p>
                <div className="grow">
                  <FloatingLabelInput
                    name="password"
                    label="Password"
                    type="password"
                    required
                    error={touched.password && !!errors.password}
                  />
                  <ErrorMessage name="password" component="p" className="mt-1 text-sm text-red-500" />
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
            {currentWallet.type === 'SPOOFED' ? (
              <div className="w-full rounded bg-gray-100 p-2 text-center text-xs text-gray-500 dark:bg-gray-700">
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

  return (
    <div className="flex h-full flex-col">
      Address: <TruncateWithCopy text={currentWallet.address} maxChars={16} />
      Stake: <TruncateWithCopy text={currentWallet.stakeAddress} maxChars={16} />
      {renderContent()}
    </div>
  );
};

export default WalletSettings;
