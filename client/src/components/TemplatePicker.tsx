import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  userId: string;
  onSelect: (templateId: string, templateName: string) => void;
  onClose: () => void;
}

export default function TemplatePicker({ userId, onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTemplates(userId)
      .then(t => setTemplates(t))
      .catch(err => setError(err?.message ?? 'Failed to load templates'))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100
    }}>
      <div style={{
        background: '#1a1a1a', borderRadius: '16px 16px 0 0', padding: 20,
        width: '100%', maxWidth: 600, maxHeight: '70vh', display: 'flex', flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>Load from Template</h2>
          <button className="btn-ghost" onClick={onClose}>&#x2715;</button>
        </div>
        {loading ? (
          <p style={{ color: '#666' }}>Loading...</p>
        ) : error ? (
          <p style={{ color: '#ef4444', textAlign: 'center', marginTop: 32 }}>{error}</p>
        ) : templates.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', marginTop: 32 }}>No templates saved yet.</p>
        ) : (
          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelect(t.id, t.name)}
                style={{
                  background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
                  padding: '12px 14px', textAlign: 'left', color: '#f0f0f0',
                }}
              >
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                {t.exercise_count > 0 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 3 }}>
                    {t.exercise_names}
                  </div>
                )}
                {t.notes && <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{t.notes}</div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
