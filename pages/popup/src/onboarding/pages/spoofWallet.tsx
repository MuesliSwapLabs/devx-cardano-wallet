import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput'; // Make sure this path is correct

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
      <p className="text-center text-sm mt-2">Create a wallet with a custom address!</p>

      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSpoofWallet}>
        {({ errors, touched }) => (
          <Form className="w-full max-w-sm flex flex-col h-full mt-4">
            {/* Wallet Name */}
            <div className="mb-4">
              <FloatingLabelInput
                name="walletName"
                label="Wallet Name"
                type="text"
                required
                error={touched.walletName && errors.walletName}
              />
              <ErrorMessage name="walletName" component="p" className="text-red-500 text-sm mt-1" />
            </div>

            {/* Wallet Address */}
            <div className="mb-4">
              <FloatingLabelInput
                name="walletAddress"
                label="Wallet Address"
                type="text"
                required
                error={touched.walletAddress && errors.walletAddress}
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
