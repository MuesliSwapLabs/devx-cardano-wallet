import { useEffect } from 'react';
import { Button } from '@extension/ui';
import { useStorage, settingsStorage } from '@extension/storage';

export default function App() {
  const settings = useStorage(settingsStorage);

  useEffect(() => {
    console.log('content ui loaded');
  }, []);

  return (
    <div className="flex items-center justify-between gap-2 rounded bg-blue-100 px-2 py-1">
      <div className="flex gap-1 text-blue-500">
        Edit <strong className="text-blue-700">pages/content-ui/src/app.tsx</strong> and save to reload.
      </div>
      <Button theme={settings?.theme} onClick={settingsStorage.toggleTheme}>
        Toggle Theme
      </Button>
    </div>
  );
}
