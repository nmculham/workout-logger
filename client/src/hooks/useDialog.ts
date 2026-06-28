import { useState } from 'react';
import type { DialogConfig } from '../components/Dialog';

export function useDialog() {
  const [config, setConfig] = useState<DialogConfig | null>(null);

  function confirm(message: string): Promise<boolean> {
    return new Promise(resolve => {
      setConfig({
        type: 'confirm',
        message,
        onConfirm: () => { setConfig(null); resolve(true); },
        onCancel: () => { setConfig(null); resolve(false); },
      });
    });
  }

  function prompt(message: string, defaultValue = ''): Promise<string | null> {
    return new Promise(resolve => {
      setConfig({
        type: 'prompt',
        message,
        defaultValue,
        onConfirm: (value) => { setConfig(null); resolve(value); },
        onCancel: () => { setConfig(null); resolve(null); },
      });
    });
  }

  return { dialogConfig: config, confirm, prompt };
}
