import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStorage, devxSettings, devxData, type WalletRecord } from '@extension/storage';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import FloatingLabelInput from '../components/FloatingLabelInput';
import { PrimaryButton, SecondaryButton, CancelButton } from '@src/components/buttons';
import type { Wallet } from '@extension/shared';
import { TruncateWithCopy } from '@extension/shared';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

// Define the possible views for this component
type View = 'menu' | 'rename' | 'change-password' | 'add-password' | 'reveal-seed' | 'wallet-deleted';

// Helper function to format addresses for display
const formatAddressForDisplay = (address: string): string => {
  // Find where the prefix ends (after the first '1')
  const prefixEndIndex = address.indexOf('1');
  if (prefixEndIndex === -1) return address; // Fallback if no '1' found

  const prefix = address.substring(0, prefixEndIndex + 1); // Include the '1'
  const remainder = address.substring(prefixEndIndex + 1);

  // Show prefix + 6 chars + ... + last 6 chars
  if (remainder.length <= 14) {
    // If remaining part is short, just show it all
    return address;
  }

  const start = remainder.substring(0, 6);
  const end = remainder.substring(remainder.length - 6);

  return `${prefix}${start}...${end}`;
};

const WalletSettings = () => {
  const { walletId } = useParams<{ walletId: string }>();
  const navigate = useNavigate();
  const settings = useStorage(devxSettings);

  const [currentView, setCurrentView] = useState<View>('menu');
  const [revealedSeed, setRevealedSeed] = useState<string | null>(null);
  const [isDangerZoneOpen, setIsDangerZoneOpen] = useState(false);
  const [isPaymentAddressesOpen, setIsPaymentAddressesOpen] = useState(false);
  const [deletedWalletName, setDeletedWalletName] = useState<string>('');
  const [currentWallet, setCurrentWallet] = useState<WalletRecord | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);

  // Load wallet data from IndexedDB
  useEffect(() => {
    const loadWalletData = async () => {
      if (walletId && currentView !== 'wallet-deleted') {
        const wallet = await devxData.getWallet(walletId);
        setCurrentWallet(wallet);
      }
      // Load all wallets for the deleted view
      const allWallets = await devxData.getWallets();
      setWallets(allWallets);
    };
    loadWalletData();
  }, [walletId, currentView]);

  // Guard clause in case the wallet isn't found - but allow wallet-deleted view to show
  if (!currentWallet && currentView !== 'wallet-deleted') {
    return <div className="p-4 text-center">Wallet not found.</div>;
  }

  // --- Handlers for Form Submissions ---

  const handleDeleteWallet = async () => {
    if (!walletId || !currentWallet) return;

    const confirmDelete = confirm(
      `Are you sure you want to delete "${currentWallet.name}"? This will permanently remove the wallet and ALL associated data (transactions, UTXOs, assets) from the database and settings. This action cannot be undone.`,
    );
    if (confirmDelete) {
      try {
        // Remove the wallet and all associated data (transactions, UTXOs, assets)
        // devxData.removeWallet handles cascade deletion automatically
        await devxData.removeWallet(walletId);

        // Get remaining wallets
        const remainingWallets = await devxData.getWallets();

        // If this was the active wallet, set a new active wallet or clear it
        if (settings?.activeWalletId === walletId) {
          const newActiveWalletId = remainingWallets.length > 0 ? remainingWallets[0].id : null;
          await devxSettings.setActiveWalletId(newActiveWalletId);

          // If no wallets left, mark as not onboarded
          if (remainingWallets.length === 0) {
            await devxSettings.setOnboarded(false);
          }
        }

        // Store the deleted wallet name and show success page
        setDeletedWalletName(currentWallet.name);
        setWallets(remainingWallets);
        setCurrentView('wallet-deleted');
      } catch (error) {
        console.error('Failed to delete wallet:', error);
        alert('Failed to delete wallet. Check console for details.');
      }
    }
  };

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

        // If wallet has no password, reveal seed directly
        if (currentWallet && !currentWallet.hasPassword) {
          return (
            <Formik
              initialValues={{}}
              onSubmit={() => {
                const payload = {
                  id: walletId,
                  password: undefined,
                };

                chrome.runtime.sendMessage({ type: 'GET_DECRYPTED_SECRET', payload }, response => {
                  if (response?.success) {
                    setRevealedSeed(response.secret);
                  } else {
                    alert(response?.error || 'Failed to decrypt seed.');
                  }
                });
              }}>
              {({ isSubmitting }) => (
                <Form className="flex h-full flex-col">
                  <div className="grow">
                    <p className="mb-4 text-center text-gray-600 dark:text-gray-300">
                      This wallet has no password protection.
                    </p>
                    <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                      Click "Reveal" to display your seed phrase.
                    </p>
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

        // Wallet has password, ask for it
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

      case 'wallet-deleted':
        const hasWallets = wallets.length > 0;

        return (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-6">
              <div className="mb-4 flex justify-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                  <svg
                    className="size-8 text-green-600 dark:text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="mb-2 text-xl font-bold">Wallet Deleted Successfully</h2>
              <p className="mb-2 text-gray-600 dark:text-gray-300">
                "{deletedWalletName}" has been permanently removed.
              </p>
              {!hasWallets && (
                <p className="text-orange-600 dark:text-orange-400">
                  You now have 0 wallets anymore, please add a wallet.
                </p>
              )}
            </div>
            <div className="flex flex-col space-y-3">
              {hasWallets ? (
                <PrimaryButton
                  onClick={() => {
                    navigate(`/wallet/${wallets[0].id}/assets`);
                  }}>
                  Go Back
                </PrimaryButton>
              ) : (
                <PrimaryButton
                  onClick={() => {
                    navigate('/add-wallet');
                  }}>
                  Add New Wallet
                </PrimaryButton>
              )}
            </div>
          </div>
        );

      case 'menu':
      default:
        return (
          <div className="flex flex-col space-y-4">
            {/* Payment Addresses */}
            {currentWallet.paymentAddresses && currentWallet.paymentAddresses.length > 0 && (
              <div className="rounded-lg bg-white shadow dark:bg-gray-700">
                <button
                  onClick={() => setIsPaymentAddressesOpen(!isPaymentAddressesOpen)}
                  className="flex w-full items-center justify-between p-4 font-medium">
                  <span>Payment Addresses ({currentWallet.paymentAddresses.length})</span>
                  {isPaymentAddressesOpen ? (
                    <ChevronUpIcon className="size-5" />
                  ) : (
                    <ChevronDownIcon className="size-5" />
                  )}
                </button>
                {isPaymentAddressesOpen && (
                  <div className="space-y-2 px-4 pb-4">
                    {currentWallet.paymentAddresses.map((address, index) => (
                      <div key={address} className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500 dark:text-gray-400">{index + 1}.</span>
                        <code
                          className="flex-1 cursor-help rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-600"
                          title={address}>
                          {formatAddressForDisplay(address)}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(address)}
                          className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                          title="Copy address">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="size-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col space-y-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">Actions</h3>
              <SecondaryButton className="w-full" onClick={() => setCurrentView('rename')}>
                Rename Wallet
              </SecondaryButton>
              {currentWallet.type !== 'SPOOFED' ? (
                <>
                  {currentWallet.hasPassword ? (
                    <SecondaryButton className="w-full" onClick={() => setCurrentView('change-password')}>
                      Change Password
                    </SecondaryButton>
                  ) : (
                    <SecondaryButton className="w-full" onClick={() => setCurrentView('add-password')}>
                      Add Password
                    </SecondaryButton>
                  )}
                  <SecondaryButton className="w-full" onClick={() => setCurrentView('reveal-seed')}>
                    Export Seed Phrase
                  </SecondaryButton>
                </>
              ) : null}
            </div>

            {/* Danger Zone */}
            <div>
              <div className="rounded-lg bg-white shadow dark:bg-gray-700">
                <button
                  onClick={() => setIsDangerZoneOpen(!isDangerZoneOpen)}
                  className="flex w-full items-center justify-between p-4 font-medium text-red-500">
                  <span>Danger Zone</span>
                  {isDangerZoneOpen ? <ChevronUpIcon className="size-5" /> : <ChevronDownIcon className="size-5" />}
                </button>
                {isDangerZoneOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Deleting will permanently remove this wallet and ALL associated data (transactions, UTXOs, assets)
                      from the database and settings.
                    </p>
                    <div className="pt-4">
                      <CancelButton onClick={handleDeleteWallet}>Delete Wallet</CancelButton>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {currentWallet && (
        <>
          {currentWallet.type === 'SPOOFED' && (
            <div className="mb-4 w-full rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
              ℹ️ This is a spoofed (read-only) wallet. It does not have a seed phrase or password.
            </div>
          )}
          <div className="mb-4 space-y-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-left text-sm font-bold text-gray-800 dark:text-gray-100">
                Imported Using Address
              </span>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-600">
                  {currentWallet.address}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(currentWallet.address)}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Copy address">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-left text-sm font-bold text-gray-800 dark:text-gray-100">Stake Address</span>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-hidden text-ellipsis rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-600">
                  {currentWallet.stakeAddress}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(currentWallet.stakeAddress)}
                  className="rounded p-1 hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Copy address">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {renderContent()}
    </div>
  );
};

export default WalletSettings;
