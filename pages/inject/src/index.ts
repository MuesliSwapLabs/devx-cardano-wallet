import { createDevXCIP30Provider } from './cip30-provider';

declare global {
  interface Window {
    cardano: {
      [name: string]: any;
    };
  }
}

// Inject DevX CIP-30 compliant wallet provider
window.cardano = {
  ...(window.cardano || {}),
  devx: createDevXCIP30Provider(),
};

export {};
