import { useNavigate } from 'react-router-dom';
import { Formik, Form, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput'; // Make sure this path is correct

// Define the shape of our form's data
interface IFormValues {
  walletName: string;
  walletAddress: string;
}

const SpoofWallet = () => {
  const navigate = useNavigate();

  // Validation schema
  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required.'),
    walletAddress: Yup.string().required('Wallet address is required.'),
  });

  // Initial form values, typed with our interface
  const initialValues: IFormValues = {
    walletName: '',
    walletAddress: '',
  };

  const handleSpoofWallet = (values: IFormValues) => {
    // 1. Prepare the data payload from the form values.
    const payload = {
      name: values.walletName,
      address: values.walletAddress,
    };

    console.log('UI: Sending SPOOF_WALLET message with payload:', payload);

    // 2. Send the message to the background script.
    chrome.runtime.sendMessage(
      {
        type: 'SPOOF_WALLET',
        payload: payload,
      },
      // 3. Handle the response from the background script.
      response => {
        if (chrome.runtime.lastError) {
          console.error('Message sending failed:', chrome.runtime.lastError.message);
          // TODO: Display an error message to the user
          return;
        }

        if (response?.success) {
          console.log('UI: Spoofed wallet added successfully!', response.wallet);
          navigate('/onboarding/spoof-wallet-success');
        } else {
          console.error('UI: Failed to spoof wallet:', response?.error);
          // TODO: Display an error message to the user
        }
      },
    );
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
  };

  return (
    <div className="flex flex-col items-center h-full">
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">Spoof Wallet</h2>
      <p className="text-center text-sm mt-2">Create a wallet with a custom address!</p>

      {/* Provide the IFormValues type to Formik */}
      <Formik<IFormValues>
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSpoofWallet}>
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
