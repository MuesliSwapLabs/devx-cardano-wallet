import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { PrimaryButton, CancelButton } from '@src/components/buttons';

interface CreateNewWalletProps {}

const CreateNewWallet = ({}: CreateNewWalletProps) => {
  const navigate = useNavigate();

  // Validation schema
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
    // Create a base wallet object
    const newWallet = {
      name: values.walletName,
    };

    // Only add password if not skipped
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
      {/* Title & Subtitle */}
      <h2 className="text-xl font-medium">New Wallet</h2>
      <p className="text-center text-lg text-gray-600 mt-2">Create a new wallet!</p>

      {/* Formik Form */}
      <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
        {({ values, errors, touched, setFieldValue, setFieldError, setFieldTouched }) => (
          <Form className="mt-4 w-full h-fullmax-w-sm">
            {/* Wallet Name Field */}
            <div className="mb-4">
              <label htmlFor="walletName" className="block text-xs font-medium text-gray-500 text-left mb-1">
                Wallet Name <span className="text-red-500">*</span>
              </label>
              <Field
                type="text"
                id="walletName"
                name="walletName"
                className={`w-full border ${
                  errors.walletName && touched.walletName ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 dark:text-black`}
                placeholder="My Wallet"
              />
              <ErrorMessage name="walletName" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Wallet Password Field */}
            <div className="mb-4">
              <label htmlFor="walletPassword" className="block text-xs font-medium text-gray-500 text-left mb-1">
                Password {!values.skipPassword && <span className="text-red-500">*</span>}
              </label>
              <Field
                type="password"
                id="walletPassword"
                name="walletPassword"
                disabled={values.skipPassword}
                className={`w-full border ${
                  errors.walletPassword && touched.walletPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 dark:text-black ${values.skipPassword ? 'bg-gray-100' : ''}`}
                placeholder={values.skipPassword ? 'Password disabled' : 'Enter password'}
              />
              <ErrorMessage name="walletPassword" component="p" className="text-red-500 text-xs mt-1" />
            </div>

            {/* Confirm Password Field */}
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-xs font-medium text-gray-500 text-left mb-1">
                Confirm Password {!values.skipPassword && <span className="text-red-500">*</span>}
              </label>
              <Field
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                disabled={values.skipPassword}
                className={`w-full border ${
                  errors.confirmPassword && touched.confirmPassword ? 'border-red-500' : 'border-gray-300'
                } rounded-md p-2 dark:text-black ${values.skipPassword ? 'bg-gray-100' : ''}`}
                placeholder={values.skipPassword ? 'Password disabled' : 'Confirm password'}
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
                      // Clear field values
                      setFieldValue('walletPassword', '');
                      setFieldValue('confirmPassword', '');

                      // Clear validation errors
                      setFieldError('walletPassword', undefined);
                      setFieldError('confirmPassword', undefined);

                      // Clear touched state
                      setFieldTouched('walletPassword', false);
                      setFieldTouched('confirmPassword', false);
                    }
                  }}
                />
                <label htmlFor="skipPassword" className="block text-xs text-gray-700 text-left">
                  Create wallet without a password. I understand the security risks.
                </label>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="mt-6 flex space-x-4 justify-center">
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
