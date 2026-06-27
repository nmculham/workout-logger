import { useState, useRef, useCallback } from 'react';
import { playTone } from '../lib/audio';
import type { TempoPhase } from '../lib/audio';

export interface Tempo {
  eccentric: number;
  pauseBottom: number;
  concentric: number;
  pauseTop: number;
}

export interface TimerState {
  phase: TempoPhase;
  secondsLeft: number;
  isRunning: boolean;
  rep: number;
}

export const PHASE_LABELS: Record<TempoPhase, string> = {
  eccentric: 'Eccentric',
  pauseBottom: 'Pause',
  concentric: 'Concentric',
  pauseTop: 'Pause',
};

const PHASE_ORDER: TempoPhase[] = ['eccentric', 'pauseBottom', 'concentric', 'pauseTop'];

export function useTempoTimer() {
  const [state, setState] = useState<TimerState | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef<TimerState | null>(null);
  const tempoRef = useRef<Tempo | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setState(null);
    stateRef.current = null;
  }, []);

  const start = useCallback((tempo: Tempo) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    tempoRef.current = tempo;

    const initial: TimerState = {
      phase: 'eccentric',
      secondsLeft: tempo.eccentric,
      isRunning: true,
      rep: 1,
    };
    playTone('eccentric');
    setState(initial);
    stateRef.current = initial;

    intervalRef.current = setInterval(() => {
      const current = stateRef.current;
      const t = tempoRef.current;
      if (!current || !t) return;

      if (current.secondsLeft > 1) {
        const next = { ...current, secondsLeft: current.secondsLeft - 1 };
        setState(next);
        stateRef.current = next;
      } else {
        const currentIdx = PHASE_ORDER.indexOf(current.phase);
        const nextIdx = (currentIdx + 1) % PHASE_ORDER.length;
        const nextPhase = PHASE_ORDER[nextIdx];
        const durations: Record<TempoPhase, number> = {
          eccentric: t.eccentric,
          pauseBottom: t.pauseBottom,
          concentric: t.concentric,
          pauseTop: t.pauseTop,
        };
        const nextRep = nextIdx === 0 ? current.rep + 1 : current.rep;
        playTone(nextPhase);
        const next: TimerState = {
          phase: nextPhase,
          secondsLeft: durations[nextPhase],
          isRunning: true,
          rep: nextRep,
        };
        setState(next);
        stateRef.current = next;
      }
    }, 1000);
  }, []);

  return { state, start, stop };
}
