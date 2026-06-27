export type TempoPhase = 'eccentric' | 'pauseBottom' | 'concentric' | 'pauseTop';

const PHASE_FREQ: Record<TempoPhase, number> = {
  eccentric: 200,
  pauseBottom: 160,
  concentric: 440,
  pauseTop: 330,
};

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

export function playTone(phase: TempoPhase): void {
  const audioCtx = getCtx();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.frequency.value = PHASE_FREQ[phase];
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.15);
}
