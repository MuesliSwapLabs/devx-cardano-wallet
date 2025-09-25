# Wallet Package Refactoring Plan

## Task 1: Merge blockchain-provider and wallet-manager

### Current Problems
- **Artificial Separation**: Two packages that are tightly coupled and don't justify being separate
- **Circular Dependency Risk**: wallet-manager imports from blockchain-provider
- **Mixed Concerns**: blockchain-provider contains business logic alongside API calls
- **Thin wallet-manager**: Only handles wallet object creation, too small for separate package

### Current Structure
```
packages/blockchain-provider/
├── lib/
│   ├── provider.ts           # Business logic + API calls (mixed concerns)
│   ├── syncService.ts        # NOT USED - obsolete
│   └── blockfrost-client.ts  # New 1:1 API client (not integrated)

packages/wallet-manager/
├── lib/
│   └── manager.ts           # Just wallet creation/import/spoof
```

### Proposed Structure
```
packages/wallet/
├── api/
│   └── blockfrost-client.ts  # Pure 1:1 Blockfrost API mapping
├── wallet-service.ts         # ALL wallet business logic
└── index.ts                  # Clean exports
```

### File Responsibilities

#### **api/blockfrost-client.ts**
- **Purpose**: Pure API layer with 1:1 mapping to Blockfrost endpoints
- **What it does**:
  - HTTP calls to Blockfrost API
  - Type-safe branded address parameters
  - Structured error handling
  - Pagination support
- **What it does NOT do**:
  - No business logic
  - No storage access
  - No data transformation beyond JSON parsing

#### **wallet-service.ts**
- **Purpose**: All wallet operations and business logic
- **What it does**:
  - **Wallet Creation**: `createWallet()`, `importWallet()`, `spoofWallet()`
  - **Wallet Operations**: `getWalletState()`, `getWalletTransactions()`, `getWalletUTXOs()`
  - **Password Management**: Encryption, validation, changes
  - **Multi-Address Logic**: Orchestrating calls across payment addresses
  - **UTXO Analysis**: Determining spent/unspent status
  - **Storage Interactions**: Reading/writing wallet data, transactions, UTXOs
  - **Business Logic**: Converting API responses to internal wallet formats

### Benefits of Merge
1. **Eliminates Artificial Boundaries**: All wallet logic in one logical place
2. **Reduces Complexity**: Fewer packages to understand and maintain
3. **Prevents Circular Dependencies**: Internal files can reference each other safely
4. **Better Organization**: Clear separation between API layer and business layer within package
5. **Easier Development**: New developers look in one package for wallet functionality

### Migration Steps
1. Create new `packages/wallet/` structure
2. Move `blockfrost-client.ts` to `packages/wallet/api/`
3. Merge `provider.ts` and `manager.ts` business logic into `wallet-service.ts`
4. Update all imports across codebase
5. Remove old packages
6. Delete obsolete `syncService.ts`

## Task 2: Move WASM Operations to Offscreen API

### Current Problems
- **Business logic in UI**: Cryptographic operations (key generation, address derivation) happen in popup
- **Security concerns**: Sensitive data (mnemonics, private keys) passed through Chrome message system
- **Architectural violation**: UI layer contains core wallet business logic
- **Duplication risk**: WASM operations can't be reused outside popup context
- **Testing complexity**: Crypto operations require browser context to test

### Current WASM Usage Locations
**In Popup Context:**
- `pages/popup/src/utils/crypto.ts` - Key generation and address derivation
- `pages/popup/src/utils/cardano_loader.ts` - WASM library loading
- `pages/popup/src/utils/walletOperations.ts` - Orchestrates crypto + API calls
- Wallet creation/import UI components that call walletOperations

**In Content Script Context (Problematic):**
- `pages/content/src/cbor-converter.ts` - UTXO to CBOR conversion for CIP-30

### Proposed Architecture

**Offscreen Crypto Service** (`chrome-extension/src/offscreen/cryptoService.ts`):
- Centralized crypto operations with WASM library
- Methods for: mnemonic generation, key derivation, address creation, CBOR conversion
- Stateless operations - no sensitive data storage
- Built by Vite with WASM plugin for proper bundling

**Background Crypto Client** (`chrome-extension/src/background/offscreenCrypto.ts`):
- Manages offscreen document lifecycle
- Provides clean async methods to background service worker
- Handles message passing to/from offscreen document
- Type-safe interfaces for all crypto operations

**Updated Wallet Service**:
- Business logic remains in wallet service
- Calls background crypto client instead of importing WASM
- No crypto imports - pure business logic and API orchestration
- Can focus on wallet state management and data transformation

### Migration Benefits
1. **Clean Separation**: Crypto operations isolated from business logic and UI
2. **Centralized WASM**: Single source of truth for all cryptographic operations
3. **Reusable Crypto**: Any extension context can request crypto operations via background
4. **Security Improvement**: Reduces sensitive data passing through message system
5. **Better Testing**: Crypto service can be unit tested, business logic can be tested without WASM
6. **Performance**: WASM operations in dedicated context with proper optimization

### Implementation Steps
1. **Expand offscreen crypto service** with all operations from `crypto.ts`
2. **Create background crypto client** wrapper for offscreen communication
3. **Update wallet service** to use crypto client instead of direct crypto imports
4. **Refactor UI components** to call wallet service instead of walletOperations
5. **Move CBOR conversion** from content script to offscreen (accessed via background)
6. **Remove popup crypto dependencies** and clean up imports
7. **Update CIP-30 handlers** to use offscreen for CBOR operations
8. **Testing and validation** of all crypto operations

### New Message Flow
```
UI Action → Background → Crypto Client → Offscreen (WASM) → Results → Business Logic → UI
dApp CIP-30 → Background → Crypto Client → Offscreen (CBOR) → Results → dApp
```

This creates clean architectural boundaries where:
- **UI**: Pure presentation and user interaction
- **Background**: Orchestration and message routing
- **Wallet Service**: Business logic and API coordination
- **Offscreen**: Cryptographic operations only

## Task 3: Consolidate Storage Layer

### Current Problems
- **Fragmented storage**: Two separate IndexedDBs (`cardano-wallet-db` for wallets, `cardano-wallet-dev` for transactions/UTXOs)
- **Unused code**: ConsolidatedStorage exists but never used
- **Poor naming**: Database names don't reflect the project (cardano-wallet-dev?)
- **Mixed storage types**: Settings in Chrome Storage, everything else in IndexedDB
- **Assets in wrong place**: Assets array stored inside wallet object instead of separate store

### Current Structure
```
IndexedDB: cardano-wallet-db
└── wallets store
    └── wallet objects (with embedded assets array)

IndexedDB: cardano-wallet-dev
├── transactions (with walletId field)
└── utxos (with walletId field)

Chrome Storage:
├── settingsStorage (API keys, theme, activeWalletId)
└── onboardingStorage (temporary flow state)
```

### Proposed Structure

**IndexedDB: `devx-data`**
```
├── wallets       # Core wallet metadata
├── transactions  # All transactions (with walletId)
├── utxos        # All UTXOs (with walletId)
├── assets       # Asset metadata (with walletId)
└── settings     # API keys, theme preferences
```

**Chrome Storage: `devx-state`**
```
└── appState     # Merged onboarding + UI state
    ├── activeWalletId
    ├── onboardingStep
    ├── temporaryFormData
    └── other UI state
```

### Object Store Schemas

**wallets**
- Remove embedded assets array
- Keep: id, name, address, stakeAddress, network, balance, type, hasPassword, seedPhrase, rootKey
- Add: lastSynced timestamp

**assets** (NEW)
- Move from wallet.assets to separate store
- Add walletId field for relationship
- Index by walletId for efficient queries

**transactions**
- Keep current structure with walletId
- Already has proper indexes

**utxos**
- Keep current structure with walletId
- Already tracks spent/unspent status

**settings**
- Move from Chrome Storage to IndexedDB
- Store API keys, theme, other preferences
- Single record with key 'app-settings'

### Benefits
1. **Single source of truth**: One IndexedDB for all persistent data
2. **Better performance**: Proper indexing without loading entire wallet objects
3. **Clear naming**: `devx-data` and `devx-state` clearly indicate purpose
4. **Efficient asset queries**: Can query/update assets without touching wallet
5. **Cleaner separation**: Persistent data in IndexedDB, temporary state in Chrome Storage

### Migration Steps
1. Create new `devx-data` IndexedDB with all object stores
2. Create `devx-state` Chrome Storage (merge onboarding + settings state logic)
3. Migrate data from old databases to new structure
4. Update all storage imports throughout codebase
5. Remove old storage implementations and ConsolidatedStorage
6. Add migration logic for existing users