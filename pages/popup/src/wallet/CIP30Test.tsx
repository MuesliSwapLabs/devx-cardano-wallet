import React, { useState, useEffect } from 'react';
import type { Wallet } from '@extension/shared';
import { generateMnemonic, mnemonicToEntropy } from 'bip39';
import { Buffer } from 'buffer';
window.Buffer = Buffer;
import Loader from './loader';

interface CIP30TestProps {
  wallet: Wallet;
}

export const cardanoInit = async () => {
  await Loader.load();
};

function harden(num: number): number {
  return 0x80000000 + num;
}

const CIP30Test: React.FC<CIP30TestProps> = ({ wallet }) => {
  const [isLoaded, setIsLoaded] = useState(false);

  // Step results
  const [step1Mnemonic, setStep1Mnemonic] = useState('');
  const [step2Entropy, setStep2Entropy] = useState('');
  const [step3MasterKey, setStep3MasterKey] = useState('');
  const [step4AccountKey, setStep4AccountKey] = useState('');
  const [step5PaymentKey, setStep5PaymentKey] = useState('');
  const [step5StakingKey, setStep5StakingKey] = useState('');
  const [step6PaymentPubKey, setStep6PaymentPubKey] = useState('');
  const [step6StakingPubKey, setStep6StakingPubKey] = useState('');
  const [step7BaseAddress, setStep7BaseAddress] = useState('');
  const [step8EnterpriseAddress, setStep8EnterpriseAddress] = useState('');
  const [step9StakingAddress, setStep9StakingAddress] = useState('');

  useEffect(() => {
    const initCardano = async () => {
      try {
        await cardanoInit();
        setIsLoaded(true);

        // Step 1: Generate random fucking words
        const mnemonic = generateMnemonic(160); // 128 bits = 12 words
        setStep1Mnemonic(mnemonic);

        // Step 2: Convert words to entropy
        const entropy = mnemonicToEntropy(mnemonic);
        setStep2Entropy(entropy);

        // Step 3: Generate master private key
        const masterKey = Loader.Cardano.Bip32PrivateKey.from_bip39_entropy(
          Buffer.from(entropy, 'hex'),
          Buffer.from(''),
        );
        setStep3MasterKey('Master key created successfully');

        // Step 4: Derive account key
        const accountKey = masterKey
          .derive(harden(1852)) // purpose
          .derive(harden(1815)) // coin type (ADA)
          .derive(harden(0)); // account 0
        setStep4AccountKey('Account key derived successfully');

        // Step 5: Derive payment and staking keys
        const paymentKey = accountKey
          .derive(0) // external chain
          .derive(0); // address index 0

        const stakingKey = accountKey
          .derive(2) // staking chain
          .derive(0); // staking index 0

        setStep5PaymentKey('Payment key derived successfully');
        setStep5StakingKey('Staking key derived successfully');

        // Step 6: Get public keys
        const paymentPubKey = paymentKey.to_public();
        const stakingPubKey = stakingKey.to_public();

        // Try to get hex representation
        try {
          if (paymentPubKey.to_hex) {
            setStep6PaymentPubKey(paymentPubKey.to_hex());
          } else if (paymentPubKey.to_bytes) {
            setStep6PaymentPubKey(Buffer.from(paymentPubKey.to_bytes()).toString('hex'));
          } else {
            setStep6PaymentPubKey('Payment public key created');
          }
        } catch (e) {
          setStep6PaymentPubKey('Payment public key created');
        }

        try {
          if (stakingPubKey.to_hex) {
            setStep6StakingPubKey(stakingPubKey.to_hex());
          } else if (stakingPubKey.to_bytes) {
            setStep6StakingPubKey(Buffer.from(stakingPubKey.to_bytes()).toString('hex'));
          } else {
            setStep6StakingPubKey('Staking public key created');
          }
        } catch (e) {
          setStep6StakingPubKey('Staking public key created');
        }

        // Step 7: Create base address (payment + staking)
        try {
          // Try different network ID approaches
          let networkId;
          if (Loader.Cardano.NetworkInfo && Loader.Cardano.NetworkInfo.testnet) {
            networkId = Loader.Cardano.NetworkInfo.testnet().network_id();
          } else if (Loader.Cardano.NetworkId) {
            networkId = 0; // testnet = 0, mainnet = 1
          } else {
            networkId = 0; // default to testnet
          }

          const baseAddress = Loader.Cardano.BaseAddress.new(
            networkId,
            Loader.Cardano.Credential.from_keyhash(paymentPubKey.to_raw_key().hash()),
            Loader.Cardano.Credential.from_keyhash(stakingPubKey.to_raw_key().hash()),
          );
          setStep7BaseAddress(baseAddress.to_address().to_bech32());
        } catch (e) {
          setStep7BaseAddress(`Error creating base address: ${e.message}`);
        }

        // Step 8: Create enterprise address (payment only)
        try {
          let networkId = 0; // testnet
          const enterpriseAddress = Loader.Cardano.EnterpriseAddress.new(
            networkId,
            Loader.Cardano.Credential.from_keyhash(paymentPubKey.to_raw_key().hash()),
          );
          setStep8EnterpriseAddress(enterpriseAddress.to_address().to_bech32());
        } catch (e) {
          setStep8EnterpriseAddress(`Error creating enterprise address: ${e.message}`);
        }

        // Step 9: Create staking address (for rewards)
        try {
          let networkId = 0; // testnet
          const rewardAddress = Loader.Cardano.RewardAddress.new(
            networkId,
            Loader.Cardano.Credential.from_keyhash(stakingPubKey.to_raw_key().hash()),
          );
          setStep9StakingAddress(rewardAddress.to_address().to_bech32());
        } catch (e) {
          setStep9StakingAddress(`Error creating staking address: ${e.message}`);
        }
      } catch (error) {
        console.error('Failed to load Cardano library:', error);
      }
    };

    initCardano();
  }, []);

  if (!isLoaded) {
    return <div>Loading Cardano library...</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-md font-semibold mb-2 border-b border-gray-300 dark:border-gray-600">
        Complete Cardano Wallet Generation
      </h3>

      <div className="space-y-3">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 1: Generate Random Words</h4>
          <p className="text-sm break-all">{step1Mnemonic}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 2: Convert to Entropy</h4>
          <p className="text-sm break-all">{step2Entropy}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 3: Master Private Key</h4>
          <p className="text-sm">{step3MasterKey}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 4: Account Key</h4>
          <p className="text-sm">{step4AccountKey}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 5: Payment & Staking Keys</h4>
          <p className="text-sm">Payment: {step5PaymentKey}</p>
          <p className="text-sm">Staking: {step5StakingKey}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 6: Public Keys</h4>
          <p className="text-sm break-all">Payment: {step6PaymentPubKey}</p>
          <p className="text-sm break-all">Staking: {step6StakingPubKey}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 7: Base Address (Payment + Staking)</h4>
          <p className="text-sm break-all">{step7BaseAddress}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 8: Enterprise Address (Payment Only)</h4>
          <p className="text-sm break-all">{step8EnterpriseAddress}</p>
        </div>

        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded">
          <h4 className="font-semibold text-green-600">Step 9: Staking Address (Rewards)</h4>
          <p className="text-sm break-all">{step9StakingAddress}</p>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded border-l-4 border-blue-500">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300">Summary</h4>
          <p className="text-sm">✅ Generated secure mnemonic from crypto-random entropy</p>
          <p className="text-sm">✅ Created master key using BIP39 standard</p>
          <p className="text-sm">✅ Derived payment and staking keys using BIP32/BIP44</p>
          <p className="text-sm">✅ Generated multiple address types for different purposes</p>
        </div>
      </div>
    </div>
  );
};

export default CIP30Test;
