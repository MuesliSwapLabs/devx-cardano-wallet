import { ErrorMessage, Field, Form, Formik } from 'formik';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Yup from 'yup';
import { CancelButton, PrimaryButton } from '@src/components/buttons';
import FloatingLabelInput from '@src/components/FloatingLabelInput'; // Assuming this path is correct

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const navigate = useNavigate();

  const validationSchema = Yup.object({
    walletName: Yup.string().required('Wallet name is required'),
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
    walletPassword: '',
    confirmPassword: '',
    skipPassword: false,
  };

  const handleSubmit = values => {
    const newWallet = {
      name: values.walletName,
    };

    if (!values.skipPassword) {
      newWallet.password = values.walletPassword;
    }

    console.log('Creating new wallet:', newWallet);
    chrome.runtime.sendMessage({ type: 'createNewWallet', newWallet }, response => {
      console.log('Response create new wallet:', response);
      navigate('/onboarding/create-new-wallet-success');
    });
  };

  const handleCancel = () => {
    navigate('/onboarding/add-wallet');
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
                  onChange={e => {
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
