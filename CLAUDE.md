# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build & Development:**
- `pnpm dev` - Start development mode with hot reload (Chrome)
- `pnpm dev:firefox` - Start development mode for Firefox
- `pnpm build` - Production build for Chrome
- `pnpm build:firefox` - Production build for Firefox
- `pnpm zip` - Build and create extension zip for Chrome
- `pnpm zip:firefox` - Build and create extension zip for Firefox

**Code Quality:**
- `pnpm type-check` - Run TypeScript type checking across all packages
- `pnpm lint` - Run ESLint with auto-fix across all packages
- `pnpm lint:fix` - Run ESLint with fix mode
- `pnpm prettier` - Format code with Prettier
- `pnpm update-version` - Update extension version using bash script

**Testing:**
- `./test.sh` - Test Blockfrost API connectivity (preprod network)
- `./get_transactions.sh <address> [api_key]` - Comprehensive transaction fetcher with detailed analysis, pagination support, and JSON output
  - Fetches all transactions for a Cardano address with full transaction details
  - Supports both payment addresses and stake addresses with automatic address type detection
  - Includes account balance, transaction history, and UTXO analysis
  - Outputs detailed JSON file with timestamped filename for analysis
  - Handles pagination automatically for wallets with many transactions
- `./update_version.sh` - Update extension version using bash script (also available as `pnpm update-version`)
- **Note**: E2E test infrastructure has been removed as it was not being used

**Cleaning:**
- `pnpm clean:bundle` - Clean dist folders
- `pnpm clean:node_modules` - Clean all node_modules
- `pnpm clean` - Full clean (bundle + turbo + node_modules)
- `pnpm clean:install` - Clean and reinstall dependencies

**Package Management:**
- `pnpm i <package> -w` - Install dependency in root workspace
- `pnpm i <package> -F <module>` - Install dependency in specific module

## Architecture Overview

This is **DevX - A developer-focused Cardano wallet Chrome extension** built with React, TypeScript, and Vite in a monorepo structure using pnpm workspaces and Turborepo. The project is based on a Chrome extension boilerplate but has been customized for Cardano wallet functionality. **This wallet is designed for development purposes only and should NOT be used with real funds or for production transactions.**

### Key Technologies
- **Cardano Integration**: Uses `@emurgo/cardano-serialization-lib-browser` for Cardano blockchain operations
- **CIP-30 Support**: Implements Cardano Improvement Proposal 30 for dApp wallet connectivity
- **Crypto Operations**: Uses `@scure/bip39` for mnemonic generation and `bip39` for wallet derivation
- **Build System**: Turborepo + Vite for fast builds and hot reload
- **UI**: React + TailwindCSS with dark/light theme support
- **Form Handling**: Formik + Yup for form validation and management
- **Extension APIs**: Comprehensive Chrome extension API integration with TypeScript support

### Project Structure

**Core Extension:**
- `chrome-extension/` - Main extension with background scripts and manifest
- `pages/popup/` - Main wallet UI (React app shown when clicking extension icon)
- `pages/inject/` - CIP-30 provider injection script for dApp connectivity

**Shared Packages:**
- `packages/wallet-manager/` - Core wallet business logic (creation, import, management)
- `packages/blockchain-provider/` - Cardano blockchain interaction layer with type-safe Blockfrost client
- `packages/shared/` - Common types (including branded address types), messaging system, and shared utilities
- `packages/storage/` - Chrome storage API wrappers with React hooks
- `packages/ui/` - Shared UI components and design system
- `packages/hmr/` - Hot module replacement system for development
- `packages/vite-config/` - Shared Vite configuration
- `packages/tailwind-config/` - Shared Tailwind CSS configuration
- `packages/tsconfig/` - TypeScript configuration presets
- `packages/i18n/` - Internationalization and localization system
- `packages/dev-utils/` - Development utilities and scripts
- `packages/zipper/` - Extension packaging utilities

**Additional Pages:**
- `pages/content/` - Content scripts for web page interaction
- `pages/content-runtime/` - Runtime content script helpers
- `pages/devtools/` - Browser developer tools integration
- `pages/devtools-panel/` - Developer tools panel implementation
- `pages/options/` - Extension settings page
- `pages/side-panel/` - Chrome side panel integration
- `pages/new-tab/` - New tab page functionality

### Communication Architecture

The extension uses Chrome's message passing system:
- **Background Script** (`chrome-extension/src/background/`): Central message router handling CIP-30 and wallet operations
- **Popup UI** (`pages/popup/`): Sends messages to background for wallet operations
- **Content Scripts**: Handle dApp communication via CIP-30 protocol
- **Message Types**: Defined in `packages/shared/lib/messaging/`

### Wallet Architecture

**Wallet Management** (`packages/wallet-manager/`):
- Handles wallet creation, import from seed phrases, and "spoof" wallets for testing
- **Wallet Spoofing**: Create read-only wallets from any Cardano address for testing dApp interactions
- Uses BIP39 for mnemonic generation and Cardano derivation paths
- Integrates with Chrome storage for persistence
- **Reduced Security**: Optional passwords and relaxed security constraints for development workflow

**Blockchain Provider** (`packages/blockchain-provider/`):
- Abstracts blockchain operations with type-safe Blockfrost client
- Handles Cardano network interactions with structured error handling
- Supports both mainnet and testnet
- Features branded address types (StakeAddress, BaseAddress, EnterpriseAddress) for type safety

**CIP-30 Implementation**:
- Located in `chrome-extension/src/background/cip30.ts` and related handlers
- Enables dApp connectivity following Cardano's wallet connector standard
- Handles wallet connection requests, transaction signing, and balance queries

### Storage System

The extension uses a **dual storage approach** with Chrome's storage APIs providing consistent data sharing across all extension contexts:

**IndexedDB (ConsolidatedStorage)** (`packages/storage/lib/impl/consolidatedStorage.ts`):
- Primary storage for wallet data, transactions, and UTXOs
- Consolidated database (`cardano-wallet`) with multiple object stores:
  - `settings`: App configuration, API keys, theme, onboarding state
  - `wallets`: Wallet metadata and configuration
  - `transactions`: Transaction history with enhanced data
  - `utxos`: UTXO tracking with spent/unspent status including external UTXO detection
- Provides fast querying with indexed access by wallet ID

**Chrome Storage** (Legacy/Fallback):
- Onboarding flow state management (`packages/storage/lib/impl/onboardingStorage.ts`)
- Temporary form data during wallet creation/import flows
- **React Hooks**: `useStorage` for reactive storage access in components
- **Shared State**: Storage state is shared between popup, background, and content scripts automatically

### UI Architecture

The popup uses React Router with multiple layouts:
- **OnboardingLayout**: Welcome flow for new users
- **MainLayout**: Main wallet interface with asset view and transaction history
- **WalletActionLayout**: Wallet creation/import flows
- **SubPageLayout**: Settings and configuration pages

### Build System

- **Turborepo**: Manages monorepo builds with caching and parallelization
- **Vite**: Fast development with HMR support
- **TypeScript**: Strict type checking across all packages
- **ESLint + Prettier**: Code formatting with Tailwind CSS linting

### Development Workflow

1. **Package Manager**: Uses pnpm with workspaces (requires pnpm@9.9.0)
2. **Hot Module Replacement**: Custom HMR system in `packages/hmr/`
3. **Cross-browser**: Supports both Chrome and Firefox builds
4. **Environment Variables**: Vite-based env system with type safety
5. **Development Mode**: Run `pnpm dev` for Chrome or `pnpm dev:firefox` for Firefox with hot reload
6. **Extension Loading**: Load `dist` folder as unpacked extension in browser

### Testing Infrastructure

- **Unit Tests**: No unit test framework currently configured (E2E test infrastructure has been removed)
- **Blockchain Testing**: `test.sh` script for testing Cardano network connectivity via Blockfrost API
- **Transaction Analysis**: `get_transactions.sh` script for comprehensive transaction data fetching and analysis
- **API Keys Required**: Both mainnet and preprod Blockfrost API keys needed for full functionality

### Environment Configuration

- **Environment Variables**: Copy `.example.env` to `.env` for configuration
- **API Keys**: Configure Blockfrost API keys for mainnet and preprod networks
- **Vite Environment**: Access via `import.meta.env.{KEY}` with type definitions in `vite-env.d.ts`
- **Node Version**: Requires Node.js >= 18.19.1
- **Package Manager**: Requires pnpm >= 9.9.0 (`npm install -g pnpm`)
- **Windows Setup**: Run `git config --global core.eol lf` and `git config --global core.autocrlf input` for cross-platform compatibility

### Data Migration & Recent Improvements

Recent architectural changes and improvements include:

**Storage Migration:**
- Transaction data moved from Chrome storage to IndexedDB for better performance
- UTXO tracking includes spent/unspent status for accurate balance calculation including external UTXO detection
- Wallet metadata includes sync timestamps for incremental updates
- Improved UTXO details UI with better visual organization and expanded view functionality
- Enhanced wallet state handling for new wallets that don't exist on-chain yet
- Added CIP-30 methods for retrieving unused and change addresses

**Blockfrost Client Refactoring (Completed):**
- Implemented type-safe Blockfrost client with branded address types
- Created comprehensive error handling system with structured error types
- Added support for all major Blockfrost endpoints with pagination
- Established clear separation between HTTP client and business logic
- Full TypeScript type safety with 1:1 API mapping
- **Next Steps**: Integration of new client into existing provider layer

### Development Best Practices

Always run `pnpm type-check` and `pnpm lint` before committing to ensure code quality. The project uses strict TypeScript configuration and comprehensive ESLint rules including accessibility and Tailwind CSS checks.

**Message Passing Architecture:**
- All communication between popup, background, and content scripts uses Chrome's `chrome.runtime` messaging system
- Popup sends requests via `chrome.runtime.sendMessage()`
- Background script handles requests via `chrome.runtime.onMessage.addListener()`
- Both contexts import shared code from packages for consistent data handling