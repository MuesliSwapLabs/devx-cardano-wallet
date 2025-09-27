import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import { useState, useEffect } from 'react';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput';
import NetworkToggle from '@src/components/NetworkToggle';
import { devxSettings, useStorage } from '@extension/storage';
import { spoofWallet } from '../utils/walletOperations';

// Separate component for form content to properly use hooks
function SpoofWalletFormContent({
  values,
  errors,
  touched,
  isSubmitting,
  setFieldValue,
  handleCancel,
  hasRequiredApiKey,
}: any) {
  // Save form data whenever values change
  useEffect(() => {
    devxSettings.updateSpoofFormData(values);
  }, [values]);

  return (
    <Form className="mt-4 flex size-full max-w-sm flex-col">
      <div className="mb-4">
        <Field
          name="walletName"
          as={FloatingLabelInput}
          label="Wallet Name"
          type="text"
          required
          error={touched.walletName && errors.walletName}
        />
        <ErrorMessage name="walletName" component="p" className="mt-1 text-sm text-red-500" />
      </div>

      {/* Network Selection Field */}
      <div className="mb-4">
        <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Network <span className="text-red-500">*</span>
        </label>
        <NetworkToggle value={values.network} onChange={network => setFieldValue('network', network)} />

        {/* API Key Status Indicator */}
        <div className="mt-2 text-xs">
          {hasRequiredApiKey(values.network) ? (
            <span className="text-green-600 dark:text-green-400">✓ {values.network} API key configured</span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400">
              ⚠ {values.network} API key required (will be requested)
            </span>
          )}
        </div>

        <ErrorMessage name="network" component="p" className="mt-1 text-xs text-red-500" />
      </div>

      <div className="mb-4">
        <Field
          name="walletAddress"
          as={FloatingLabelInput}
          label="Wallet Address"
          type="text"
          required
          error={touched.walletAddress && errors.walletAddress}
        />
        <ErrorMessage name="walletAddress" component="p" className="mt-1 text-sm text-red-500" />

        {/* Mangled Address Warning */}
        <div className="mt-2 flex items-center text-xs text-amber-600 dark:text-amber-400">
          <img src={chrome.runtime.getURL('warning.svg')} alt="Warning" className="mr-1 h-3 w-3" />
          <span>Assuming standard wallet addresses only</span>
          <div className="group relative ml-1">
            <span className="cursor-help text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ❓
            </span>
            <div className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2 transform rounded-lg bg-gray-900 p-3 text-xs text-white shadow-lg group-hover:visible dark:bg-gray-700">
              <div className="mb-2 font-semibold">Mangled/Franken Addresses</div>
              <div className="mb-2">
                These are addresses where payment keys and stake keys belong to different wallets. They can cause
                confusion about address ownership.
              </div>
              <div className="text-green-200">
                ✓ Wallet extensions don't create these - both keys derive from the same seed phrase.
              </div>
              <div className="absolute top-full left-1/2 -translate-x-1/2 transform border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-center space-x-4">
        <CancelButton type="button" onClick={handleCancel}>
          Cancel
        </CancelButton>
        <PrimaryButton type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Spoofing...' : 'Spoof Wallet'}
        </PrimaryButton>
      </div>
    </Form>
  );
}

interface IFormValues {
  walletName: string;
  walletAddress: string;
  network: 'Mainnet' | 'Preprod';
}

const SpoofWalletForm = () => {
  const navigate = useNavigate();
  const settings = useStorage(devxSettings);

  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required.'),
    network: Yup.string()
      .oneOf(['Mainnet', 'Preprod'], 'Please select a valid network')
      .required('Network is required'),
    walletAddress: Yup.string()
      .required('Wallet address is required.')
      .min(20, 'Address is too short')
      .max(150, 'Address is too long')
      .test('address-format', 'Invalid address format for selected network', function (value) {
        if (!value) return false;
        const { network } = this.parent as IFormValues;

        if (network === 'Mainnet') {
          return value.startsWith('addr1');
        } else {
          // Preprod addresses can start with either 'addr_test1' or 'preprod'
          return value.startsWith('addr_test1') || value.startsWith('preprod');
        }
      }),
  });

  // Load initial values from onboarding state or use defaults
  const initialValues: IFormValues = {
    walletName: settings?.spoofFormData?.walletName || '',
    walletAddress: settings?.spoofFormData?.walletAddress || '',
    network: settings?.spoofFormData?.network || 'Preprod',
  };

  const handleCancel = async () => {
    // Go back to add wallet selection
    navigate('/add-wallet');
  };

  const hasRequiredApiKey = (network: 'Mainnet' | 'Preprod') => {
    if (!settings) return false;
    return network === 'Mainnet' ? !!settings.mainnetApiKey : !!settings.preprodApiKey;
  };

  const handleFormSubmit = async (
    values: IFormValues,
    actions: {
      setSubmitting: (isSubmitting: boolean) => void;
      setFieldError: (field: string, message: string) => void;
    },
  ) => {
    // Save form data to onboarding state
    await devxSettings.updateSpoofFormData(values);

    // Check if we have the required API key for the selected network
    if (!hasRequiredApiKey(values.network)) {
      actions.setSubmitting(false);

      // Navigate to API key setup

      // Navigate to API key setup step
      navigate('/spoof-wallet/api-key');
      return;
    }

    // We have the API key, proceed with spoofing
    await spoofWallet(
      {
        walletName: values.walletName,
        network: values.network,
        walletAddress: values.walletAddress,
      },
      navigate,
    );
    actions.setSubmitting(false);
  };

  // Loading state
  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center">
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="mt-2 text-center text-sm">Create a wallet with a custom address for testing!</p>

      <Formik<IFormValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleFormSubmit}>
        {formikProps => (
          <SpoofWalletFormContent {...formikProps} handleCancel={handleCancel} hasRequiredApiKey={hasRequiredApiKey} />
        )}
      </Formik>
    </div>
  );
};

export default SpoofWalletForm;
