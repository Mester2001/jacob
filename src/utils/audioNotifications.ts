/**
 * Audio Notifications Utility for Mining Procurement ERP
 * Generates pleasant, crystal-clear Web Audio tones without external assets.
 */

// Cached AudioContext singleton to reuse and resume cleanly
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!globalAudioCtx || globalAudioCtx.state === 'closed') {
      globalAudioCtx = new AudioCtx();
    }
    // Resume context if suspended by browser autoplay policy
    if (globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {
        // Will resume on next user interaction
      });
    }
    return globalAudioCtx;
  } catch (e) {
    console.warn('Web Audio API not supported or accessible', e);
    return null;
  }
}

/**
 * 1. New Order Arrival Chime
 * Ascending pleasant 3-tone arpeggio (C5 -> E5 -> G5)
 * Signifies an exciting new order created or arriving from the field.
 */
export function playNewOrderSound(volume = 0.7): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const clampedVol = Math.max(0.05, Math.min(1.0, volume));
    masterGain.gain.setValueAtTime(clampedVol * 0.35, now);
    masterGain.connect(ctx.destination);

    // Notes: C5 (523.25 Hz), E5 (659.25 Hz), G5 (783.99 Hz)
    const notes = [
      { freq: 523.25, time: now, duration: 0.16, type: 'sine' as OscillatorType },
      { freq: 659.25, time: now + 0.12, duration: 0.18, type: 'sine' as OscillatorType },
      { freq: 783.99, time: now + 0.24, duration: 0.45, type: 'triangle' as OscillatorType },
    ];

    notes.forEach((note) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = note.type;
      osc.frequency.setValueAtTime(note.freq, note.time);

      gain.gain.setValueAtTime(0.01, note.time);
      gain.gain.exponentialRampToValueAtTime(0.3, note.time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, note.time + note.duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(note.time);
      osc.stop(note.time + note.duration + 0.05);
    });
  } catch (err) {
    console.warn('Could not play new order sound:', err);
  }
}

/**
 * 2. Order Status Change Chime
 * Crisp 2-tone melodic transition (D5 -> A5)
 * Signifies formal approval, progression, or state update.
 */
export function playStatusChangeSound(volume = 0.7): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    const clampedVol = Math.max(0.05, Math.min(1.0, volume));
    masterGain.gain.setValueAtTime(clampedVol * 0.35, now);
    masterGain.connect(ctx.destination);

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.01, now);
    gain1.gain.exponentialRampToValueAtTime(0.25, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Note 2: A5 (880 Hz) - Bright bell ping
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.11);
    gain2.gain.setValueAtTime(0.01, now + 0.11);
    gain2.gain.exponentialRampToValueAtTime(0.32, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.11);
    osc2.stop(now + 0.6);
  } catch (err) {
    console.warn('Could not play status change sound:', err);
  }
}

/**
 * 3. Quick test sound for settings preview
 */
export function playTestAudio(type: 'new_order' | 'status_change', volume = 0.7): void {
  if (type === 'new_order') {
    playNewOrderSound(volume);
  } else {
    playStatusChangeSound(volume);
  }
}
