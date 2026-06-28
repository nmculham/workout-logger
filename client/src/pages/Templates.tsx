import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { api } from '../lib/api';
import Dialog from '../components/Dialog';
import { useDialog } from '../hooks/useDialog';

interface Props { user: User; }

export default function Templates({ user }: Props) {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { dialogConfig, confirm } = useDialog();

  async function load() {
    try {
      const data = await api.getTemplates(user.id);
      setTemplates(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [user.id]);

  async function handleDelete(id: string, name: string) {
    if (!await confirm(`Delete template "${name}"?`)) return;
    await api.deleteTemplate(id);
    await load();
  }

  async function handleApply(templateId: string, templateName: string) {
    const date = new Date().toISOString().slice(0, 10);
    const { id } = await api.applyTemplate(templateId, { user_id: user.id, name: templateName, date });
    navigate(`/workout/${id}`);
  }

  if (loading) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <h1 style={{ marginBottom: 24 }}>Templates</h1>

      {templates.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: '#666' }}>
          <p style={{ margin: '0 0 8px' }}>No templates saved yet.</p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Open a workout and tap "Save as Template" to create one.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => (
            <div key={t.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                {t.exercise_count > 0 && (
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.exercise_names}</div>
                )}
                {t.notes && (
                  <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{t.notes}</div>
                )}
              </div>
              <button
                className="btn-primary"
                style={{ fontSize: 12, padding: '6px 12px', whiteSpace: 'nowrap' }}
                onClick={() => handleApply(t.id, t.name)}
              >
                Start
              </button>
              <button
                className="btn-ghost"
                style={{ fontSize: 12, padding: '6px 10px', color: '#ef4444', borderColor: '#333' }}
                onClick={() => handleDelete(t.id, t.name)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
      {dialogConfig && <Dialog config={dialogConfig} />}
    </div>
  );
}
