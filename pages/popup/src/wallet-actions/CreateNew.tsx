import { ErrorMessage, Field, Form, Formik } from 'formik';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { CancelButton, PrimaryButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput';
import NetworkToggle from '@src/components/NetworkToggle';
import { generateMnemonic, deriveAddressFromMnemonic, generateRootKeyFromMnemonic } from '../utils/crypto';

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const navigate = useNavigate();

  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required'),
    network: Yup.string()
      .oneOf(['Mainnet', 'Preprod'], 'Please select a valid network')
      .required('Network is required'),
    walletPassword: Yup.string().when('skipPassword', {
      is: false,
      then: schema => schema.required('Password is required'),
    }),
    confirmPassword: Yup.string().when('skipPassword', {
      is: false,
      then: schema =>
        schema
          .required('Please confirm your password')
          .oneOf([Yup.ref('walletPassword')], 'Passwords do not match. Please check and try again.'),
    }),
    skipPassword: Yup.boolean(),
  });

  const initialValues = {
    walletName: '',
    network: 'Preprod' as 'Mainnet' | 'Preprod',
    walletPassword: '',
    confirmPassword: '',
    skipPassword: false,
  };

  const handleSubmit = async (values: any) => {
    try {
      console.log('UI: Generating mnemonic and deriving address...');

      // Generate mnemonic and derive address in frontend (popup context)
      const seedPhrase = await generateMnemonic();
      const { address } = await deriveAddressFromMnemonic(seedPhrase, values.network);
      const rootKey = await generateRootKeyFromMnemonic(seedPhrase);

      console.log('UI: Generated seedPhrase, address, and rootKey successfully');

      // Prepare the data payload with crypto operations completed
      const payload = {
        name: values.walletName,
        network: values.network,
        password: values.skipPassword ? undefined : values.walletPassword,
        seedPhrase: seedPhrase,
        address: address,
        rootKey: rootKey,
      };

      console.log('UI: Sending CREATE_WALLET message with payload:', payload);

      // Send the complete data to the background script for storage
      chrome.runtime.sendMessage(
        {
          type: 'CREATE_WALLET',
          payload: payload,
        },
        // Handle the response from the background script
        response => {
          // Check for errors during message sending itself
          if (chrome.runtime.lastError) {
            console.error('Message sending failed:', chrome.runtime.lastError.message);
            // TODO: Display an error message to the user
            return;
          }

          // Handle the response from our background logic
          if (response?.success) {
            console.log('UI: Wallet created successfully!', response.wallet);
            navigate('/create-new-wallet-success');
          } else {
            console.error('UI: Failed to create wallet:', response?.error);
            // TODO: Display a meaningful error message to the user
          }
        },
      );
    } catch (error) {
      console.error('UI: Failed to generate wallet data:', error);
      // TODO: Display error message to user
    }
  };

  const handleCancel = () => {
    navigate('/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium">New Wallet</h2>
      <p className="text-center text-sm mt-2">Create a new wallet!</p>

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ values, errors, touched, setFieldValue, setFieldError, setFieldTouched }) => (
          <Form className="flex flex-col mt-4 w-full max-w-sm h-full">
            {/* Wallet Name Field */}
            <div className="mb-4">
              <FloatingLabelInput
                name="walletName"
                label="Wallet Name"
                type="text"
                required
                error={touched.walletName && errors.walletName}
              />
              <ErrorMessage name="walletName" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Network Selection Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Network <span className="text-red-500">*</span>
              </label>
              <NetworkToggle value={values.network} onChange={network => setFieldValue('network', network)} />
              <ErrorMessage name="network" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Wallet Password Field */}
            <div className="mb-4">
              <FloatingLabelInput
                name="walletPassword"
                label="Password"
                type="password"
                disabled={values.skipPassword}
                required={!values.skipPassword}
                error={touched.walletPassword && errors.walletPassword}
              />
              <ErrorMessage name="walletPassword" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Confirm Password Field */}
            <div className="mb-4">
              <FloatingLabelInput
                name="confirmPassword"
                label="Confirm Password"
                type="password"
                disabled={values.skipPassword}
                required={!values.skipPassword}
                error={touched.confirmPassword && errors.confirmPassword}
              />
              <ErrorMessage name="confirmPassword" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Password Skip Option */}
            <div className="mb-4">
              <div className="flex items-start">
                <Field
                  type="checkbox"
                  id="skipPassword"
                  name="skipPassword"
                  className="w-4 h-4 mt-0.5 mr-2"
                  onChange={(e: any) => {
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
                <label htmlFor="skipPassword" className="block text-xs text-left">
                  Create wallet without a password. I understand the security risks.
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-auto flex space-x-4 justify-center">
              <CancelButton type="button" onClick={handleCancel}>
                Cancel
              </CancelButton>
              <PrimaryButton type="submit">Create</PrimaryButton>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default CreateNewWallet;
