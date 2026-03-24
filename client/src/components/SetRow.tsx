import { useState } from 'react';

interface SetRowProps {
  set: any;
  onUpdate: (id: string, updates: object) => void;
  onDelete: (id: string) => void;
}

export default function SetRow({ set, onUpdate, onDelete }: SetRowProps) {
  const [weight, setWeight] = useState(set.weight ?? '');
  const [reps, setReps] = useState(set.reps ?? '');
  const [rest, setRest] = useState(set.rest_time_seconds ?? '');
  const [rpe, setRpe] = useState(set.rpe ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onUpdate(set.id, {
      weight: weight !== '' ? Number(weight) : null,
      reps: reps !== '' ? Number(reps) : null,
      rest_time_seconds: rest !== '' ? Number(rest) : null,
      rpe: rpe !== '' ? Number(rpe) : null,
      notes: set.notes,
      metadata: JSON.parse(set.metadata || '{}'),
    });
    setSaving(false);
  }

  const inputStyle = {
    padding: '5px 8px',
    fontSize: 13,
    width: '100%',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 80px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
      <span style={{ color: '#666', fontSize: 13 }}>{set.set_number}</span>
      <input
        type="number"
        value={weight}
        onChange={e => setWeight(e.target.value)}
        onBlur={save}
        placeholder="kg"
        style={inputStyle}
        min={0}
        step={0.5}
      />
      <input
        type="number"
        value={reps}
        onChange={e => setReps(e.target.value)}
        onBlur={save}
        placeholder="reps"
        style={inputStyle}
        min={0}
      />
      <input
        type="number"
        value={rest}
        onChange={e => setRest(e.target.value)}
        onBlur={save}
        placeholder="sec"
        style={inputStyle}
        min={0}
      />
      <input
        type="number"
        value={rpe}
        onChange={e => setRpe(e.target.value)}
        onBlur={save}
        placeholder="1-10"
        style={inputStyle}
        min={1}
        max={10}
        step={0.5}
      />
      <div style={{ display: 'flex', gap: 4 }}>
        <button
          className="btn-ghost"
          style={{ fontSize: 11, padding: '4px 8px' }}
          onClick={save}
          disabled={saving}
        >
          {saving ? '...' : 'Save'}
        </button>
        <button
          className="btn-ghost"
          style={{ fontSize: 11, padding: '4px 8px', color: '#ef4444' }}
          onClick={() => onDelete(set.id)}
        >
          &#x2715;
        </button>
      </div>
    </div>
  );
}
