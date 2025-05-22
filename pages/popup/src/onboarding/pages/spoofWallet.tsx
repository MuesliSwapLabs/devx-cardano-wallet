import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';

const SpoofWallet = () => {
  const navigate = useNavigate();

  // Validation schema
  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required.'),
    walletAddress: Yup.string().required('Wallet address is required.'),
  });

  // Initial form values
  const initialValues = {
    walletName: '',
    walletAddress: '',
  };

  const handleSpoofWallet = values => {
    const spoofedWallet = {
      name: values.walletName,
      address: values.walletAddress,
      hasPassword: false,
    };

    //TODO: Implement
    // chrome.runtime.sendMessage({ type: 'SpoofWallet', spoofedWallet }, response => {
    //   navigate('/onboarding/spoof-wallet-success');
    // });
    alert('Not implemented yet. Redirecting to success anyway.');
    navigate('/onboarding/spoof-wallet-success'); // remove this line when implementing the above
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Spoof a wallet!</p>

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSpoofWallet}>
        {({ errors, touched }) => (
          <Form className="w-full max-w-sm flex flex-col flex-1">
            {/* Wallet Name */}
            <div className="mt-4 w-full">
              <label htmlFor="walletName" className="block text-sm font-medium text-gray-700">
                Wallet Name <span className="text-red-500">*</span>
              </label>
              <Field
                type="text"
                id="walletName"
                name="walletName"
                className={`mt-1 block w-full border ${
                  errors.walletName && touched.walletName ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 dark:text-black`}
                placeholder="My Wallet"
              />
              <ErrorMessage name="walletName" component="p" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Wallet Address */}
            <div className="mt-4 w-full">
              <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700">
                Wallet Address <span className="text-red-500">*</span>
              </label>
              <Field
                type="text"
                id="walletAddress"
                name="walletAddress"
                className={`mt-1 block w-full border ${
                  errors.walletAddress && touched.walletAddress ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 dark:text-black`}
                placeholder="Wallet Address"
              />
              <ErrorMessage name="walletAddress" component="p" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Navigation Buttons */}
            <div className="mt-auto flex justify-center space-x-4">
              <CancelButton type="button" onClick={handleCancel}>
                Cancel
              </CancelButton>
              <PrimaryButton type="submit">Spoof Wallet</PrimaryButton>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SpoofWallet;
