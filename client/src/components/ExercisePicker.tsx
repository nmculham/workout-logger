import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Props {
  userId: string;
  onSelect: (exerciseId: string) => void;
  onClose: () => void;
}

export default function ExercisePicker({ userId, onSelect, onClose }: Props) {
  const [exercises, setExercises] = useState<any[]>([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    api.getExercises(userId).then(setExercises);
  }, [userId]);

  const filtered = exercises.filter(e =>
    e.name.toLowerCase().includes(filter.toLowerCase())
  );

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
          <h2 style={{ margin: 0, flex: 1, fontSize: 18 }}>Add Exercise</h2>
          <button className="btn-ghost" onClick={onClose}>&#x2715;</button>
        </div>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search..."
          autoFocus
          style={{ marginBottom: 12 }}
        />
        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(e => (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              style={{
                background: '#111', border: '1px solid #2a2a2a', borderRadius: 8,
                padding: '10px 14px', textAlign: 'left', color: '#f0f0f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}
            >
              <span>{e.name}</span>
              <span style={{ fontSize: 12, color: '#555' }}>{e.muscle_group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
