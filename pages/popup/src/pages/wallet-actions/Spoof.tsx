import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput';
import NetworkToggle from '@src/components/NetworkToggle';

interface IFormValues {
  walletName: string;
  walletAddress: string;
  network: 'Mainnet' | 'Preprod';
}

const SpoofWallet = () => {
  const navigate = useNavigate();

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
          return value.startsWith('addr_test1');
        }
      }),
  });

  const initialValues: IFormValues = {
    walletName: '',
    walletAddress: '',
    network: 'Preprod',
  };

  const handleCancel = () => {
    navigate('/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="text-center text-sm mt-2">Create a wallet with a custom address for testing!</p>

      <Formik<IFormValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={(values, { setSubmitting, setFieldError }) => {
          const payload = {
            name: values.walletName,
            address: values.walletAddress,
            network: values.network,
          };

          console.log('Spoofing wallet with payload:', payload);

          chrome.runtime.sendMessage(
            {
              type: 'SPOOF_WALLET',
              payload: payload,
            },
            response => {
              setSubmitting(false);

              if (chrome.runtime.lastError) {
                setFieldError('walletAddress', 'An unexpected error occurred. Please try again.');
                return;
              }

              if (response?.success) {
                navigate('/spoof-wallet-success');
              } else {
                console.log('Spoof wallet response error:', response?.error);
                setFieldError('walletAddress', response?.error || 'Failed to spoof wallet.');
              }
            },
          );
        }}>
        {({ values, errors, touched, isSubmitting, setFieldValue }) => (
          <Form className="w-full max-w-sm flex flex-col h-full mt-4">
            <div className="mb-4">
              <Field
                name="walletName"
                as={FloatingLabelInput}
                label="Wallet Name"
                type="text"
                required
                error={touched.walletName && errors.walletName}
              />
              <ErrorMessage name="walletName" component="p" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Network Selection Field */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Network <span className="text-red-500">*</span>
              </label>
              <NetworkToggle value={values.network} onChange={network => setFieldValue('network', network)} />
              <ErrorMessage name="network" component="p" className="text-red-500 text-xs mt-1" />
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
              <ErrorMessage name="walletAddress" component="p" className="text-red-500 text-sm mt-1" />
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
        )}
      </Formik>
    </div>
  );
};

export default SpoofWallet;
