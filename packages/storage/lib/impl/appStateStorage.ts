import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

/** Our overall "app" data shape.
 *  We always have `onboarded` (boolean),
 *  plus whatever extra keys you want at runtime. */
export interface AppState {
  onboarded: boolean;
  [key: string]: any;
}

/** Create one storage object with default { onboarded: false }. */
const storage = createStorage<AppState>(
  'app-state-key',
  { onboarded: false },
  {
    storageEnum: StorageEnum.Local,
    liveUpdate: true,
  },
);

/** Extend BaseStorage with some convenience methods. */
export interface AppStateStorage extends BaseStorage<AppState> {
  markOnboarded: () => Promise<void>;
  unmarkOnboarded: () => Promise<void>;
  setItem: (key: string, value: any) => Promise<void>;
  getItem: (key: string) => any;
}

/** Our exported store that can read/write any key–value pair + onboarded flag. */
export const appStateStorage: AppStateStorage = {
  ...storage,

  /** Just set `onboarded = true`. */
  markOnboarded: async () => {
    await storage.set(prev => ({
      ...prev,
      onboarded: true,
    }));
  },
  unmarkOnboarded: async () => {
    await storage.set(prev => ({
      ...prev,
      onboarded: false,
    }));
  },

  /** Generic "setItem" helper. */
  setItem: async (key, value) => {
    await storage.set(prev => ({
      ...prev,
      [key]: value,
    }));
  },

  /** Generic "getItem" helper (quick snapshot read). */
  getItem: key => {
    const snapshot = storage.getSnapshot() || { onboarded: false };
    return snapshot[key];
  },
};
