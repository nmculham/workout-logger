import { useUnits } from '../contexts/UnitsContext';

export default function Settings() {
  const { unit, setUnit } = useUnits();

  return (
    <div className="page">
      <h1 style={{ marginBottom: 24 }}>Settings</h1>

      <div className="card">
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Weight unit</div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
          Changes the unit label on weight inputs. Stored values are not converted.
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={unit === 'metric' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setUnit('metric')}
          >
            Metric (kg)
          </button>
          <button
            className={unit === 'imperial' ? 'btn-primary' : 'btn-ghost'}
            onClick={() => setUnit('imperial')}
          >
            Imperial (lbs)
          </button>
        </div>
      </div>
    </div>
  );
}
