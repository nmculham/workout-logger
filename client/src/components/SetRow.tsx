import { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { useUnits } from '../contexts/UnitsContext';

interface SetRowProps {
  set: any;
  onUpdate: (id: string, updates: object) => void;
  onDelete: (id: string) => void;
}

export interface SetRowHandle {
  flush: () => Promise<void>;
}

const SetRow = forwardRef<SetRowHandle, SetRowProps>(function SetRow({ set, onUpdate, onDelete }, ref) {
  const { weightLabel } = useUnits();
  const [weight, setWeight] = useState(set.weight ?? '');
  const [reps, setReps] = useState(set.reps ?? '');
  const [rest, setRest] = useState(set.rest_time_seconds ?? '');
  const [rpe, setRpe] = useState(set.rpe ?? '');
  const [notes, setNotes] = useState(set.notes ?? '');
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  async function save() {
    if (!dirty.current) return;
    dirty.current = false;
    setSaving(true);
    await onUpdate(set.id, {
      weight: weight !== '' ? Number(weight) : null,
      reps: reps !== '' ? Number(reps) : null,
      rest_time_seconds: rest !== '' ? Number(rest) : null,
      rpe: rpe !== '' ? Number(rpe) : null,
      notes: notes !== '' ? notes : null,
    });
    setSaving(false);
  }

  useImperativeHandle(ref, () => ({ flush: save }));

  const inputStyle = {
    padding: '5px 8px',
    fontSize: 13,
    width: '100%',
  };

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 1fr 1fr 80px', gap: 8, alignItems: 'center' }}>
        <span style={{ color: '#666', fontSize: 13 }}>{set.set_number}</span>
        <input
          type="number"
          value={weight}
          onChange={e => { dirty.current = true; setWeight(e.target.value); }}
          onBlur={save}
          placeholder={weightLabel}
          style={inputStyle}
          min={0}
          step={0.5}
        />
        <input
          type="number"
          value={reps}
          onChange={e => { dirty.current = true; setReps(e.target.value); }}
          onBlur={save}
          placeholder="reps"
          style={inputStyle}
          min={0}
        />
        <input
          type="number"
          value={rest}
          onChange={e => { dirty.current = true; setRest(e.target.value); }}
          onBlur={save}
          placeholder="sec"
          style={inputStyle}
          min={0}
        />
        <input
          type="number"
          value={rpe}
          onChange={e => { dirty.current = true; setRpe(e.target.value); }}
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
      <div style={{ paddingLeft: 40, marginTop: 4 }}>
        <input
          type="text"
          value={notes}
          onChange={e => { dirty.current = true; setNotes(e.target.value); }}
          onBlur={save}
          placeholder="Notes..."
          style={{ ...inputStyle, width: '100%', fontSize: 12, color: '#a0a0a0' }}
        />
      </div>
    </div>
  );
});

export default SetRow;
