export type SoundName = 'click' | 'buy' | 'claim' | 'miss' | 'drain';

export interface Sound {
  readonly enabled: boolean;
  play(name: SoundName): void;
  setEnabled(value: boolean): void;
}

const SOUND_KEY = 'peat-bog:sound';

const NOTES: Record<SoundName, { frequency: number; duration: number; type: OscillatorType }> = {
  click: { frequency: 220, duration: 0.06, type: 'sine' },
  buy: { frequency: 330, duration: 0.09, type: 'triangle' },
  claim: { frequency: 520, duration: 0.12, type: 'sine' },
  miss: { frequency: 110, duration: 0.1, type: 'sawtooth' },
  drain: { frequency: 82, duration: 0.12, type: 'triangle' },
};

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(value: boolean): void {
  try {
    window.localStorage.setItem(SOUND_KEY, value ? '1' : '0');
  } catch {
    // Sound preference remains session-local when storage is unavailable.
  }
}

export function createSound(): Sound {
  let enabled = readEnabled();
  let context: AudioContext | null = null;

  const getContext = (): AudioContext | null => {
    if (context) return context;
    const windowWithAudio = window as Window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextCtor = window.AudioContext ?? windowWithAudio.webkitAudioContext;
    if (!AudioContextCtor) return null;
    try {
      context = new AudioContextCtor();
      return context;
    } catch {
      return null;
    }
  };

  return {
    get enabled(): boolean {
      return enabled;
    },
    play(name): void {
      if (!enabled) return;
      const audio = getContext();
      if (!audio) return;
      const note = NOTES[name];
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = note.type;
      oscillator.frequency.setValueAtTime(note.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + note.duration);
    },
    setEnabled(value): void {
      enabled = value;
      writeEnabled(value);
    },
  };
}
