import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import { useEffect } from 'react';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput';
import { devxSettings, useStorage } from '@extension/storage';
import { spoofWallet } from '../utils/walletOperations';

// Detect network from address prefix
function detectNetworkFromAddress(address: string): 'Mainnet' | 'Preprod' | null {
  if (!address) return null;
  if (address.startsWith('addr1')) return 'Mainnet';
  if (address.startsWith('addr_test1')) return 'Preprod';
  return null;
}

// Separate component for form content to properly use hooks
function SpoofWalletFormContent({ values, errors, touched, isSubmitting, handleCancel, hasRequiredApiKey }: any) {
  // Save form data whenever values change
  useEffect(() => {
    devxSettings.updateSpoofFormData(values);
  }, [values]);

  // Detect network from address
  const detectedNetwork = detectNetworkFromAddress(values.walletAddress);

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

        {/* Network detection indicator */}
        {detectedNetwork && (
          <div className="mt-2 text-xs">
            <span className="text-gray-600 dark:text-gray-400">
              Network: <span className="font-medium">{detectedNetwork}</span>
            </span>
            {hasRequiredApiKey(detectedNetwork) ? (
              <span className="ml-2 text-green-600 dark:text-green-400">✓ API key configured</span>
            ) : (
              <span className="ml-2 text-amber-600 dark:text-amber-400">⚠ API key will be requested</span>
            )}
          </div>
        )}
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
}

const SpoofWalletForm = () => {
  const navigate = useNavigate();
  const settings = useStorage(devxSettings);

  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required.'),
    walletAddress: Yup.string()
      .required('Wallet address is required.')
      .min(20, 'Address is too short')
      .max(150, 'Address is too long')
      .test('address-format', 'Invalid Cardano address format', function (value) {
        if (!value) return false;
        // Must start with addr1 (mainnet) or addr_test1 (testnet)
        return value.startsWith('addr1') || value.startsWith('addr_test1');
      }),
  });

  // Load initial values from onboarding state or use defaults
  const initialValues: IFormValues = {
    walletName: settings?.spoofFormData?.walletName || '',
    walletAddress: settings?.spoofFormData?.walletAddress || '',
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
    // Detect network from address
    const network = detectNetworkFromAddress(values.walletAddress);
    if (!network) {
      actions.setFieldError('walletAddress', 'Could not detect network from address');
      actions.setSubmitting(false);
      return;
    }

    // Save form data to onboarding state (include detected network for API key page)
    await devxSettings.updateSpoofFormData({ ...values, network });

    // Check if we have the required API key for the detected network
    if (!hasRequiredApiKey(network)) {
      actions.setSubmitting(false);
      // Navigate to API key setup step
      navigate('/spoof-wallet/api-key');
      return;
    }

    // We have the API key, proceed with spoofing
    await spoofWallet(
      {
        walletName: values.walletName,
        network,
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
