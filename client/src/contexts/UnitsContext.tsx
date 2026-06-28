import { createContext, useContext, useState } from 'react';

export type UnitSystem = 'metric' | 'imperial';

interface UnitsContextValue {
  unit: UnitSystem;
  setUnit: (u: UnitSystem) => void;
  weightLabel: string;
}

const UnitsContext = createContext<UnitsContextValue>({
  unit: 'metric',
  setUnit: () => {},
  weightLabel: 'kg',
});

export function UnitsProvider({ children }: { children: React.ReactNode }) {
  const [unit, setUnitState] = useState<UnitSystem>(
    () => (localStorage.getItem('unitSystem') as UnitSystem) ?? 'metric'
  );

  function setUnit(u: UnitSystem) {
    localStorage.setItem('unitSystem', u);
    setUnitState(u);
  }

  return (
    <UnitsContext.Provider value={{ unit, setUnit, weightLabel: unit === 'metric' ? 'kg' : 'lbs' }}>
      {children}
    </UnitsContext.Provider>
  );
}

export function useUnits() {
  return useContext(UnitsContext);
}
