// popup/src/layouts/WalletActionLayout.tsx
import { useStorage, appStateStorage, walletsStorage } from '@extension/storage';
import { Outlet } from 'react-router-dom';
import OnboardingLayout from './OnboardingLayout';
import SubPageLayout from './SubPageLayout';

/**
 * WalletActionLayout is a dynamic layout component.
 * It checks if the user is already onboarded and has wallets,
 * then renders the appropriate layout shell for the wallet creation pages.
 */
function WalletActionLayout() {
  const wallets = useStorage(walletsStorage);
  const appState = useStorage(appStateStorage);

  const hasWallets = wallets && wallets.length > 0;
  const isOnboarded = appState?.onboarded && hasWallets;

  // If the user is already onboarded, use the SubPageLayout with a back button.
  // Otherwise, use the full OnboardingLayout for the first-time flow.
  const Layout = isOnboarded ? SubPageLayout : OnboardingLayout;

  // The Outlet renders the actual page (e.g., AddWallet) inside the chosen layout.
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default WalletActionLayout;
