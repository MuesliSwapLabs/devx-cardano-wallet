import { Formik, Form, Field } from 'formik';
import { settingsStorage, useStorage } from '@extension/storage';
import FloatingLabelInput from './FloatingLabelInput';
import { PrimaryButton, CancelButton } from './buttons';

interface ApiKeySetupProps {
  network: 'Mainnet' | 'Preprod';
  onComplete: () => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

const isValidBlockfrostKey = (key: string, network: 'Mainnet' | 'Preprod'): boolean => {
  if (!key) return false;
  const prefix = network === 'Mainnet' ? 'mainnet' : 'preprod';
  const expectedLength = 32;
  if (!key.startsWith(prefix)) return false;
  const secretPart = key.substring(prefix.length);
  if (secretPart.length !== expectedLength) return false;
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(secretPart);
};

const ApiKeySetup = ({ network, onComplete, onCancel, title, subtitle }: ApiKeySetupProps) => {
  const settings = useStorage(settingsStorage);

  const defaultTitle = `${network} API Key Required`;
  const defaultSubtitle = `Please enter your Blockfrost ${network} API key to continue with this wallet.`;

  const handleSubmit = async (apiKey: string) => {
    if (network === 'Mainnet') {
      await settingsStorage.setMainnetApiKey(apiKey);
    } else {
      await settingsStorage.setPreprodApiKey(apiKey);
    }
    onComplete();
  };

  return (
    <div className="flex flex-col items-center h-full">
      <h2 className="text-xl font-medium text-center">{title || defaultTitle}</h2>
      <p className="text-center text-sm mt-2 mb-4 text-gray-600 dark:text-gray-300">{subtitle || defaultSubtitle}</p>

      <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          Get your API key from{' '}
          <a
            href="https://blockfrost.io/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-600 dark:hover:text-blue-400">
            Blockfrost Dashboard
          </a>
        </p>
      </div>

      <Formik
        initialValues={{ apiKey: '' }}
        validate={values => {
          if (!values.apiKey) {
            return { apiKey: 'API key is required' };
          }
          if (!isValidBlockfrostKey(values.apiKey, network)) {
            return { apiKey: `Invalid ${network} API key format` };
          }
          return {};
        }}
        onSubmit={(values, { setSubmitting }) => {
          setSubmitting(true);
          handleSubmit(values.apiKey).finally(() => {
            setSubmitting(false);
          });
        }}>
        {({ values, errors, touched, isSubmitting, isValid }) => (
          <Form className="w-full max-w-sm flex flex-col h-full mt-4">
            <div className="mb-4">
              <Field
                name="apiKey"
                as={FloatingLabelInput}
                label={`${network} API Key`}
                type="password"
                required
                error={touched.apiKey && errors.apiKey}
              />
              {errors.apiKey && touched.apiKey && <p className="text-red-500 text-sm mt-1">{errors.apiKey}</p>}
              {values.apiKey && !errors.apiKey && <p className="text-green-500 text-sm mt-1">Valid API key format</p>}
            </div>

            <div className="mt-auto flex justify-center space-x-4">
              {onCancel && (
                <CancelButton type="button" onClick={onCancel}>
                  Cancel
                </CancelButton>
              )}
              <PrimaryButton type="submit" disabled={isSubmitting || !isValid}>
                {isSubmitting ? 'Saving...' : 'Continue'}
              </PrimaryButton>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default ApiKeySetup;
