import { useState, useEffect, useRef } from 'react';

export interface DialogConfig {
  type: 'confirm' | 'prompt';
  message: string;
  defaultValue?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export default function Dialog({ config }: { config: DialogConfig }) {
  const [value, setValue] = useState(config.defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config.type === 'prompt') inputRef.current?.focus();
  }, [config.type]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') config.onConfirm(value);
    if (e.key === 'Escape') config.onCancel();
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) config.onCancel(); }}
    >
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: 24 }}>
        <p style={{ margin: '0 0 16px', fontSize: 15, lineHeight: 1.5 }}>{config.message}</p>
        {config.type === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={config.onCancel}>Cancel</button>
          <button
            className={config.type === 'confirm' ? 'btn-danger' : 'btn-primary'}
            onClick={() => config.onConfirm(value)}
          >
            {config.type === 'confirm' ? 'Delete' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
