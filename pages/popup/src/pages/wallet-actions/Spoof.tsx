import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage, Field } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput';
import { useStorage, settingsStorage, Network } from '@extension/storage';

interface IFormValues {
  walletName: string;
  walletAddress: string;
}

const SpoofWallet = () => {
  const navigate = useNavigate();
  const settings = useStorage(settingsStorage);

  // ADAPTATION: Default network is now 'Preprod' as requested.
  const currentNetwork = settings?.network || 'Preprod';

  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required.'),
    walletAddress: Yup.string()
      .required('Wallet address is required.')
      .test(
        'address-format',
        () => {
          const expectedPrefix = currentNetwork === 'Mainnet' ? 'addr1' : 'addr_test1';
          return `Invalid ${currentNetwork} address. It must start with "${expectedPrefix}".`;
        },
        value => {
          if (!value) return false;
          const expectedPrefix = currentNetwork === 'Mainnet' ? 'addr1' : 'addr_test1';
          return value.startsWith(expectedPrefix);
        },
      ),
  });

  const initialValues: IFormValues = {
    walletName: '',
    walletAddress: '',
  };

  const handleCancel = () => {
    navigate('/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="text-center text-sm mt-2">
        Create a wallet with a custom address for the <span className="font-bold">{currentNetwork}</span> network!
      </p>

      <Formik<IFormValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        enableReinitialize
        onSubmit={(values, { setSubmitting, setFieldError }) => {
          const payload = {
            name: values.walletName,
            address: values.walletAddress,
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
        {({ errors, touched, isSubmitting }) => (
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
