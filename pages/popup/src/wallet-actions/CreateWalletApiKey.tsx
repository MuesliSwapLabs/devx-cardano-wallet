import { useNavigate } from 'react-router-dom';
import { devxSettings, useStorage } from '@extension/storage';
import ApiKeySetup from '@src/components/ApiKeySetup';
import { createWallet } from '../utils/walletOperations';

const CreateWalletApiKey = () => {
  const navigate = useNavigate();
  const settings = useStorage(devxSettings);

  // Get network from settings or default to Preprod
  const network = settings?.createFormData.network || 'Preprod';

  const handleComplete = async () => {
    // Get form data from onboarding storage and create wallet directly
    const formData = settings?.createFormData;
    if (formData) {
      await createWallet(
        {
          walletName: formData.walletName,
          network: formData.network,
          password: formData.password,
        },
        navigate,
      );
    }
  };

  const handleCancel = () => {
    // Go back to the previous step (create wallet form)
    navigate('/create-new-wallet');
  };

  return (
    <ApiKeySetup
      network={network}
      onComplete={handleComplete}
      onCancel={handleCancel}
      title="API Key Required for New Wallet"
      subtitle={`Please enter your ${network} API key to continue creating the wallet.`}
    />
  );
};

export default CreateWalletApiKey;
